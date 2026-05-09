/**
 * Integration Test: PATCH /api/orders/:id/status
 *
 * Strategy:
 *  - Mock all external I/O (MongoDB, Redis, BullMQ) at module level so tests
 *    run fully in-memory with zero network calls.
 *  - Mock the User and Order model modules directly — this is the only reliable
 *    way to intercept ES Module imports inside middleware/controllers.
 *  - Sign real JWTs and control User.findById output per-test via a shared
 *    mutable object that both the mock factory and the test can reference.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ─── Shared state mutated by each test to control what findById returns ──────────
const userFindByIdResult = { value: null };
const orderFindByIdResult = { value: null };
const redisPublishMock = jest.fn().mockResolvedValue(1);

// ─── 1. Mock external modules BEFORE any dynamic imports ────────────────────────

// IORedis
jest.unstable_mockModule('ioredis', () => ({
    default: jest.fn().mockImplementation(() => ({
        publish: redisPublishMock,
        subscribe: jest.fn(),
        on: jest.fn(),
        duplicate: jest.fn().mockReturnThis(),
        ping: jest.fn().mockResolvedValue('PONG'),
    })),
}));

// @upstash/redis — mock the whole module so Redis constructor is a no-op
jest.unstable_mockModule('@upstash/redis', () => ({
    Redis: jest.fn().mockImplementation(() => ({
        ping: jest.fn().mockResolvedValue('PONG'),
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        publish: jest.fn().mockResolvedValue(1),
    })),
}));

// Mock config/redis.js directly — this is the module the controller actually imports.
// By mocking it at this level we control the exact redis instance used in production code.
jest.unstable_mockModule('../config/redis.js', () => ({
    default: {
        publish: redisPublishMock,
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        ping: jest.fn().mockResolvedValue('PONG'),
    },
}));

// BullMQ
jest.unstable_mockModule('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    })),
    Worker: jest.fn(),
}));

// ─── 2. Mock User model — authMiddleware imports THIS module ─────────────────────
jest.unstable_mockModule('../models/User.js', () => ({
    User: {
        findById: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockImplementation(() =>
                Promise.resolve(userFindByIdResult.value)
            ),
        })),
    },
}));

// ─── 3. Mock Order model — orderController imports THIS module ───────────────────
jest.unstable_mockModule('../models/Order.js', () => ({
    Order: {
        findById: jest.fn().mockImplementation(() =>
            Promise.resolve(orderFindByIdResult.value)
        ),
    },
}));

// ─── 4. Mock Table model (imported by orderController) ──────────────────────────
jest.unstable_mockModule('../models/Table.js', () => ({
    Table: {
        findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    },
}));

// ─── 5. Set env vars before importing anything ──────────────────────────────────
const JWT_SECRET = 'test-secret-for-rbac';
process.env.JWT_SECRET = JWT_SECRET;
process.env.UPSTASH_REDIS_URL = 'redis://localhost:6379';

// ─── 6. Dynamic imports (AFTER all mocks are registered) ────────────────────────
const { default: orderRoutes } = await import('../api/routes/orderRoutes.js');
const { User } = await import('../models/User.js');
const { Order } = await import('../models/Order.js');

// ─── 7. Build minimal Express app ────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use('/api/orders', orderRoutes);

// ─── 8. Helper ───────────────────────────────────────────────────────────────────
const generateToken = (id) => jwt.sign({ id }, JWT_SECRET);

// ─── 9. Tests ─────────────────────────────────────────────────────────────────────
describe('PATCH /api/orders/:id/status — RBAC Integration', () => {
    const MOCK_ORDER_ID = '507f1f77bcf86cd799439011';

    beforeEach(() => {
        // Reset mock call counts between tests
        jest.clearAllMocks();
        userFindByIdResult.value = null;
        orderFindByIdResult.value = null;

        // Re-wire the mock implementations after clearAllMocks
        User.findById.mockImplementation(() => ({
            select: jest.fn().mockImplementation(() =>
                Promise.resolve(userFindByIdResult.value)
            ),
        }));

        Order.findById.mockImplementation(() =>
            Promise.resolve(orderFindByIdResult.value)
        );
    });

    // ─── Scenario A: No token (401) ──────────────────────────────────────────────
    it('❌ should return 401 when no token is provided', async () => {
        const res = await request(app)
            .patch(`/api/orders/${MOCK_ORDER_ID}/status`)
            .send({ status: 'PREPARING' });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Not authorized, no token');
    });

    // ─── Scenario B: Wrong role — WAITER (403) ───────────────────────────────────
    it('❌ should return 403 when a WAITER tries to update order status', async () => {
        userFindByIdResult.value = { _id: 'waiter-id', role: 'WAITER' };
        const token = generateToken('waiter-id');

        const res = await request(app)
            .patch(`/api/orders/${MOCK_ORDER_ID}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'PREPARING' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe(
            'Forbidden: You do not have permission to perform this action'
        );
    });

    // ─── Scenario C: Allowed role — CHEF, order not found (404) ─────────────────
    it('✅ should pass auth for a CHEF — controller reached (404 order not found)', async () => {
        userFindByIdResult.value = { _id: 'chef-id', role: 'CHEF' };
        orderFindByIdResult.value = null; // order missing in DB

        const token = generateToken('chef-id');

        const res = await request(app)
            .patch(`/api/orders/${MOCK_ORDER_ID}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'PREPARING' });

        // 404 proves auth passed and the controller logic executed
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Order not found');
    });

    // ─── Scenario D: Allowed role — OWNER, full success (200) ───────────────────
    it('✅ should update order status for an OWNER and return 200', async () => {
        userFindByIdResult.value = { _id: 'owner-id', role: 'OWNER' };

        const mockOrder = {
            _id: MOCK_ORDER_ID,
            tableId: 'table-1',
            status: 'PENDING',
            save: jest.fn().mockImplementation(function () {
                return Promise.resolve(this);
            }),
        };
        orderFindByIdResult.value = mockOrder;

        const token = generateToken('owner-id');

        const res = await request(app)
            .patch(`/api/orders/${MOCK_ORDER_ID}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'PREPARING' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('PREPARING');
        expect(mockOrder.save).toHaveBeenCalledTimes(1);
        expect(redisPublishMock).toHaveBeenCalledWith(
            'order-updates',
            expect.stringContaining('"status":"PREPARING"')
        );
    });

    // ─── Scenario E: Allowed role — MANAGER, invalid status (400) ───────────────
    it('❌ should return 400 for an invalid status value', async () => {
        userFindByIdResult.value = { _id: 'manager-id', role: 'MANAGER' };

        const token = generateToken('manager-id');

        const res = await request(app)
            .patch(`/api/orders/${MOCK_ORDER_ID}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'COOKING' }); // Not in the enum

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Invalid status value');
    });

    // ─── Scenario F: No role — token valid but user missing in DB (401) ──────────
    it('❌ should return 401 when token is valid but user does not exist in DB', async () => {
        userFindByIdResult.value = null; // User.findById returns nothing
        const token = generateToken('ghost-id');

        const res = await request(app)
            .patch(`/api/orders/${MOCK_ORDER_ID}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'READY' });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Not authorized, user not found');
    });
});

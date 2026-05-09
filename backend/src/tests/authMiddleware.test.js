import { describe, it, expect, beforeEach } from '@jest/globals';
import { authorizeRoles } from '../api/middlewares/authMiddleware.js';

describe('RBAC Middleware: authorizeRoles', () => {
    let req, res, next;

    beforeEach(() => {
        // Mock Express Request, Response, and Next objects
        req = { user: {} };
        res = {
            status: () => res,
            json: () => res,
        };
        next = { called: false };

        // Simple manual mock for status/json chaining
        res.status = (code) => {
            res._status = code;
            return res;
        };
        res.json = (body) => {
            res._body = body;
            return res;
        };
        next = { called: false, fn: function () { this.called = true; } };
        next.fn = next.fn.bind(next);
    });

    const authorizedRoles = ['OWNER', 'MANAGER', 'CHEF'];
    const middleware = authorizeRoles(...authorizedRoles);

    // ✅ Test Authorized Roles
    authorizedRoles.forEach((role) => {
        it(`should allow access for role: ${role}`, () => {
            req.user.role = role;

            middleware(req, res, next.fn);

            expect(next.called).toBe(true);         // next() was called → request passed
            expect(res._status).toBeUndefined();     // no status set → no error response
        });
    });

    // ❌ Test Unauthorized Roles
    const unauthorizedRoles = ['WAITER', 'CUSTOMER', 'GUEST'];

    unauthorizedRoles.forEach((role) => {
        it(`should deny access for role: ${role}`, () => {
            req.user.role = role;

            middleware(req, res, next.fn);

            expect(next.called).toBe(false);        // next() was NOT called → blocked
            expect(res._status).toBe(403);
            expect(res._body).toEqual({
                message: "Forbidden: You do not have permission to perform this action"
            });
        });
    });

    it('should deny access for undefined role', () => {
        req.user.role = undefined;

        middleware(req, res, next.fn);

        expect(next.called).toBe(false);
        expect(res._status).toBe(403);
    });
});

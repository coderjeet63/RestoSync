import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const userFindByIdResult = { value: null };
const uploadFileResult = { value: null };
const redisDelMock = jest.fn().mockResolvedValue(1);
const menuFindOneAndUpdateMock = jest.fn();

jest.unstable_mockModule('../config/redis.js', () => ({
    default: {
        del: redisDelMock,
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
    },
}));

jest.unstable_mockModule('../models/User.js', () => ({
    User: {
        findById: jest.fn().mockImplementation(() => ({
            select: jest.fn().mockImplementation(() => Promise.resolve(userFindByIdResult.value)),
        })),
    },
}));

jest.unstable_mockModule('../models/Menu.js', () => ({
    Menu: {
        findOneAndUpdate: menuFindOneAndUpdateMock,
        findOneAndDelete: jest.fn(),
        find: jest.fn(),
    },
}));

jest.unstable_mockModule('../api/middlewares/uploadMiddleware.js', () => ({
    upload: {
        single: jest.fn().mockImplementation(() => (req, res, next) => {
            req.file = uploadFileResult.value;
            next();
        }),
    },
}));

const JWT_SECRET = 'test-secret-for-menu-routes';
process.env.JWT_SECRET = JWT_SECRET;

const { default: menuRoutes } = await import('../api/routes/menuRoutes.js');
const { User } = await import('../models/User.js');

const app = express();
app.use(express.json());
app.use('/api/menus', menuRoutes);

const generateToken = (id) => jwt.sign({ id }, JWT_SECRET);

describe('PATCH /api/menus/:id image upload flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        userFindByIdResult.value = {
            _id: 'owner-id',
            role: 'OWNER',
            restaurantId: 'restaurant-123',
        };
        uploadFileResult.value = null;

        User.findById.mockImplementation(() => ({
            select: jest.fn().mockImplementation(() => Promise.resolve(userFindByIdResult.value)),
        }));
    });

    afterEach(() => {
        uploadFileResult.value = null;
    });

    it('stores the uploaded Cloudinary image URL and invalidates private and public menu caches', async () => {
        const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v123/paneer-tikka.jpg';
        uploadFileResult.value = { path: cloudinaryUrl };

        menuFindOneAndUpdateMock.mockResolvedValue({
            _id: 'menu-1',
            name: 'Paneer Tikka',
            restaurantId: 'restaurant-123',
            price: 14.5,
            isAvailable: false,
            availableQuantity: 7,
            imageUrl: cloudinaryUrl,
        });

        const response = await request(app)
            .patch('/api/menus/menu-1')
            .set('Authorization', `Bearer ${generateToken('owner-id')}`)
            .send({
                price: '14.5',
                isAvailable: 'false',
                availableQuantity: '7',
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.imageUrl).toBe(cloudinaryUrl);
        expect(menuFindOneAndUpdateMock).toHaveBeenCalledWith(
            { _id: 'menu-1', restaurantId: 'restaurant-123' },
            {
                $set: {
                    price: 14.5,
                    isAvailable: false,
                    availableQuantity: 7,
                    imageUrl: cloudinaryUrl,
                },
            },
            { new: true, runValidators: true }
        );
        expect(redisDelMock).toHaveBeenCalledWith('menu:restaurant-123');
        expect(redisDelMock).toHaveBeenCalledWith('public_menu:restaurant-123');
    });

    it('rejects empty update requests when no fields and no image are provided', async () => {
        const response = await request(app)
            .patch('/api/menus/menu-1')
            .set('Authorization', `Bearer ${generateToken('owner-id')}`)
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Please provide at least one field or image to update.');
        expect(menuFindOneAndUpdateMock).not.toHaveBeenCalled();
        expect(redisDelMock).not.toHaveBeenCalled();
    });
});

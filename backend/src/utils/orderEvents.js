import redis from '../config/redis.js';

export const ORDER_UPDATED_EVENT = 'order_updated';
export const ORDER_EVENTS_CHANNEL = 'order-events';

export const getRestaurantRoom = (restaurantId) => `restaurant:${String(restaurantId)}`;

const normalizeOrderForEvent = (order) => {
    if (!order) {
        return null;
    }

    const plainOrder = typeof order.toObject === 'function'
        ? order.toObject()
        : { ...order };

    if (plainOrder._id) {
        plainOrder._id = String(plainOrder._id);
    }

    if (plainOrder.restaurantId) {
        plainOrder.restaurantId = String(plainOrder.restaurantId);
    }

    return plainOrder;
};

export const buildOrderUpdatedPayload = (order) => {
    const normalizedOrder = normalizeOrderForEvent(order);

    if (!normalizedOrder?.restaurantId) {
        throw new Error('Cannot build order_updated payload without restaurantId');
    }

    return {
        restaurantId: normalizedOrder.restaurantId,
        order: normalizedOrder
    };
};

export const publishOrderUpdated = async (order) => {
    const payload = buildOrderUpdatedPayload(order);
    await redis.publish(ORDER_EVENTS_CHANNEL, JSON.stringify(payload));
    return payload;
};

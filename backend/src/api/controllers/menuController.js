import { Menu } from '../../models/Menu.js';
import redis from '../../config/redis.js';

/**
 * Fetch menu items for a specific restaurant with Cache-Aside pattern.
 * Uses Upstash Redis for high-speed delivery.
 */
export const getMenuByRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const cacheKey = `menu:${restaurantId}`;

        // 1. Attempt to fetch from Upstash Redis
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            console.log(`[Cache Hit] Serving menu for restaurant: ${restaurantId}`);
            return res.status(200).json({
                source: 'cache',
                data: cachedData
            });
        }

        // 2. Cache Miss - Query MongoDB
        console.log(`[Cache Miss] Fetching menu from Database for restaurant: ${restaurantId}`);
        const dbData = await Menu.find({ restaurantId }).sort({ category: 1 });

        if (!dbData || dbData.length === 0) {
            return res.status(404).json({ message: 'Menu not found for this restaurant' });
        }

        // 3. Store in Redis with 1 hour expiry (3600 seconds)
        // Upstash Redis client handles JSON stringify/parse automatically in some versions, 
        // but explicit stringify ensures compatibility across versions.
        await redis.set(cacheKey, JSON.stringify(dbData), { ex: 3600 });

        // 4. Return result
        return res.status(200).json({
            source: 'database',
            data: dbData
        });

    } catch (error) {
        console.error('Error in getMenuByRestaurant:', error);
        return res.status(500).json({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
};

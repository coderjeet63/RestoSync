import { Menu } from '../../models/Menu.js';
import redis from '../../config/redis.js';

/**
 * @desc    Fetch menu items publicly for a specific restaurant (Lightning Fast via Redis)
 * @route   GET /api/public/menu/:restaurantId
 * @access  Public
 */
export const getPublicMenu = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const cacheKey = `public_menu:${restaurantId}`;

        // 1. Attempt to fetch from Upstash Redis (Cache-Aside pattern)
        try {
            const cachedData = await redis.get(cacheKey);

            if (cachedData) {
                console.log(`[Cache Hit] Serving public menu for restaurant: ${restaurantId}`);
                return res.status(200).json({
                    success: true,
                    source: 'cache',
                    data: typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData
                });
            }
        } catch (redisError) {
            console.error(`Redis Get Error: ${redisError.message}`);
        }

        // 2. Cache Miss - Query MongoDB
        console.log(`[Cache Miss] Fetching public menu from Database for restaurant: ${restaurantId}`);
        const dbData = await Menu.find({ restaurantId }).sort({ category: 1 }).lean();

        if (!dbData || dbData.length === 0) {
            return res.status(404).json({ success: false, message: 'Menu not found for this restaurant' });
        }

        // 3. Store in Redis with 1 hour expiry
        try {
            await redis.set(cacheKey, JSON.stringify(dbData), { ex: 3600 });
        } catch (redisError) {
            console.error(`Redis Set Error: ${redisError.message}`);
        }

        // 4. Return result
        return res.status(200).json({
            success: true,
            source: 'database',
            data: dbData
        });

    } catch (error) {
        console.error('Public Menu Error:', error.message);
        return res.status(500).json({ 
            success: false,
            message: 'Internal Server Error'
        });
    }
};

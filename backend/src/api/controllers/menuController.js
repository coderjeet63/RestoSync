import { Menu } from '../../models/Menu.js';
import redis from '../../config/redis.js';

/**
 * @desc    Fetch menu items for a specific restaurant with Cache-Aside pattern.
 * @route   GET /api/menus/:restaurantId
 * @access  Public
 */
export const getMenuByRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const cacheKey = `menu:${restaurantId}`;

        // 1. Attempt to fetch from Redis
        try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                console.log(`[Cache Hit] Serving menu for restaurant: ${restaurantId}`);
                // Upstash Redis may return string or object depending on configuration
                const data = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
                return res.status(200).json({
                    source: 'cache',
                    data: data
                });
            }
            console.log("🟡 CACHE MISS: Fetching from MongoDB...");
        } catch (redisError) {
            console.error(`Redis Get Error: ${redisError.message}`);
            // Continue to MongoDB on Redis failure
        }

        // 2. Cache Miss - Query MongoDB
        console.log(`[Cache Miss] Fetching menu from Database for restaurant: ${restaurantId}`);
        const dbData = await Menu.find({ restaurantId }).sort({ category: 1 });

        if (!dbData || dbData.length === 0) {
            return res.status(404).json({ message: 'Menu not found for this restaurant' });
        }

        // 3. Store in Redis with 1 hour expiry (3600 seconds)
        try {
            await redis.set(cacheKey, JSON.stringify(dbData), { ex: 3600 });
        } catch (redisError) {
            console.error(`Redis Set Error: ${redisError.message}`);
        }

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

/**
 * @desc    Add a new menu item
 * @route   POST /api/menus
 * @access  Private (Admin)
 */
export const addMenuItem = async (req, res) => {
    try {
        const { category, name, price, isAvailable, availableQuantity } = req.body;
        const restaurantId = req.user.restaurantId;

        if (!category || !name || !price) {
            return res.status(400).json({ message: "Category, name, and price are required." });
        }

        let imageUrl = null;
        if (req.file && req.file.path) {
            imageUrl = req.file.path;
        }

        const newMenuItem = new Menu({
            restaurantId,
            category,
            name,
            price: Number(price),
            isAvailable: isAvailable !== undefined ? isAvailable === 'true' || isAvailable === true : true,
            availableQuantity: availableQuantity ? Number(availableQuantity) : 100,
            imageUrl
        });

        await newMenuItem.save();

        // 5. Invalidate Redis cache for this restaurant
        try {
            await redis.del(`menu:${restaurantId}`);
            console.log(`[Cache Invalidated] Menu for restaurant: ${restaurantId}`);
        } catch (redisError) {
            console.error(`Redis Delete Error: ${redisError.message}`);
        }

        return res.status(201).json({
            success: true,
            message: "Menu item created successfully",
            data: newMenuItem
        });

    } catch (error) {
        console.error("Error in addMenuItem:", error);
        return res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

/**
 * @desc    Update a menu item
 * @route   PATCH /api/menus/:id
 * @access  Private (Admin)
 */
export const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user.restaurantId;

        const updatedItem = await Menu.findOneAndUpdate(
            { _id: id, restaurantId },
            { $set: req.body },
            { new: true }
        );

        if (!updatedItem) {
            return res.status(404).json({ message: "Menu item not found or unauthorized" });
        }

        // Invalidate Redis cache
        try {
            await redis.del(`menu:${restaurantId}`);
            console.log(`[Cache Invalidated] Menu updated for restaurant: ${restaurantId}`);
        } catch (redisError) {
            console.error(`Redis Delete Error: ${redisError.message}`);
        }

        return res.status(200).json({
            success: true,
            data: updatedItem
        });

    } catch (error) {
        console.error("Error in updateMenuItem:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

/**
 * @desc    Delete a menu item
 * @route   DELETE /api/menus/:id
 * @access  Private (Admin)
 */
export const deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user.restaurantId;

        const deletedItem = await Menu.findOneAndDelete({ _id: id, restaurantId });

        if (!deletedItem) {
            return res.status(404).json({ message: "Menu item not found or unauthorized" });
        }

        // Invalidate Redis cache
        try {
            await redis.del(`menu:${restaurantId}`);
            console.log(`[Cache Invalidated] Menu item deleted for restaurant: ${restaurantId}`);
        } catch (redisError) {
            console.error(`Redis Delete Error: ${redisError.message}`);
        }

        return res.status(200).json({
            success: true,
            message: "Menu item deleted successfully"
        });

    } catch (error) {
        console.error("Error in deleteMenuItem:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

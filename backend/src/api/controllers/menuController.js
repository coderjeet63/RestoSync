import { Menu } from '../../models/Menu.js';
import redis from '../../config/redis.js';

const parseOptionalNumber = (value) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
};

const parseOptionalText = (value) => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
};

const parseBoolean = (value) => value === true || value === 'true';

const getUploadedImageUrl = (file) => file?.path ?? file?.secure_url ?? null;

const invalidateMenuCaches = async (restaurantId) => {
    const cacheKeys = [`menu:${restaurantId}`, `public_menu:${restaurantId}`];

    try {
        await Promise.all(cacheKeys.map((cacheKey) => redis.del(cacheKey)));
        console.log(`[Cache Invalidated] Menu caches cleared for restaurant: ${restaurantId}`);
    } catch (redisError) {
        console.error(`Redis Delete Error: ${redisError.message}`);
    }
};

const buildMenuUpdatePayload = (body, file) => {
    const updatePayload = {};

    const category = parseOptionalText(body.category);
    if (category !== undefined) {
        updatePayload.category = category;
    }

    const name = parseOptionalText(body.name);
    if (name !== undefined) {
        updatePayload.name = name;
    }

    if (body.price !== undefined) {
        const parsedPrice = parseOptionalNumber(body.price);
        if (parsedPrice === null) {
            return { error: 'Price must be a valid number.' };
        }

        updatePayload.price = parsedPrice;
    }

    if (body.isAvailable !== undefined) {
        updatePayload.isAvailable = parseBoolean(body.isAvailable);
    }

    if (body.availableQuantity !== undefined) {
        const parsedAvailableQuantity = parseOptionalNumber(body.availableQuantity);
        if (parsedAvailableQuantity === null) {
            return { error: 'Available quantity must be a valid number.' };
        }

        updatePayload.availableQuantity = parsedAvailableQuantity;
    }

    const imageUrl = getUploadedImageUrl(file);
    if (imageUrl) {
        updatePayload.imageUrl = imageUrl;
    }

    return { updatePayload };
};

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
        const dbData = await Menu.find({ restaurantId }).sort({ category: 1 }).lean();

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
        const normalizedCategory = parseOptionalText(category);
        const normalizedName = parseOptionalText(name);
        const parsedPrice = parseOptionalNumber(price);
        const parsedAvailableQuantity = parseOptionalNumber(availableQuantity);

        if (!normalizedCategory || !normalizedName || parsedPrice === undefined || parsedPrice === null) {
            return res.status(400).json({ message: "Category, name, and price are required." });
        }

        if (availableQuantity !== undefined && parsedAvailableQuantity === null) {
            return res.status(400).json({ message: 'Available quantity must be a valid number.' });
        }

        const imageUrl = getUploadedImageUrl(req.file);

        const newMenuItem = new Menu({
            restaurantId,
            category: normalizedCategory,
            name: normalizedName,
            price: parsedPrice,
            isAvailable: isAvailable !== undefined ? parseBoolean(isAvailable) : true,
            availableQuantity: parsedAvailableQuantity ?? 100,
            imageUrl
        });

        await newMenuItem.save();

        await invalidateMenuCaches(restaurantId);

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
        const { updatePayload, error } = buildMenuUpdatePayload(req.body, req.file);

        if (error) {
            return res.status(400).json({ message: error });
        }

        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({ message: 'Please provide at least one field or image to update.' });
        }

        const updatedItem = await Menu.findOneAndUpdate(
            { _id: id, restaurantId },
            { $set: updatePayload },
            { new: true, runValidators: true }
        );

        if (!updatedItem) {
            return res.status(404).json({ message: "Menu item not found or unauthorized" });
        }

        await invalidateMenuCaches(restaurantId);

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

        await invalidateMenuCaches(restaurantId);

        return res.status(200).json({
            success: true,
            message: "Menu item deleted successfully"
        });

    } catch (error) {
        console.error("Error in deleteMenuItem:", error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

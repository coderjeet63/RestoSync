import { Order } from "../../models/Order.js";
import mongoose from "mongoose";

/**
 * @desc    Get real-time dashboard analytics for the authenticated restaurant
 * @route   GET /api/analytics
 * @access  Private (Admin/Owner)
 */
export const getDashboardStats = async (req, res) => {
    try {
        const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);

        // Query 1: Overall Stats (Total Revenue & Total Orders)
        const overallStats = await Order.aggregate([
            {
                $match: {
                    restaurantId: restaurantId,
                    status: 'COMPLETED'
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    totalOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalRevenue: 1,
                    totalOrders: 1
                }
            }
        ]);

        // Query 2: Top 5 Selling Items
        const topItems = await Order.aggregate([
            {
                $match: {
                    restaurantId: restaurantId,
                    status: 'COMPLETED'
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.menuItemId",
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "menus", // MongoDB collection name for Menu model
                    localField: "_id",
                    foreignField: "_id",
                    as: "menuDetails"
                }
            },
            { $unwind: "$menuDetails" },
            {
                $project: {
                    _id: 0,
                    menuItemId: "$_id",
                    name: "$menuDetails.name",
                    category: "$menuDetails.category",
                    totalSold: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overallStats: overallStats[0] || { totalRevenue: 0, totalOrders: 0 },
                topItems
            }
        });

    } catch (error) {
        console.error("Analytics Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch analytics",
            error: error.message
        });
    }
};

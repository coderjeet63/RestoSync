import { Order } from "../../models/Order.js";
import mongoose from "mongoose";

/**
 * @desc    Get real-time dashboard analytics for the authenticated restaurant
 * @route   GET /api/analytics/dashboard
 * @access  Private (Owner/Manager)
 */
export const getDashboardStats = async (req, res) => {
    try {
        const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);

        const stats = await Order.aggregate([
            {
                $match: { restaurantId }
            },
            {
                $facet: {
                    totalOrders: [
                        { $match: { status: { $ne: 'PENDING' } } },
                        { $count: 'count' }
                    ],
                    totalRevenue: [
                        { $match: { status: { $in: ['PAID', 'COMPLETED'] } } },
                        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
                    ],
                    averageTAT: [
                        { $match: { status: 'COMPLETED' } },
                        {
                            $project: {
                                tat: {
                                    $divide: [
                                        { $subtract: ['$updatedAt', '$createdAt'] },
                                        1000 * 60 // Convert ms to minutes
                                    ]
                                }
                            }
                        },
                        { $group: { _id: null, avgTat: { $avg: '$tat' } } }
                    ]
                }
            }
        ]);

        const data = {
            totalOrders: stats[0].totalOrders[0]?.count || 0,
            totalRevenue: stats[0].totalRevenue[0]?.total || 0,
            averageTAT: Math.round(stats[0].averageTAT[0]?.avgTat || 0)
        };

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Analytics Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard analytics",
            error: error.message
        });
    }
};

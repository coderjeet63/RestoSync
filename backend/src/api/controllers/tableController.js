import { Table } from '../../models/Table.js';

/**
 * @desc    Create a new table for the restaurant
 * @route   POST /api/tables
 * @access  Private (Owner/Manager)
 */
export const createTable = async (req, res) => {
    try {
        const { tableNumber, capacity } = req.body;
        const restaurantId = req.user.restaurantId;

        if (!tableNumber) {
            return res.status(400).json({ message: "Table number is required" });
        }

        const table = await Table.create({
            restaurantId,
            tableNumber,
            capacity: capacity || 4
        });

        res.status(201).json({
            success: true,
            data: table
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Table number already exists for this restaurant" });
        }
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/**
 * @desc    Get all tables for the restaurant
 * @route   GET /api/tables
 * @access  Private (Owner/Manager)
 */
export const getTables = async (req, res) => {
    try {
        const restaurantId = req.user.restaurantId;
        const tables = await Table.find({ restaurantId }).sort({ tableNumber: 1 });

        res.status(200).json({
            success: true,
            count: tables.length,
            data: tables
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

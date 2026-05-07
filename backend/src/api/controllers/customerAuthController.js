import { Customer } from '../../models/Customer.js';
import jwt from 'jsonwebtoken';

/**
 * @desc    Request OTP for Customer Login
 * @route   POST /api/customer/auth/request-otp
 * @access  Public
 */
export const requestOtp = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        // Find or Create Customer
        let customer = await Customer.findOne({ phoneNumber });
        if (!customer) {
            customer = await Customer.create({ phoneNumber });
        }

        // Mock OTP generation
        console.log(`📱 Mock OTP for ${phoneNumber}: 1234`);

        res.status(200).json({ message: "OTP Sent" });
    } catch (error) {
        console.error("Request OTP Error:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * @desc    Verify OTP & Get Token
 * @route   POST /api/customer/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).json({ message: "Phone number and OTP are required" });
        }

        // Mock OTP validation
        if (otp !== '1234') {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const customer = await Customer.findOne({ phoneNumber });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found." });
        }

        // Generate Customer Token
        const token = jwt.sign(
            { id: customer._id, role: 'customer' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            token
        });
    } catch (error) {
        console.error("Verify OTP Error:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

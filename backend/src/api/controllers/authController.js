import { User } from '../../models/User.js';
import jwt from 'jsonwebtoken';

// Generate JWT
const generateToken = (user) => {
    return jwt.sign({
        id: user._id,
        restaurantId: user.restaurantId,
        role: user.role
    }, process.env.JWT_SECRET, {
        expiresIn: '1d',
    });
};

const buildStaffAuthResponse = (user) => ({
    _id: user._id,
    email: user.email,
    role: user.role,
    restaurantId: user.restaurantId,
    token: generateToken(user)
});

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res) => {
    try {
        const { email, password, role, restaurantId } = req.body;

        if (!email || !password || !restaurantId) {
            return res.status(400).json({ message: "Email, password, and restaurantId are required" });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create user (Password is hashed in the Mongoose pre-save hook)
        const user = await User.create({
            email,
            password,
            role,
            restaurantId
        });

        if (user) {
            res.status(201).json(buildStaffAuthResponse(user));
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Authenticate a user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Find user by email
        const user = await User.findOne({ email });

        // Match password
        if (user && (await user.matchPassword(password))) {
            res.status(200).json(buildStaffAuthResponse(user));
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get the authenticated staff user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getCurrentUser = async (req, res) => {
    res.status(200).json({
        _id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        restaurantId: req.user.restaurantId
    });
};

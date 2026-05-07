import jwt from "jsonwebtoken";
import { Customer } from "../../models/Customer.js";

export const protectCustomer = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.role !== 'customer') {
                return res.status(401).json({ message: "Forbidden: Not a customer token" });
            }

            req.customer = await Customer.findById(decoded.id);

            if (!req.customer) {
                return res.status(401).json({ message: "Not authorized, customer not found" });
            }

            next();
        } catch (error) {
            console.error("Customer Auth Middleware Error:", error.message);
            res.status(401).json({ message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        res.status(401).json({ message: "Not authorized, no token" });
    }
};

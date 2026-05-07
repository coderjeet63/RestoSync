import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        default: "Guest"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Customer = mongoose.model("Customer", customerSchema);

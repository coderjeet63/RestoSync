import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtOrder: { type: Number, required: true } // Historical accuracy
}, { _id: false });

const orderSchema = new mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'REJECTED'], 
        default: 'PENDING' 
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED'],
        default: 'PENDING'
    },
    orderType: {
        type: String,
        enum: ['DINE_IN', 'TAKEAWAY'],
        default: 'DINE_IN'
    },
    tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table',
        required: false
    }
}, { timestamps: true });

// Fast queries for a restaurant's recent orders
orderSchema.index({ restaurantId: 1, createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);

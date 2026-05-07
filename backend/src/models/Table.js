import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    tableNumber: {
        type: String,
        required: true
    },
    capacity: {
        type: Number,
        default: 4
    },
    status: {
        type: String,
        enum: ['AVAILABLE', 'OCCUPIED'],
        default: 'AVAILABLE'
    }
}, { timestamps: true });

// Ensure tableNumber is unique per restaurant
tableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });

export const Table = mongoose.model('Table', tableSchema);

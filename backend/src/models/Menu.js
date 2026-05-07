import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
    availableQuantity: { type: Number, default: 100 }, // Concurrency testing ke liye
    imageUrl: { type: String, default: null }
}, { timestamps: true });

// The Engineering Magic: Compound Index for ultra-fast category-wise fetching
menuSchema.index({ restaurantId: 1, category: 1 });

export const Menu = mongoose.model('Menu', menuSchema);
import mongoose from 'mongoose';

/**
 * Establishes a connection to MongoDB using Mongoose.
 * Uses MONGO_URI from environment variables.
 */
const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error('MONGO_URI is not defined in .env file');
        }

        const conn = await mongoose.connect(uri);
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1); // Exit process with failure
    }
};

export default connectDB;

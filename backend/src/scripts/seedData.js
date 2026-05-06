import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import { Restaurant } from '../models/Restaurant.js';
import { Menu } from '../models/Menu.js';

dotenv.config();

// Tumhara local MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/restosync_db';

const RESTAURANT_COUNT = 5000; // Pehle 5000 restaurants banayenge
const MENUS_PER_RESTAURANT = 50; // Har ek ke 50 items = Total 2,50,000 Menu Items!

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear old data
        await Restaurant.deleteMany({});
        await Menu.deleteMany({});
        console.log('🧹 Old Data Cleared!');

        console.log(`🚀 Starting Data Seed: ${RESTAURANT_COUNT} Restaurants...`);

        // Batch processing for Restaurants
        const batchSize = 1000;
        
        for (let i = 0; i < RESTAURANT_COUNT; i += batchSize) {
            const restaurantBatch = [];
            
            for (let j = 0; j < batchSize; j++) {
                restaurantBatch.push({
                    name: faker.company.name() + ' Cafe',
                    location: faker.location.city(),
                    isActive: true
                });
            }

            const insertedRestaurants = await Restaurant.insertMany(restaurantBatch);
            console.log(`✅ Inserted ${i + batchSize} Restaurants...`);

            // Har restaurant ke andar Menu items dalna
            const menuBatch = [];
            const categories = ['Starters', 'Main Course', 'Desserts', 'Beverages'];

            for (const rest of insertedRestaurants) {
                for (let k = 0; k < MENUS_PER_RESTAURANT; k++) {
                    menuBatch.push({
                        restaurantId: rest._id,
                        category: faker.helpers.arrayElement(categories),
                        name: faker.food.dish(),
                        price: faker.number.int({ min: 100, max: 1500 }),
                        availableQuantity: faker.number.int({ min: 10, max: 50 })
                    });
                }
            }

            await Menu.insertMany(menuBatch);
            console.log(`🍕 Inserted Menu items for batch...`);
        }

        console.log('🎉 Database Seeding Complete! Humara DB ab heavily loaded hai.');
        process.exit();

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    }
};

seedDatabase();
import 'dotenv/config';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function testDB() {
    const uri = process.env.MONGO_URI;
    console.log('URI being used:', uri);

    try {
        await mongoose.connect(uri);
        const connection = mongoose.connection;
        console.log('\u2705 Connected to Host:', connection.host);
        console.log('\u2705 Database Name:', connection.name);
        
        const db = connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Collections Found:', collections.map(c => c.name));

        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} documents`);
            if (count > 0 && col.name === 'menus') {
                const doc = await db.collection(col.name).findOne({});
                console.log('Sample Menu Doc:', doc);
            }
        }
        
    } catch (e) {
        console.error('\u274c Error:', e.message);
    } finally {
        await mongoose.disconnect();
    }
}

testDB();

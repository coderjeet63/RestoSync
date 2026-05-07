import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://localhost:27017/restosync_db';
const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
    console.log("🚀 Starting E2E Customer Flow Tests...\n");

    let restaurantId = null;
    let menuItemId = null;

    try {
        // --- PRE-REQUISITE: Connect to DB and fetch valid IDs ---
        console.log("⏳ Connecting to Database to fetch test data...");
        await mongoose.connect(MONGO_URI);
        
        const restaurant = await mongoose.connection.collection('restaurants').findOne();
        if (!restaurant) {
            console.error("❌ No Restaurant found in DB. Please seed the DB first.");
            process.exit(1);
        }
        restaurantId = restaurant._id.toString();

        const menu = await mongoose.connection.collection('menus').findOne({ restaurantId: restaurant._id, availableQuantity: { $gt: 0 } });
        if (!menu) {
            console.error("❌ No available Menu Item found in DB for this restaurant.");
            process.exit(1);
        }
        menuItemId = menu._id.toString();

        console.log(`✅ Test Data Loaded -> Restaurant: ${restaurantId}, Menu Item: ${menuItemId}\n`);
        
        // Disconnect from DB as we will use HTTP for the rest
        await mongoose.disconnect();

        // --- TEST 1: Public Menu ---
        console.log("⏳ Running Test 1: Fetching Public Menu...");
        const menuRes = await fetch(`${BASE_URL}/menus/${restaurantId}`);
        if (!menuRes.ok) throw new Error(`Test 1 Failed: Status ${menuRes.status}`);
        const menuData = await menuRes.json();
        if (!Array.isArray(menuData.data) && !menuData.data) throw new Error("Test 1 Failed: Invalid response data format");
        console.log("✅ Test 1 Passed: Public Menu fetched successfully without Auth.\n");

        // --- TEST 2: Request OTP ---
        console.log("⏳ Running Test 2: Requesting OTP...");
        const requestOtpRes = await fetch(`${BASE_URL}/customer/auth/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: "9999999999" })
        });
        if (!requestOtpRes.ok) throw new Error(`Test 2 Failed: Status ${requestOtpRes.status}`);
        console.log("✅ Test 2 Passed: OTP Request successful.\n");

        // --- TEST 3: Verify OTP & Get Token ---
        console.log("⏳ Running Test 3: Verifying OTP...");
        const verifyOtpRes = await fetch(`${BASE_URL}/customer/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: "9999999999", otp: "1234" })
        });
        if (!verifyOtpRes.ok) throw new Error(`Test 3 Failed: Status ${verifyOtpRes.status}`);
        const verifyData = await verifyOtpRes.json();
        const token = verifyData.token || verifyData.data?.token;
        if (!token) throw new Error("Test 3 Failed: No token returned in response");
        console.log("✅ Test 3 Passed: Customer JWT Token received.\n");

        // --- TEST 4: Place Order ---
        console.log("⏳ Running Test 4: Placing Order via BullMQ...");
        const orderRes = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                restaurantId: restaurantId,
                items: [{ menuItemId: menuItemId, quantity: 1 }]
            })
        });
        if (orderRes.status !== 202) throw new Error(`Test 4 Failed: Expected 202, got ${orderRes.status}`);
        console.log("✅ Test 4 Passed: Order placed successfully into BullMQ using Customer Auth.\n");

        console.log("🎉 All Customer Flow E2E Tests Passed Successfully!");
        process.exit(0);

    } catch (error) {
        console.error(`\n❌ ${error.message}`);
        await mongoose.disconnect();
        process.exit(1);
    }
};

runTests();

import crypto from 'crypto';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000/api';
const generateObjectId = () => crypto.randomBytes(12).toString('hex');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runPhase9Tests = async () => {
    console.log("🚀 Starting Phase 9: Table & QR Management Tests...\n");

    const timestamp = Date.now();
    const ownerEmail = `owner_phase9_${timestamp}@test.com`;
    const password = "password123";
    const initialRestaurantId = generateObjectId();
    
    let ownerToken = "";
    let restaurantId = "";
    let menuItemId = "";
    let tableId = "";
    let customerToken = "";
    let orderJobId = "";
    let realOrderId = null;

    try {
        // --- 1. Setup (Owner) ---
        console.log("⏳ Setup: Registering & Logging in OWNER...");
        const registerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ownerEmail, password, role: 'OWNER', restaurantId: initialRestaurantId })
        });
        if (!registerRes.ok) throw new Error(`Owner registration failed: ${await registerRes.text()}`);
        
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ownerEmail, password })
        });
        if (!loginRes.ok) throw new Error("Owner login failed");
        const ownerData = await loginRes.json();
        ownerToken = ownerData.token;
        restaurantId = ownerData.restaurantId; // Use the one from the DB
        console.log("✅ Setup Passed: OWNER authenticated.\n");

        // --- 2. Setup (Menu) ---
        console.log("⏳ Setup: Creating a dummy menu item...");
        const formData = new FormData();
        formData.append('category', 'Dine-In Specials');
        formData.append('name', `Table Test Burger ${timestamp}`);
        formData.append('price', '19.99');
        formData.append('isAvailable', 'true');

        const createMenuRes = await fetch(`${BASE_URL}/menus`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${ownerToken}` },
            body: formData
        });
        if (!createMenuRes.ok) throw new Error(`Menu creation failed: ${await createMenuRes.text()}`);
        const menuResponse = await createMenuRes.json();
        menuItemId = menuResponse.data._id;
        console.log(`✅ Setup Passed: Menu item created. ID: ${menuItemId}\n`);

        // --- 3. Test 1: Create Table ---
        console.log("⏳ Test 1: Creating a Table...");
        const createTableRes = await fetch(`${BASE_URL}/tables`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ownerToken}` 
            },
            body: JSON.stringify({ tableNumber: "10", capacity: 4 })
        });
        if (!createTableRes.ok) throw new Error(`Table creation failed: ${await createTableRes.text()}`);
        const tableData = await createTableRes.json();
        tableId = tableData.data._id;
        console.log("✅ Test 1 Passed: Table created successfully.\n");

        // --- 4. Setup (Customer) ---
        console.log("⏳ Setup: Authenticating Customer via OTP...");
        const requestOtpRes = await fetch(`${BASE_URL}/customer/auth/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: "7777777777" })
        });
        if (!requestOtpRes.ok) throw new Error("OTP request failed");

        const verifyOtpRes = await fetch(`${BASE_URL}/customer/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: "7777777777", otp: "1234" })
        });
        if (!verifyOtpRes.ok) throw new Error("OTP verify failed");
        const customerData = await verifyOtpRes.json();
        customerToken = customerData.token || customerData.data?.token;
        console.log("✅ Setup Passed: Customer authenticated.\n");

        // --- 5. Test 2: Place Dine-In Order ---
        console.log("⏳ Test 2: Placing Dine-In Order with Table ID...");
        const orderRes = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`
            },
            body: JSON.stringify({
                restaurantId,
                items: [{ menuItemId, quantity: 2 }],
                totalAmount: 39.98,
                orderType: "DINE_IN",
                tableId: tableId
            })
        });
        if (orderRes.status !== 202) throw new Error(`Order placement failed with status ${orderRes.status}`);
        const orderData = await orderRes.json();
        orderJobId = orderData.jobId;
        console.log("✅ Test 2 Passed: Dine-In Order placed with Table ID.\n");

        // Wait a moment for BullMQ worker to process and save the order to MongoDB
        console.log("⏳ Waiting for BullMQ Worker to process the order...");
        await wait(1500);

        // Connect to Mongo to fetch the actual parsed orderId
        try {
            await mongoose.connect('mongodb://localhost:27017/restosync_db');
            const orderDoc = await mongoose.connection.collection('orders').findOne({ 
                restaurantId: new mongoose.Types.ObjectId(restaurantId),
                tableId: new mongoose.Types.ObjectId(tableId)
            });
            if (orderDoc) realOrderId = orderDoc._id.toString();
            await mongoose.disconnect();
        } catch (e) {
             console.log("⚠️ Failed to connect to Mongo to grab real Order ID.");
        }

        if (!realOrderId) {
            throw new Error("Could not retrieve actual Order ID from DB. Is the BullMQ worker running?");
        }

        // --- 6. Test 3: Mock Payment & KDS Trigger ---
        console.log("⏳ Test 3: Triggering Mock Payment & KDS...");
        const paymentRes = await fetch(`${BASE_URL}/payments/${realOrderId}/mock-pay`, {
            method: 'POST'
        });
        if (!paymentRes.ok) throw new Error(`Mock payment failed: ${paymentRes.status}`);
        
        const paymentData = await paymentRes.json();
        
        // Assert tableId exists in the response payload
        const returnedTableId = paymentData.order?.tableId?.toString() || paymentData.order?.tableId;
        if (!returnedTableId || returnedTableId !== tableId) {
            throw new Error(`Table ID mismatch in payment response. Expected ${tableId}, got ${returnedTableId}`);
        }
        
        console.log("✅ Test 3 Passed: Payment successful and Table ID is preserved for Kitchen Display.\n");

        console.log("🎉 ALL PHASE 9 TESTS PASSED SUCCESSFULLY! 🍽️");
        process.exit(0);

    } catch (error) {
        console.error(`\n❌ ERROR: ${error.message}`);
        process.exit(1);
    }
};

runPhase9Tests();

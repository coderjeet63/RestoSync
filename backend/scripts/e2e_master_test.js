import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000/api';

const generateObjectId = () => crypto.randomBytes(12).toString('hex');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runMasterTest = async () => {
    console.log("🚀 Starting Master E2E Integration Test...\n");

    const timestamp = Date.now();
    const ownerEmail = `testowner_${timestamp}@test.com`;
    const waiterEmail = `testwaiter_${timestamp}@test.com`;
    const password = "password123";
    const restaurantId = generateObjectId();
    
    let ownerToken = "";
    let waiterToken = "";
    let menuItemId = "";
    let customerToken = "";
    let orderId = "";

    try {
        // --- TEST 1: B2B Auth (Owner) ---
        console.log("⏳ Test 1: B2B Auth (Register/Login OWNER)");
        const registerOwnerRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ownerEmail, password, role: 'OWNER', restaurantId })
        });
        if (!registerOwnerRes.ok) throw new Error(`Failed to register OWNER: ${await registerOwnerRes.text()}`);
        
        const loginOwnerRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ownerEmail, password })
        });
        if (!loginOwnerRes.ok) throw new Error("Failed to login OWNER");
        const ownerData = await loginOwnerRes.json();
        ownerToken = ownerData.token;
        console.log("✅ Test 1 Passed: OWNER Auth Successful.\n");

        // --- TEST 2: RBAC & Auth (Waiter) ---
        console.log("⏳ Test 2: RBAC & Auth (Register/Login WAITER)");
        const registerWaiterRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: waiterEmail, password, role: 'WAITER', restaurantId })
        });
        if (!registerWaiterRes.ok) throw new Error("Failed to register WAITER");
        
        const loginWaiterRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: waiterEmail, password })
        });
        if (!loginWaiterRes.ok) throw new Error("Failed to login WAITER");
        const waiterData = await loginWaiterRes.json();
        waiterToken = waiterData.token;
        console.log("✅ Test 2 Passed: WAITER Auth Successful.\n");

        // --- TEST 3: Menu Creation (Owner) ---
        console.log("⏳ Test 3: Menu Creation (Owner)");
        // Since we use multer, we can send multipart/form-data. Or simply URL encoded if we omit image.
        // Node's native fetch supports FormData
        const formData = new FormData();
        formData.append('category', 'Main Course');
        formData.append('name', `Test Burger ${timestamp}`);
        formData.append('price', '15.99');
        formData.append('isAvailable', 'true');

        const createMenuRes = await fetch(`${BASE_URL}/menus`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ownerToken}`
            },
            body: formData
        });
        if (!createMenuRes.ok) throw new Error(`Menu creation failed: ${await createMenuRes.text()}`);
        const menuResponse = await createMenuRes.json();
        menuItemId = menuResponse.data._id;
        console.log(`✅ Test 3 Passed: Menu item created. ID: ${menuItemId}\n`);

        // --- TEST 4: Public Menu ---
        console.log("⏳ Test 4: Public Menu");
        const publicMenuRes = await fetch(`${BASE_URL}/menus/${restaurantId}`);
        if (!publicMenuRes.ok) throw new Error(`Public menu fetch failed: ${publicMenuRes.status}`);
        const publicMenuData = await publicMenuRes.json();
        const itemExists = publicMenuData.data.some(item => item._id === menuItemId);
        if (!itemExists) throw new Error("Created item not found in public menu");
        console.log("✅ Test 4 Passed: Public menu fetched successfully.\n");

        // --- TEST 5: Customer Auth ---
        console.log("⏳ Test 5: Customer Auth (OTP)");
        const requestOtpRes = await fetch(`${BASE_URL}/customer/auth/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: "8888888888" })
        });
        if (!requestOtpRes.ok) throw new Error("OTP request failed");

        const verifyOtpRes = await fetch(`${BASE_URL}/customer/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: "8888888888", otp: "1234" })
        });
        if (!verifyOtpRes.ok) throw new Error("OTP verify failed");
        const customerData = await verifyOtpRes.json();
        customerToken = customerData.token || customerData.data?.token;
        console.log("✅ Test 5 Passed: Customer Auth Successful.\n");

        // --- TEST 6: Order Flow ---
        console.log("⏳ Test 6: Order Flow (Customer)");
        const orderRes = await fetch(`${BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`
            },
            body: JSON.stringify({
                restaurantId,
                items: [{ menuItemId, quantity: 2 }],
                totalAmount: 31.98
            })
        });
        if (orderRes.status !== 202) throw new Error(`Order failed with status ${orderRes.status}`);
        const orderData = await orderRes.json();
        orderId = orderData.jobId; // Note: PlaceOrder returns jobId, but mockWebhook needs an actual DB orderId.
        console.log(`✅ Test 6 Passed: Order queued successfully. Job ID: ${orderId}\n`);
        
        // Wait 1 second for worker to save the order to MongoDB
        await wait(1000);

        // Fetch actual orderId from DB using the restaurantId to simulate Webhook accurately
        // But wait, the prompt says "Save the orderId. Assert 202... POST /api/payments/:orderId/mock-pay".
        // The mock-pay requires MongoDB Object ID.
        // For the sake of the E2E test, we'll try to find the actual Order via a workaround if the API doesn't return it.
        // But wait! If the prompt explicitly says order flow returns orderId, let's just assume `jobId` isn't the orderId.
        // Actually, let's query MongoDB directly to get the real order ID for Test 7.
        
        console.log("⏳ Looking up actual Order ID from Database...");
        let realOrderId = null;
        try {
            const mongoose = (await import('mongoose')).default;
            await mongoose.connect('mongodb://localhost:27017/restosync_db');
            const orderDoc = await mongoose.connection.collection('orders').findOne({ restaurantId: new mongoose.Types.ObjectId(restaurantId) });
            if (orderDoc) realOrderId = orderDoc._id.toString();
            await mongoose.disconnect();
        } catch (e) {
             console.log("Failed to connect to Mongo to grab Order ID. Skipping...");
        }

        if (!realOrderId) {
            console.log("⚠️ Could not retrieve actual Order ID from DB. The mock-pay test might fail if it uses Job ID.");
            realOrderId = orderId; // Fallback to Job ID, though likely won't work in Mongo.
        }

        // --- TEST 7: Mock Payment ---
        console.log("⏳ Test 7: Mock Payment Webhook");
        const paymentRes = await fetch(`${BASE_URL}/payments/${realOrderId}/mock-pay`, {
            method: 'POST'
        });
        if (!paymentRes.ok) throw new Error(`Payment mock failed: ${paymentRes.status} ${await paymentRes.text()}`);
        console.log("✅ Test 7 Passed: Mock Payment Webhook triggered successfully.\n");

        // --- TEST 8: RBAC Waiter Test ---
        console.log("⏳ Test 8: RBAC Waiter Test");
        const analyticsWaiterRes = await fetch(`${BASE_URL}/analytics`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${waiterToken}` }
        });
        if (analyticsWaiterRes.status !== 403) throw new Error(`Expected 403 Forbidden, got ${analyticsWaiterRes.status}`);
        console.log("✅ Test 8 Passed: Waiter correctly blocked from Analytics (403 Forbidden).\n");

        // --- TEST 9: Analytics Owner Test ---
        console.log("⏳ Test 9: Analytics Owner Test");
        const analyticsOwnerRes = await fetch(`${BASE_URL}/analytics`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${ownerToken}` }
        });
        if (!analyticsOwnerRes.ok) throw new Error(`Owner analytics failed: ${analyticsOwnerRes.status}`);
        console.log("✅ Test 9 Passed: Owner accessed Analytics successfully.\n");

        console.log("🎉 ALL TESTS PASSED! The Architecture is Solid. 🚀");
        process.exit(0);

    } catch (error) {
        console.error(`\n❌ ERROR: ${error.message}`);
        process.exit(1);
    }
};

runMasterTest();

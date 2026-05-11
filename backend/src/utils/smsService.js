import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

/**
 * @desc    Get Twilio client instance or null if credentials are invalid/missing
 */
const getTwilioClient = () => {
    if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
        return null;
    }
    try {
        return twilio(accountSid, authToken);
    } catch (error) {
        console.error('Twilio Initialization Error:', error.message);
        return null;
    }
};

/**
 * @desc    Send SMS notification to customer regarding their order status
 * @param   {string} phoneNumber - Customer's phone number
 * @param   {string} status - New order status
 */
export const sendOrderStatusSMS = async (phoneNumber, status) => {
    try {
        const client = getTwilioClient();
        
        if (!client) {
            console.warn('SMS skipped: Twilio credentials are not configured or are invalid (SID must start with AC).');
            return;
        }

        let message = '';

        switch (status) {
            case 'PREPARING':
                message = "RestoSync: Great news! The Chef has accepted your order and is preparing your meal.";
                break;
            case 'READY':
                message = "RestoSync: Your food is ready and on its way to your table!";
                break;
            case 'REJECTED':
                message = "RestoSync: We're sorry, but your order was cancelled by the kitchen. A refund has been initiated.";
                break;
            default:
                // For any other status, return early without sending an SMS
                return;
        }

        if (!phoneNumber) {
            console.warn('SMS skipped: No phone number provided.');
            return;
        }

        const response = await client.messages.create({
            body: message,
            from: fromPhoneNumber,
            to: phoneNumber
        });

        console.log(`SMS Sent successfully: SID ${response.sid}`);
    } catch (error) {
        // Log the error but do not throw it to avoid crashing the main order flow
        console.error('SMS Failed:', error.message);
    }
};

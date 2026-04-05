const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./backend/models/User');
require('dotenv').config({ path: './backend/.env' });

async function testReset() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = process.env.EMAIL_USER; // use existing user's email
        console.log('Testing with email:', email);
        
        // request reset
        const res1 = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
        console.log('Forgot password response:', res1.data);
        
        // fetch user to get the newly generated hashed token
        const user = await User.findOne({ email });
        console.log('User found:', user.userId);
        
        // Wait, I can't reconstruct the unhashed token since it's saved hashed!
        // So I can't fully mock the E2E without intercepting the email.
    } catch (err) {
        console.error(err.response ? err.response.data : err.message);
    } finally {
        await mongoose.connection.close();
    }
}
testReset();

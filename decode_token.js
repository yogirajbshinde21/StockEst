// Check if token is expired or not, using this command :
// node decode-token.js

require('dotenv').config();

const accessToken = process.env.UPSTOX_ACCESS_TOKEN;

if (!accessToken) {
    console.log('❌ No access token found');
    process.exit(1);
}

try {
    // JWT tokens have 3 parts separated by dots
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
        console.log('❌ Invalid JWT format');
        process.exit(1);
    }
    
    // Decode the payload (second part)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('🔍 Token Information:');
    console.log('📅 Issued At:', new Date(payload.iat * 1000).toLocaleString());
    console.log('⏰ Expires At:', new Date(payload.exp * 1000).toLocaleString());
    console.log('👤 Subject:', payload.sub);
    
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = payload.exp - now;
    
    if (timeLeft > 0) {
        const hoursLeft = Math.floor(timeLeft / 3600);
        const minutesLeft = Math.floor((timeLeft % 3600) / 60);
        console.log(`✅ Token is VALID for ${hoursLeft}h ${minutesLeft}m more`);
    } else {
        console.log('❌ Token has EXPIRED!');
        console.log(`⏰ Expired ${Math.abs(timeLeft)} seconds ago`);
    }
    
} catch (error) {
    console.error('❌ Error decoding token:', error.message);
}
const UpstoxApi = require('upstox-js-sdk');
require('dotenv').config();

// Get access token from environment variables
const accessToken = process.env.UPSTOX_ACCESS_TOKEN;

if (!accessToken) {
    console.error('UPSTOX_ACCESS_TOKEN not found in environment variables');
    process.exit(1);
}

const instruments = [
    'NSE_EQ|INE002A01018', // Reliance Industries
    'NSE_EQ|INE009A01021', // Infosys
    'NSE_EQ|INE467B01029', // TCS
    'NSE_EQ|INE040A01034'  // HDFC Bank
];

const companyNames = {
    'NSE_EQ|INE002A01018': 'Reliance Industries',
    'NSE_EQ|INE009A01021': 'Infosys',
    'NSE_EQ|INE467B01029': 'TCS',
    'NSE_EQ|INE040A01034': 'HDFC Bank'
};

// Setup API client
const defaultClient = UpstoxApi.ApiClient.instance;
defaultClient.authentications['OAUTH2'].accessToken = accessToken;

const marketQuoteApi = new UpstoxApi.MarketQuoteApi();

async function fetchLivePrices() {
    try {
        const instrumentsString = instruments.join(',');
        
        marketQuoteApi.ltp(instrumentsString, 'complete', (error, data, response) => {
            if (error) {
                console.error('❌ Error fetching prices:', error);
                return;
            }

            console.clear();
            console.log('🔴 LIVE STOCK PRICES 🔴');
            console.log('═'.repeat(50));
            console.log(`⏰ Last Updated: ${new Date().toLocaleString()}\n`);
            
            // Check if data has nested structure
            const priceData = data.data || data; // Use data.data if exists, otherwise data
            
            if (priceData && typeof priceData === 'object') {
                Object.keys(priceData).forEach(instrumentKey => {
                    const stockData = priceData[instrumentKey];
                    const companyName = companyNames[instrumentKey] || instrumentKey;
                    
                    // Handle different possible property names
                    const price = stockData.last_price || stockData.ltp || stockData.lastPrice || 'N/A';
                    
                    console.log(`📈 ${companyName}`);
                    console.log(`💰 LTP: ₹${price}`);
                    console.log('─'.repeat(40));
                });
            } else {
                console.log('❌ Unexpected data structure received');
                console.log('Data:', JSON.stringify(data, null, 2));
            }
            
            console.log(`\n⏱️  Next update in 5 seconds...`);
        });
        
    } catch (error) {
        console.error('❌ Error fetching prices:', error);
    }
}

// Start the live price monitor
console.log('🚀 Starting Live Price Monitor...');
fetchLivePrices();
setInterval(fetchLivePrices, 5000);

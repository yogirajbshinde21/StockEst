const fs = require('fs');

// Read the JWT token from token.txt
const JWT_TOKEN = fs.readFileSync('token.txt', 'utf8').trim();

async function fetchAndLogAnalytics() {
  try {
    const response = await fetch('http://localhost:3001/api/analytics/dashboard-data', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('\n🔍 FULL ANALYTICS RESPONSE:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n📊 TIMELINE DATA:');
    if (data.timeline) {
      data.timeline.forEach((point, index) => {
        console.log(`Point ${index + 1}:`, {
          date: point.date,
          totalValue: point.totalValue,
          totalInvested: point.totalInvested,
          totalProfitLoss: point.totalProfitLoss
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fetchAndLogAnalytics();

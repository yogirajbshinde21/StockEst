async function login() {
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test2@gmail.com',
        password: 'password123'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const JWT_TOKEN = data.token;
    
    console.log('✅ Login successful');
    
    // Now fetch analytics
    const analyticsResponse = await fetch('http://localhost:3001/api/analytics/dashboard-data', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!analyticsResponse.ok) {
      throw new Error(`Analytics HTTP error! status: ${analyticsResponse.status}`);
    }

    const analyticsData = await analyticsResponse.json();
    
    console.log('\n🔍 FULL ANALYTICS RESPONSE:');
    console.log(JSON.stringify(analyticsData, null, 2));
    
    console.log('\n📊 TIMELINE DATA:');
    if (analyticsData.timeline) {
      analyticsData.timeline.forEach((point, index) => {
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

login();

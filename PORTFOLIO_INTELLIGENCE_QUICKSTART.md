# Portfolio Intelligence Dashboard Setup Guide

## Quick Start

The Portfolio Intelligence Dashboard has been successfully integrated into StockEst! Here's how to get started:

### 🚀 Immediate Access

1. **Start the Backend Server**:
   ```bash
   cd backend
   npm start
   ```

2. **Start the Frontend**:
   ```bash
   cd frontend
   npm start
   ```

3. **Access the Dashboard**:
   - Log into StockEst
   - Go to the **Portfolio** tab
   - Click on **Intelligence Dashboard**

### 🎬 Generate Demo Data (Recommended for Testing)

To see the full functionality with sample data:

1. **Via API** (using curl or Postman):
   ```bash
   POST http://localhost:5000/api/analytics/generate-demo-data
   Authorization: Bearer <your-jwt-token>
   Content-Type: application/json
   
   {
     "days": 30
   }
   ```

2. **Via Frontend** (coming soon):
   - A demo data button will be added to the dashboard

### 📊 What You'll See

Once you have data (either real trades or demo data), the Intelligence Dashboard provides:

#### Overview Tab
- **Portfolio Value**: Current total value with trend indicators
- **Total Returns**: Absolute and percentage returns
- **Volatility**: Risk measurement of your portfolio
- **Sharpe Ratio**: Risk-adjusted return metric
- **Interactive Timeline**: Portfolio performance over time
- **Quick Stats**: Best day, worst day, max drawdown, diversification score

#### Performance Tab
- **Returns Comparison**: Performance across different time periods (1D, 1W, 1M, 3M, 6M, 1Y)
- **Top Gainers**: Best performing stocks in your portfolio
- **Top Losers**: Underperforming stocks
- **Daily Performance**: Bar chart showing daily gains/losses
- **Performance Metrics**: Detailed analytics including annualized returns

#### Analytics Tab
- **Sector Performance**: How different sectors in your portfolio are performing
- **Risk Metrics**: Portfolio concentration, diversification score, holding periods
- **Portfolio Composition**: Pie chart showing asset allocation

#### Milestones Tab
- **Achievement History**: All unlocked milestones
- **Progress Tracking**: Visual progress toward next achievements
- **Milestone Types**: Profit targets, portfolio value goals, diversification achievements

### 🔧 Technical Features

#### Automatic Data Collection
- **Daily Snapshots**: Automatically created at 6 PM IST (market close)
- **Real-time Updates**: Portfolio snapshots created after every trade
- **Hourly Refresh**: During market hours for active traders

#### Advanced Analytics
- **Performance Metrics**: 
  - Total return (absolute and percentage)
  - Volatility (annualized standard deviation)
  - Sharpe ratio (risk-adjusted returns)
  - Maximum drawdown
- **Risk Analysis**:
  - Portfolio concentration (Herfindahl index)
  - Diversification scoring
  - Turnover ratio analysis
- **Sector Analysis**:
  - Automatic sector classification
  - Sector-wise performance tracking
  - Top stock identification per sector

#### Smart Milestone System
- **Profit Milestones**: ₹1K, ₹5K, ₹10K, ₹25K, ₹50K, ₹100K
- **Portfolio Value**: ₹1L, ₹5L, ₹10L
- **Diversification**: 5, 10, 20 stocks
- **Special Events**: First investment, best performing stock, etc.

### 🎯 Key Benefits

1. **Comprehensive Portfolio Tracking**: Never lose sight of your investment journey
2. **Performance Insights**: Understand what's working and what's not
3. **Risk Management**: Track portfolio risk with professional-grade metrics
4. **Goal Setting**: Visual progress tracking toward investment milestones
5. **Data-Driven Decisions**: Make informed investment choices with historical data

### 🛠️ Troubleshooting

#### No Data Showing?
1. **For New Users**: Generate demo data or start trading to populate the dashboard
2. **Missing Timeline**: Use the manual snapshot creation endpoint
3. **Incorrect Analytics**: Trigger manual analytics recalculation

#### API Endpoints for Manual Operations
```bash
# Create portfolio snapshot
POST /api/analytics/create-snapshot

# Generate demo data
POST /api/analytics/generate-demo-data

# Calculate analytics manually
POST /api/analytics/manual-analytics

# Check scheduler status
GET /api/analytics/scheduler-status
```

#### Performance Issues?
- Check MongoDB connection and indices
- Verify cron jobs are running properly
- Monitor server logs for any errors

### 📱 Mobile Experience

The dashboard is fully responsive and optimized for mobile devices:
- Touch-friendly interface
- Responsive charts that adapt to screen size
- Collapsible sections for better mobile navigation
- Swipe-friendly tab navigation

### 🔮 What's Next?

The Portfolio Intelligence Dashboard is designed to evolve with your needs:

#### Upcoming Features
- **Export Functionality**: PDF reports and Excel exports
- **Benchmark Comparison**: Compare your portfolio against market indices
- **Predictive Analytics**: AI-powered performance predictions
- **Tax Optimization**: Capital gains/loss analysis
- **Social Features**: Compare performance with other users

#### Current Capabilities
- ✅ Real-time portfolio tracking
- ✅ Historical performance analysis
- ✅ Risk assessment and management
- ✅ Milestone tracking and achievements
- ✅ Sector-wise performance analysis
- ✅ Mobile-responsive design
- ✅ Automated data collection
- ✅ Professional-grade analytics

### 💡 Pro Tips

1. **Regular Trading**: The more you trade, the richer your analytics become
2. **Diversification**: The dashboard rewards and tracks portfolio diversification
3. **Long-term View**: Use the timeline charts to understand long-term trends
4. **Risk Monitoring**: Keep an eye on volatility and concentration metrics
5. **Milestone Goals**: Use achievements as motivation for better investing

### 🏆 Achievement Strategy

To unlock all milestones:
1. **Start Small**: Make your first investment to unlock the journey
2. **Stay Consistent**: Regular trading improves your analytics
3. **Diversify**: Spread investments across different stocks and sectors
4. **Monitor Performance**: Use the analytics to make informed decisions
5. **Set Goals**: Work toward the next profit or portfolio value milestone

---

**Ready to start your intelligent investing journey?** 🚀

Access the Portfolio Intelligence Dashboard now through the Portfolio tab in StockEst!

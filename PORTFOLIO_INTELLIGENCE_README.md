# Portfolio Intelligence Dashboard

## Overview

The Portfolio Intelligence Dashboard is a powerful analytics hub that transforms StockEst's portfolio section into a sophisticated investment platform. It provides comprehensive performance tracking, advanced analytics, and predictive insights using historical data patterns.

## 🚀 Key Features

### 1. Portfolio Performance Timeline
- **Daily Portfolio Snapshots**: Automated storage of daily portfolio values, P&L, and sector allocation
- **Interactive Timeline Graph**: Visual representation of portfolio value progression over time
- **Performance Milestones**: Automatic tracking and highlighting of significant gains/losses and investment thresholds

### 2. Advanced Analytics
- **Portfolio Composition Analysis**: Detailed breakdown of holdings and sector allocation
- **Risk Metrics**: Volatility, Sharpe ratio, max drawdown, and diversification scores
- **Performance Metrics**: Total returns, annualized returns, and time-based performance comparison
- **Sector Performance**: Analysis of how different sectors in your portfolio are performing

### 3. Interactive Visualizations
- **Portfolio Timeline Chart**: SVG-based line charts showing portfolio value vs invested amount
- **Daily Performance Chart**: Bar chart showing daily gains/losses
- **Sector Allocation Pie Chart**: Visual representation of portfolio diversification
- **Returns Comparison**: Horizontal bar charts comparing performance across different time periods

### 4. Achievement System
- **Performance Milestones**: Automatic tracking of profit milestones, portfolio value achievements
- **Diversification Goals**: Recognition for portfolio diversification achievements
- **Progress Tracking**: Visual progress bars for upcoming milestones

## 🏗️ Technical Architecture

### Backend Components

#### Models
- **PortfolioSnapshot**: Daily portfolio state snapshots
- **PerformanceMilestone**: Achievement tracking
- **PortfolioAnalytics**: Comprehensive portfolio metrics

#### Services
- **PortfolioAnalyticsService**: Core analytics calculation engine
- **PortfolioAnalyticsScheduler**: Automated data collection and processing

#### API Endpoints
```
GET /api/analytics/portfolio-timeline      # Performance timeline data
GET /api/analytics/portfolio-analytics     # Comprehensive analytics
GET /api/analytics/milestones             # Achievement milestones
GET /api/analytics/dashboard-data         # Combined dashboard data
POST /api/analytics/create-snapshot       # Manual snapshot creation
POST /api/analytics/generate-demo-data    # Demo data generation
```

### Frontend Components

#### Main Components
- **PortfolioIntelligence**: Main dashboard component
- **OverviewSection**: Key metrics and timeline visualization
- **PerformanceSection**: Returns analysis and top performers
- **AnalyticsSection**: Advanced metrics and risk analysis
- **MilestonesSection**: Achievement tracking and progress

#### Charts and Visualizations
- **PortfolioTimelineChart**: SVG-based portfolio performance chart
- **DailyPerformanceChart**: Daily change visualization
- **PortfolioCompositionChart**: Sector allocation pie chart
- **ReturnsComparisonChart**: Performance comparison bars

## 📊 Analytics Metrics

### Performance Metrics
- **Total Return**: Absolute profit/loss amount
- **Total Return %**: Percentage return on investment
- **Volatility**: Standard deviation of daily returns (annualized)
- **Sharpe Ratio**: Risk-adjusted return metric
- **Max Drawdown**: Largest peak-to-trough decline

### Risk Metrics
- **Portfolio Concentration**: Herfindahl index measuring concentration
- **Diversification Score**: Inverse concentration score (0-100)
- **Average Holding Period**: Mean time stocks are held
- **Turnover Ratio**: Trading frequency indicator

### Time-based Returns
- 1 Day, 1 Week, 1 Month, 3 Months, 6 Months, 1 Year, All Time

## 🔄 Automated Data Collection

### Scheduling
- **Daily Snapshots**: 6:00 PM IST (after market close) - Monday to Friday
- **Hourly Updates**: 9:00 AM to 4:00 PM IST during market hours for active users
- **Weekly Analytics**: Saturday 9:00 AM IST for comprehensive recalculation

### Real-time Updates
- Automatic snapshot creation after every trade
- Real-time portfolio value updates via WebSocket
- Immediate milestone checking after transactions

## 🎯 Milestone System

### Profit Milestones
- ₹1,000, ₹5,000, ₹10,000, ₹25,000, ₹50,000, ₹100,000

### Portfolio Value Milestones
- ₹100,000, ₹500,000, ₹1,000,000

### Diversification Milestones
- 5 stocks, 10 stocks, 20 stocks in portfolio

### Special Achievements
- First Investment, Monthly Gains, Best/Worst Performing Stock

## 🛠️ Setup and Installation

### Backend Setup
1. Ensure MongoDB is running
2. Install required dependencies:
   ```bash
   npm install node-cron
   ```
3. The analytics system will automatically start with the server

### Frontend Setup
1. The PortfolioIntelligence component is integrated into the existing Portfolio tab
2. No additional setup required - accessible via Portfolio → Intelligence Dashboard

## 🧪 Testing with Demo Data

### Generate Demo Data
```javascript
POST /api/analytics/generate-demo-data
{
  "days": 30  // Generate 30 days of sample data
}
```

### Clear Demo Data
```javascript
DELETE /api/analytics/clear-demo-data
```

### Check Demo Data Status
```javascript
GET /api/analytics/demo-data-summary
```

## 📱 User Interface

### Navigation
- **Overview Tab**: Key metrics, timeline chart, quick stats
- **Performance Tab**: Returns analysis, top gainers/losers, daily performance
- **Analytics Tab**: Sector analysis, risk metrics, composition charts
- **Milestones Tab**: Achievement tracking and progress indicators

### Responsive Design
- Mobile-first approach with responsive breakpoints
- Collapsible charts and metrics on smaller screens
- Touch-friendly interface elements

## 🔧 Configuration

### Environment Variables
```env
# MongoDB connection for analytics data
MONGODB_URI=mongodb://localhost:27017/stockest

# Timezone for scheduling (default: Asia/Kolkata)
TZ=Asia/Kolkata
```

### Customization Options
- Timeframe selection (7D, 1M, 3M, 6M, 1Y)
- Metric display preferences
- Chart color themes
- Achievement notification settings

## 📈 Performance Considerations

### Database Optimization
- Indexed queries on userId and date fields
- Efficient aggregation pipelines for analytics calculation
- Batch processing for bulk operations

### Frontend Optimization
- Lazy loading of chart components
- Memoized calculations for expensive operations
- Efficient re-rendering with React hooks

### Caching Strategy
- Client-side caching of analytics data
- Server-side caching of frequently accessed metrics
- Smart cache invalidation on data updates

## 🚦 Monitoring and Alerting

### Scheduler Health
```javascript
GET /api/analytics/scheduler-status
```

### Data Quality Checks
- Validation of snapshot data integrity
- Monitoring of milestone calculation accuracy
- Performance tracking of analytics generation

## 🔮 Future Enhancements

### Planned Features
1. **Predictive Analytics**: ML-based portfolio performance predictions
2. **Benchmark Comparison**: Compare portfolio against market indices
3. **Risk Analysis**: VaR (Value at Risk) calculations
4. **Tax Optimization**: Capital gains/loss optimization suggestions
5. **Social Features**: Portfolio sharing and comparison with other users

### Technical Improvements
1. **Real-time Charts**: WebSocket-based live chart updates
2. **Advanced Visualizations**: 3D charts and interactive dashboards
3. **Export Functionality**: PDF reports and Excel exports
4. **API Rate Limiting**: Advanced throttling for heavy analytics requests

## 📝 API Documentation

### Dashboard Data Endpoint
```typescript
interface DashboardDataResponse {
  timeline: PortfolioSnapshot[];
  analytics: PortfolioAnalytics;
  milestones: PerformanceMilestone[];
  timeframe: number;
}
```

### Analytics Calculation
```typescript
interface PortfolioAnalytics {
  performance: PerformanceMetrics;
  returns: TimeBasedReturns;
  topGainers: StockPerformance[];
  topLosers: StockPerformance[];
  sectorPerformance: SectorAnalysis[];
  riskMetrics: RiskMetrics;
}
```

## 🐛 Troubleshooting

### Common Issues
1. **Missing Timeline Data**: Run manual snapshot creation
2. **Incorrect Analytics**: Trigger manual analytics calculation
3. **Performance Issues**: Check database indices and query optimization

### Debug Commands
```bash
# Check scheduler status
curl -X GET /api/analytics/scheduler-status

# Generate test data
curl -X POST /api/analytics/generate-demo-data

# Manual snapshot creation
curl -X POST /api/analytics/create-snapshot
```

## 📄 License

This Portfolio Intelligence Dashboard is part of the StockEst platform and follows the same licensing terms as the main project.

## 🤝 Contributing

1. Follow the existing code structure and naming conventions
2. Add comprehensive tests for new analytics features
3. Update documentation for any new API endpoints
4. Ensure mobile responsiveness for new UI components

## 📞 Support

For technical support or feature requests related to the Portfolio Intelligence Dashboard, please create an issue in the StockEst repository with the label `portfolio-intelligence`.

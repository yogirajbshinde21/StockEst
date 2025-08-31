const achievements = {
  first_trade: {
    id: 'first_trade',
    name: 'First Trade',
    nameHi: 'पहला व्यापार',
    description: 'Complete your first buy or sell trade',
    descriptionHi: 'अपना पहला खरीदारी या बिक्री का व्यापार पूरा करें',
    icon: '🎯',
    category: 'TRADING',
    tier: 'BRONZE',
    experiencePoints: 10,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 500,
      description: 'Bonus ₹500 for your first trade!'
    },
    condition: {
      type: 'TRADE_COUNT',
      target: 1
    }
  },

  profit_master: {
    id: 'profit_master',
    name: 'Profit Master',
    nameHi: 'मुनाफा मास्टर',
    description: 'Earn ₹1,000+ total profit from trading',
    descriptionHi: 'व्यापार से कुल ₹1,000+ का मुनाफा कमाएं',
    icon: '💰',
    category: 'PROFIT',
    tier: 'SILVER',
    experiencePoints: 50,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 1000,
      description: 'Bonus ₹1,000 for reaching profit milestone!'
    },
    condition: {
      type: 'TOTAL_PROFIT',
      target: 1000
    }
  },

  risk_manager: {
    id: 'risk_manager',
    name: 'Risk Manager',
    nameHi: 'जोखिम प्रबंधक',
    description: 'Own 3 or more different stocks to diversify risk',
    descriptionHi: 'जोखिम कम करने के लिए 3 या अधिक अलग-अलग शेयर रखें',
    icon: '🛡️',
    category: 'PORTFOLIO',
    tier: 'BRONZE',
    experiencePoints: 30,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 750,
      description: 'Bonus ₹750 for smart diversification!'
    },
    condition: {
      type: 'PORTFOLIO_DIVERSITY',
      target: 3
    }
  },

  login_streak_7: {
    id: 'login_streak_7',
    name: 'Consistent Learner',
    nameHi: 'निरंतर सीखने वाला',
    description: 'Login for 7 consecutive days',
    descriptionHi: 'लगातार 7 दिन लॉगिन करें',
    icon: '🔥',
    category: 'STREAK',
    tier: 'BRONZE',
    experiencePoints: 25,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 2000,
      description: 'Bonus ₹2,000 for your dedication!'
    },
    condition: {
      type: 'LOGIN_STREAK',
      target: 7
    }
  },

  portfolio_growth: {
    id: 'portfolio_growth',
    name: 'Wealth Builder',
    nameHi: 'संपत्ति निर्माता',
    description: 'Reach ₹1,50,000 total portfolio value',
    descriptionHi: 'कुल ₹1,50,000 पोर्टफोलियो मूल्य तक पहुंचें',
    icon: '📈',
    category: 'MILESTONE',
    tier: 'GOLD',
    experiencePoints: 100,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 5000,
      description: 'Bonus ₹5,000 for growing your wealth!'
    },
    condition: {
      type: 'PORTFOLIO_VALUE',
      target: 150000
    }
  },

  volume_trader: {
    id: 'volume_trader',
    name: 'Active Trader',
    nameHi: 'सक्रिय व्यापारी',
    description: 'Complete 50 total trades',
    descriptionHi: 'कुल 50 व्यापार पूरे करें',
    icon: '⚡',
    category: 'TRADING',
    tier: 'SILVER',
    experiencePoints: 75,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 3000,
      description: 'Bonus ₹3,000 for being an active trader!'
    },
    condition: {
      type: 'TRADE_COUNT',
      target: 50
    }
  },

  // Additional achievements for better engagement
  quick_profit: {
    id: 'quick_profit',
    name: 'Quick Profit',
    nameHi: 'तुरंत मुनाफा',
    description: 'Make profit on your first day of trading',
    descriptionHi: 'व्यापार के पहले दिन ही मुनाफा कमाएं',
    icon: '⚡',
    category: 'PROFIT',
    tier: 'BRONZE',
    experiencePoints: 20,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 600,
      description: 'Bonus ₹600 for quick success!'
    },
    condition: {
      type: 'FIRST_DAY_PROFIT',
      target: 1
    }
  },

  steady_investor: {
    id: 'steady_investor',
    name: 'Steady Investor',
    nameHi: 'स्थिर निवेशक',
    description: 'Hold a stock for 7 days without selling',
    descriptionHi: 'बिना बेचे 7 दिन तक एक शेयर रखें',
    icon: '🎯',
    category: 'PORTFOLIO',
    tier: 'BRONZE',
    experiencePoints: 25,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 800,
      description: 'Bonus ₹800 for patient investing!'
    },
    condition: {
      type: 'HOLDING_PERIOD',
      target: 7
    }
  },

  level_5_trader: {
    id: 'level_5_trader',
    name: 'Level 5 Trader',
    nameHi: 'लेवल 5 व्यापारी',
    description: 'Reach Level 5 in the trading system',
    descriptionHi: 'ट्रेडिंग सिस्टम में लेवल 5 तक पहुंचें',
    icon: '🏆',
    category: 'MILESTONE',
    tier: 'SILVER',
    experiencePoints: 50,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 2500,
      description: 'Bonus ₹2,500 for reaching Level 5!'
    },
    condition: {
      type: 'LEVEL_REACHED',
      target: 5
    }
  },

  perfect_week: {
    id: 'perfect_week',
    name: 'Perfect Week',
    nameHi: 'परफेक्ट सप्ताह',
    description: 'Make profit every day for 7 consecutive days',
    descriptionHi: 'लगातार 7 दिन तक हर दिन मुनाफा कमाएं',
    icon: '🌟',
    category: 'STREAK',
    tier: 'GOLD',
    experiencePoints: 150,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 10000,
      description: 'Bonus ₹10,000 for a perfect week!'
    },
    condition: {
      type: 'PROFIT_STREAK',
      target: 7
    }
  },

  // Analysis Achievements
  chart_explorer: {
    id: 'chart_explorer',
    name: 'Chart Explorer',
    nameHi: 'चार्ट खोजकर्ता',
    description: 'Analyze charts for 3 different time intervals',
    descriptionHi: '3 अलग-अलग समय अंतराल के लिए चार्ट का विश्लेषण करें',
    icon: '📊',
    category: 'ANALYSIS',
    tier: 'BRONZE',
    experiencePoints: 20,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 300,
      description: 'Bonus ₹300 for exploring charts!'
    },
    condition: {
      type: 'CHART_INTERVALS_EXPLORED',
      target: 3
    }
  },

  trend_spotter: {
    id: 'trend_spotter',
    name: 'Trend Spotter',
    nameHi: 'ट्रेंड स्पॉटर',
    description: 'Identify 10 different market trends correctly',
    descriptionHi: '10 अलग-अलग बाज़ार ट्रेंड सही तरीके से पहचानें',
    icon: '📈',
    category: 'ANALYSIS',
    tier: 'SILVER',
    experiencePoints: 40,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 800,
      description: 'Bonus ₹800 for spotting trends!'
    },
    condition: {
      type: 'TRENDS_SPOTTED',
      target: 10
    }
  },

  analysis_streak: {
    id: 'analysis_streak',
    name: 'Analysis Streak',
    nameHi: 'विश्लेषण स्ट्रीक',
    description: 'Analyze charts for 7 consecutive days',
    descriptionHi: '7 लगातार दिन चार्ट का विश्लेषण करें',
    icon: '🔥',
    category: 'ANALYSIS',
    tier: 'GOLD',
    experiencePoints: 75,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 1500,
      description: 'Bonus ₹1,500 for consistent analysis!'
    },
    condition: {
      type: 'ANALYSIS_STREAK',
      target: 7
    }
  },

  volatility_master: {
    id: 'volatility_master',
    name: 'Volatility Master',
    nameHi: 'अस्थिरता मास्टर',
    description: 'Analyze high volatility periods in 5 different stocks',
    descriptionHi: '5 अलग-अलग शेयरों में उच्च अस्थिरता अवधि का विश्लेषण करें',
    icon: '⚡',
    category: 'ANALYSIS',
    tier: 'GOLD',
    experiencePoints: 60,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 1200,
      description: 'Bonus ₹1,200 for mastering volatility!'
    },
    condition: {
      type: 'HIGH_VOLATILITY_ANALYZED',
      target: 5
    }
  },

  technical_analyst: {
    id: 'technical_analyst',
    name: 'Technical Analyst',
    nameHi: 'तकनीकी विश्लेषक',
    description: 'Complete comprehensive analysis of all 4 tracked companies',
    descriptionHi: 'सभी 4 ट्रैक की गई कंपनियों का व्यापक विश्लेषण पूरा करें',
    icon: '🔬',
    category: 'ANALYSIS',
    tier: 'PLATINUM',
    experiencePoints: 100,
    reward: {
      type: 'VIRTUAL_MONEY',
      amount: 2000,
      description: 'Bonus ₹2,000 for comprehensive analysis!'
    },
    condition: {
      type: 'ALL_COMPANIES_ANALYZED',
      target: 4
    }
  }
};

// Achievement categories for organization
const categories = {
  TRADING: {
    name: 'Trading',
    nameHi: 'व्यापार',
    icon: '📊',
    color: '#3b82f6'
  },
  PROFIT: {
    name: 'Profit',
    nameHi: 'मुनाफा',
    icon: '💰',
    color: '#10b981'
  },
  PORTFOLIO: {
    name: 'Portfolio',
    nameHi: 'पोर्टफोलियो',
    icon: '📈',
    color: '#8b5cf6'
  },
  STREAK: {
    name: 'Consistency',
    nameHi: 'निरंतरता',
    icon: '🔥',
    color: '#f59e0b'
  },
  MILESTONE: {
    name: 'Milestones',
    nameHi: 'लक्ष्य',
    icon: '🏆',
    color: '#ef4444'
  },
  ANALYSIS: {
    name: 'Analysis',
    nameHi: 'विश्लेषण',
    icon: '📊',
    color: '#06b6d4'
  }
};

// Tier information
const tiers = {
  BRONZE: {
    name: 'Bronze',
    nameHi: 'कांस्य',
    color: '#cd7f32',
    minXP: 0
  },
  SILVER: {
    name: 'Silver',
    nameHi: 'रजत',
    color: '#c0c0c0',
    minXP: 100
  },
  GOLD: {
    name: 'Gold',
    nameHi: 'स्वर्ण',
    color: '#ffd700',
    minXP: 500
  },
  PLATINUM: {
    name: 'Platinum',
    nameHi: 'प्लेटिनम',
    color: '#e5e4e2',
    minXP: 1000
  }
};

module.exports = {
  achievements,
  categories,
  tiers,
  getAllAchievements: () => Object.values(achievements),
  getAchievementById: (id) => achievements[id],
  getAchievementsByCategory: (category) => 
    Object.values(achievements).filter(a => a.category === category)
};

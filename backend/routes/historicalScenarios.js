const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const HistoricalScenarioService = require('../services/HistoricalScenarioService');
const HistoricalScenario = require('../models/HistoricalScenario');

const router = express.Router();
const historicalScenarioService = new HistoricalScenarioService();

/**
 * @route   GET /api/portfolio/historical-scenarios
 * @desc    Get all available historical scenarios
 * @access  Private
 */
router.get('/historical-scenarios', auth, async (req, res) => {
  try {
    const scenarios = await historicalScenarioService.getAvailableScenarios();
    
    res.json({
      success: true,
      data: {
        scenarios,
        count: scenarios.length,
        message: 'Historical scenarios fetched successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error fetching historical scenarios:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch historical scenarios'
    });
  }
});

/**
 * @route   GET /api/portfolio/scenario-analysis/:scenarioId
 * @desc    Get scenario analysis for user's current portfolio
 * @access  Private
 */
router.get('/scenario-analysis/:scenarioId', [
  auth,
  param('scenarioId')
    .isMongoId()
    .withMessage('Valid scenario ID is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { scenarioId } = req.params;
    const userId = req.user._id;

    console.log(`🔍 Analyzing scenario ${scenarioId} for user ${userId}`);

    const analysis = await historicalScenarioService.applyScenarioToPortfolio(scenarioId, userId);
    
    res.json({
      success: true,
      data: {
        ...analysis,
        timestamp: new Date(),
        message: 'Scenario analysis completed successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error in scenario analysis:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to analyze scenario impact on portfolio'
    });
  }
});

/**
 * @route   GET /api/portfolio/scenario-by-name/:eventName
 * @desc    Get scenario analysis by event name (easier for frontend)
 * @access  Private
 */
router.get('/scenario-by-name/:eventName', [
  auth,
  param('eventName')
    .notEmpty()
    .withMessage('Event name is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventName } = req.params;
    const userId = req.user._id;

    console.log(`🔍 Analyzing scenario ${eventName} for user ${userId}`);

    // Get or create scenario
    const scenario = await historicalScenarioService.getScenario(eventName);
    
    // Apply to user's portfolio
    const analysis = await historicalScenarioService.applyScenarioToPortfolio(scenario._id, userId);
    
    res.json({
      success: true,
      data: {
        ...analysis,
        scenarioId: scenario._id,
        timestamp: new Date(),
        message: 'Scenario analysis completed successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error in scenario analysis by name:', error);
    
    if (error.message.includes('Unknown scenario')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to analyze scenario impact on portfolio'
    });
  }
});

/**
 * @route   POST /api/portfolio/calculate-scenario
 * @desc    Calculate new scenario using Gemini (admin/development use)
 * @access  Private
 */
router.post('/calculate-scenario', [
  auth,
  body('eventName')
    .notEmpty()
    .withMessage('Event name is required'),
  body('eventDate')
    .isISO8601()
    .withMessage('Valid event date is required'),
  body('description')
    .notEmpty()
    .withMessage('Event description is required'),
  body('eventType')
    .isIn(['MARKET_CRASH', 'RECESSION', 'BUBBLE_BURST', 'CRISIS', 'RECOVERY'])
    .withMessage('Valid event type is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventName, eventDate, description, eventType } = req.body;

    console.log(`🤖 Creating new scenario: ${eventName}`);

    // Check if scenario already exists
    const existingScenario = await HistoricalScenario.findOne({ eventName });
    if (existingScenario) {
      return res.status(409).json({
        success: false,
        message: 'Scenario with this name already exists'
      });
    }

    // Create new scenario
    const scenario = new HistoricalScenario({
      eventName,
      eventDate: new Date(eventDate),
      description,
      eventType,
      sectorImpacts: [],
      stockImpacts: [],
      marketImpact: {
        overallMarketChange: 0,
        volatilityIncrease: 0,
        duration: '1_MONTH'
      },
      geminiCalculated: false,
      isActive: true,
      priority: 5
    });

    await scenario.save();

    // Calculate impacts using Gemini
    await historicalScenarioService.calculateScenarioImpacts(scenario);

    res.json({
      success: true,
      data: {
        scenario,
        message: 'Scenario created and calculated successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error creating scenario:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scenario'
    });
  }
});

/**
 * @route   POST /api/portfolio/recalculate-scenario/:scenarioId
 * @desc    Recalculate existing scenario using Gemini
 * @access  Private
 */
router.post('/recalculate-scenario/:scenarioId', [
  auth,
  param('scenarioId')
    .isMongoId()
    .withMessage('Valid scenario ID is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { scenarioId } = req.params;

    console.log(`🔄 Recalculating scenario: ${scenarioId}`);

    const scenario = await HistoricalScenario.findById(scenarioId);
    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'Scenario not found'
      });
    }

    // Reset calculation status and recalculate
    scenario.geminiCalculated = false;
    scenario.sectorImpacts = [];
    scenario.stockImpacts = [];
    await scenario.save();

    await historicalScenarioService.calculateScenarioImpacts(scenario);

    res.json({
      success: true,
      data: {
        scenario,
        message: 'Scenario recalculated successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error recalculating scenario:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate scenario'
    });
  }
});

/**
 * @route   GET /api/portfolio/scenario-details/:scenarioId
 * @desc    Get detailed scenario information
 * @access  Private
 */
router.get('/scenario-details/:scenarioId', [
  auth,
  param('scenarioId')
    .isMongoId()
    .withMessage('Valid scenario ID is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { scenarioId } = req.params;

    const scenario = await HistoricalScenario.findById(scenarioId);
    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'Scenario not found'
      });
    }

    res.json({
      success: true,
      data: {
        scenario,
        message: 'Scenario details fetched successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error fetching scenario details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scenario details'
    });
  }
});

/**
 * @route   GET /api/portfolio/scenario-service-status
 * @desc    Get historical scenario service status and statistics
 * @access  Private
 */
router.get('/scenario-service-status', auth, async (req, res) => {
  try {
    const status = await historicalScenarioService.getServiceStatus();
    
    res.json({
      success: true,
      data: {
        status,
        timestamp: new Date(),
        message: 'Service status fetched successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error fetching service status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service status'
    });
  }
});

/**
 * @route   POST /api/portfolio/initialize-scenarios
 * @desc    Initialize predefined scenarios (development/admin use)
 * @access  Private
 */
router.post('/initialize-scenarios', auth, async (req, res) => {
  try {
    console.log('🚀 Initializing predefined scenarios...');
    
    await historicalScenarioService.initializePredefinedScenarios();
    
    const scenarios = await historicalScenarioService.getAvailableScenarios();
    
    res.json({
      success: true,
      data: {
        scenarios,
        count: scenarios.length,
        message: 'Predefined scenarios initialized successfully'
      }
    });
  } catch (error) {
    console.error('❌ Error initializing scenarios:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize scenarios'
    });
  }
});

/**
 * @route   PUT /api/portfolio/scenario/:scenarioId/toggle-active
 * @desc    Toggle scenario active status
 * @access  Private
 */
router.put('/scenario/:scenarioId/toggle-active', [
  auth,
  param('scenarioId')
    .isMongoId()
    .withMessage('Valid scenario ID is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { scenarioId } = req.params;

    const scenario = await HistoricalScenario.findById(scenarioId);
    if (!scenario) {
      return res.status(404).json({
        success: false,
        message: 'Scenario not found'
      });
    }

    scenario.isActive = !scenario.isActive;
    await scenario.save();

    res.json({
      success: true,
      data: {
        scenario: {
          _id: scenario._id,
          eventName: scenario.eventName,
          isActive: scenario.isActive
        },
        message: `Scenario ${scenario.isActive ? 'activated' : 'deactivated'} successfully`
      }
    });
  } catch (error) {
    console.error('❌ Error toggling scenario status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle scenario status'
    });
  }
});

module.exports = router;

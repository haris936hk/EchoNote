/**
 * Test Script for Custom Model Integration
 *
 * Tests all admin endpoints and summarization functionality
 * Run: node tests/test-custom-model-integration.js
 */

const axios = require('axios');
const colors = require('colors'); // Optional: npm install colors for colored output

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api/admin`;

// Sample meeting transcript for testing
const SAMPLE_TRANSCRIPT = `MEETING TRANSCRIPT:
Okay everyone, let's get started with our Q3 review. Sarah, can you walk us through the numbers?

Sure thing. So looking at the dashboard, we're seeing revenue at $2.5M which is actually 15% above our target for the quarter. Our MRR is sitting at $830K with a healthy 5% month-over-month growth.

That's fantastic Sarah. What about customer metrics?

Customer count is at 450, up from 380 last quarter. Churn rate has dropped to 2.5% which is the lowest we've seen. NPS score is holding steady at 72.

Great work team. Now, we need to discuss the product roadmap for Q4. Mike, what are we looking at?

Well, we have three major initiatives. First is the mobile app redesign which should launch by October 15th. Second is the new analytics dashboard - that's about 60% complete. Third is the API v2 rollout.

Okay, let's make sure we have clear ownership. Mike, you'll lead the mobile redesign. Sarah, can you take the analytics dashboard? And I'll handle the API rollout with the engineering team.

Sounds good. We should also discuss the competitor analysis that came out last week.

Right. The TechCrunch article about CompetitorX raising $50M is concerning. We need to accelerate our feature development to stay ahead.

Agreed. Let's schedule a strategy session for next week to dive deeper into this. Everyone free Tuesday at 2pm?

Works for me.

Same here.

Perfect. Let's wrap up with action items. Mike - mobile redesign launch plan by Friday. Sarah - analytics dashboard progress update by Wednesday. I'll send out the strategy session invite for Tuesday.

Got it, thanks everyone!`;

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Helper: Make API request
 */
async function apiRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
        // Add auth token if needed: 'Authorization': 'Bearer your-token'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Helper: Log test result
 */
function logTest(name, passed, details = null) {
  const status = passed ? '✅ PASS'.green : '❌ FAIL'.red;
  console.log(`\n${status} - ${name}`);

  if (details) {
    console.log(JSON.stringify(details, null, 2).gray);
  }

  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

/**
 * Test 1: Get current configuration
 */
async function test1_getConfig() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: Get Summarization Configuration'.bold);
  console.log('='.repeat(80));

  const result = await apiRequest('GET', '/summarization/config');

  if (result.success && result.data.success) {
    logTest('Get Config', true, result.data.data);
    return result.data.data;
  } else {
    logTest('Get Config', false, result.error);
    return null;
  }
}

/**
 * Test 2: Check health of current provider
 */
async function test2_healthCheck() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Health Check (Current Provider)'.bold);
  console.log('='.repeat(80));

  const result = await apiRequest('GET', '/summarization/health');

  if (result.success && result.data.success) {
    logTest('Health Check', true, result.data.data);
  } else {
    logTest('Health Check', false, result.error);
  }
}

/**
 * Test 3: Check health of all providers
 */
async function test3_healthCheckAll() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: Health Check (All Providers)'.bold);
  console.log('='.repeat(80));

  const result = await apiRequest('GET', '/summarization/health/all');

  if (result.success && result.data.success) {
    logTest('Health Check All', true, result.data.data);
  } else {
    logTest('Health Check All', false, result.error);
  }
}

/**
 * Test 4: Test summarization with current provider
 */
async function test4_testSummarization(currentProvider) {
  console.log('\n' + '='.repeat(80));
  console.log(`TEST 4: Test Summarization (${currentProvider})`.bold);
  console.log('='.repeat(80));

  const result = await apiRequest('POST', '/summarization/test', {
    transcript: SAMPLE_TRANSCRIPT
  });

  if (result.success && result.data.success) {
    logTest('Test Summarization', true, {
      provider: result.data.data.metadata.provider,
      processingTime: result.data.data.metadata.processingTime,
      actionItems: result.data.data.summary.actionItems?.length || 0,
      keyTopics: result.data.data.summary.keyTopics?.length || 0,
      sentiment: result.data.data.summary.sentiment
    });
  } else {
    logTest('Test Summarization', false, result.error);
  }
}

/**
 * Test 5: Switch to custom provider
 */
async function test5_switchToCustom() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 5: Switch to Custom Provider'.bold);
  console.log('='.repeat(80));

  const result = await apiRequest('POST', '/summarization/switch', {
    provider: 'custom'
  });

  if (result.success && result.data.success) {
    logTest('Switch to Custom', true, result.data.data);
  } else {
    logTest('Switch to Custom', false, result.error);
  }
}

/**
 * Test 6: Test custom model summarization
 */
async function test6_testCustomModel() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 6: Test Custom Model Summarization'.bold);
  console.log('='.repeat(80));

  const result = await apiRequest('POST', '/summarization/test', {
    transcript: SAMPLE_TRANSCRIPT,
    provider: 'custom'
  });

  if (result.success && result.data.success) {
    logTest('Test Custom Model', true, {
      provider: result.data.data.metadata.provider,
      processingTime: result.data.data.metadata.processingTime,
      actionItems: result.data.data.summary.actionItems?.length || 0,
      keyTopics: result.data.data.summary.keyTopics?.length || 0,
      sentiment: result.data.data.summary.sentiment,
      executiveSummary: result.data.data.summary.executiveSummary?.substring(0, 100) + '...'
    });
  } else {
    logTest('Test Custom Model', false, result.error);
  }
}

/**
 * Test 7: Switch to Groq provider
 */
async function test7_switchToGroq() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 7: Switch to Groq Provider'.bold);
  console.log('='.repeat(80));

  const result = await apiRequest('POST', '/summarization/switch', {
    provider: 'groq'
  });

  if (result.success && result.data.success) {
    logTest('Switch to Groq', true, result.data.data);
  } else {
    logTest('Switch to Groq', false, result.error);
  }
}

/**
 * Test 8: Compare both providers
 */
async function test8_compareProviders() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 8: Compare Groq vs Custom Model'.bold);
  console.log('='.repeat(80));

  const result = await apiRequest('POST', '/summarization/compare', {
    transcript: SAMPLE_TRANSCRIPT
  });

  if (result.success && result.data.success) {
    logTest('Compare Providers', true, {
      groqSuccess: result.data.data.providers.groq.success,
      customSuccess: result.data.data.providers.custom.success,
      groqTime: result.data.data.providers.groq.processingTime,
      customTime: result.data.data.providers.custom.processingTime,
      comparison: result.data.data.comparison
    });

    // Detailed comparison
    console.log('\n📊 Detailed Comparison:'.bold);
    console.log('\nGroq Summary:'.yellow);
    console.log(JSON.stringify(result.data.data.providers.groq.data, null, 2));
    console.log('\nCustom Model Summary:'.cyan);
    console.log(JSON.stringify(result.data.data.providers.custom.data, null, 2));
  } else {
    logTest('Compare Providers', false, result.error);
  }
}

/**
 * Test 9: Update custom model URL
 */
async function test9_updateCustomUrl() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 9: Update Custom Model URL'.bold);
  console.log('='.repeat(80));

  // Use current URL from env or a test URL
  const testUrl = process.env.CUSTOM_MODEL_API_URL || 'https://test-domain.ngrok-free.app';

  const result = await apiRequest('PUT', '/summarization/custom-url', {
    url: testUrl
  });

  if (result.success && result.data.success) {
    logTest('Update Custom URL', true, result.data.data);
  } else {
    logTest('Update Custom URL', false, result.error);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗'.bold.cyan);
  console.log('║           ECHONOTE CUSTOM MODEL INTEGRATION TEST SUITE                   ║'.bold.cyan);
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝'.bold.cyan);
  console.log(`\nTesting against: ${BASE_URL}`.gray);
  console.log(`Start time: ${new Date().toISOString()}`.gray);

  try {
    // Run tests sequentially
    const config = await test1_getConfig();
    const currentProvider = config?.provider || 'unknown';

    await test2_healthCheck();
    await test3_healthCheckAll();
    await test4_testSummarization(currentProvider);
    await test5_switchToCustom();
    await test6_testCustomModel();
    await test7_switchToGroq();
    await test8_compareProviders();
    await test9_updateCustomUrl();

    // Print summary
    console.log('\n\n');
    console.log('╔═══════════════════════════════════════════════════════════════════════════╗'.bold);
    console.log('║                            TEST SUMMARY                                   ║'.bold);
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝'.bold);

    console.log(`\n✅ Passed: ${results.passed}`.green.bold);
    console.log(`❌ Failed: ${results.failed}`.red.bold);
    console.log(`📊 Total: ${results.tests.length}`.blue.bold);

    const successRate = ((results.passed / results.tests.length) * 100).toFixed(1);
    console.log(`\n📈 Success Rate: ${successRate}%`.cyan.bold);

    console.log(`\nEnd time: ${new Date().toISOString()}`.gray);

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Fatal error during test execution:'.red.bold);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();

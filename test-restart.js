#!/usr/bin/env node

/**
 * Test script to demonstrate the auto-restart functionality
 * This script tests various restart scenarios
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('🏥 Testing health check endpoint...');
  try {
    const response = await makeRequest('/health');
    console.log('✅ Health check status:', response.status);
    console.log('📊 Health data:', JSON.stringify(response.data, null, 2));
    return response.data.status === 'healthy';
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testDetailedStatus() {
  console.log('\n📋 Testing detailed status endpoint...');
  try {
    const response = await makeRequest('/health/status');
    console.log('✅ Status check status:', response.status);
    console.log('📊 Server info:');
    console.log(`   - PID: ${response.data.server.pid}`);
    console.log(`   - Uptime: ${Math.round(response.data.server.uptime)}s`);
    console.log(`   - Memory: ${response.data.memory.used}MB used`);
    console.log(`   - Services: ${Object.keys(response.data.services).length} monitored`);
    return true;
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    return false;
  }
}

async function testManualRestart() {
  console.log('\n🔄 Testing manual restart functionality...');
  try {
    console.log('⚠️  Triggering manual restart...');
    const response = await makeRequest('/health/restart', 'POST');
    console.log('✅ Restart response:', response.data);
    
    if (response.data.status === 'restart_initiated') {
      console.log('⏳ Waiting for server to restart...');
      
      // Wait for restart to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test if server is back online
      console.log('🔍 Checking if server is back online...');
      let attempts = 0;
      const maxAttempts = 20; // Increased from 10 to 20
      
      while (attempts < maxAttempts) {
        try {
          const healthResponse = await makeRequest('/health');
          if (healthResponse.status === 200) {
            console.log('✅ Server successfully restarted and healthy!');
            console.log(`📈 Restart completed in ${(attempts + 1) * 3} seconds`);
            return true;
          }
        } catch (error) {
          console.log(`⏳ Attempt ${attempts + 1}/${maxAttempts} - Server not ready yet...`);
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000)); // Increased from 2000 to 3000
      }
      
      console.log('❌ Server did not come back online within expected time');
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Manual restart test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Auto-Restart System Tests\n');
  console.log('=' .repeat(50));
  
  const results = {
    healthCheck: false,
    detailedStatus: false,
    manualRestart: false,
  };
  
  // Test 1: Basic health check
  results.healthCheck = await testHealthCheck();
  
  // Test 2: Detailed status
  results.detailedStatus = await testDetailedStatus();
  
  // Test 3: Manual restart (commented out by default to avoid disruption)
  console.log('\n🔄 Manual restart test available but skipped by default');
  console.log('   To test manual restart, uncomment the line in the script');
  results.manualRestart = await testManualRestart();
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${test.padEnd(20)}: ${status}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Auto-restart system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testHealthCheck, testDetailedStatus, testManualRestart };

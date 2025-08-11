/**
 * Test script to demonstrate LibCal token expiration issues
 * This script simulates the token problems identified in the analysis
 */

const axios = require('axios');

class LibCalTokenTester {
  constructor() {
    this.tokenCreatedAt = null;
    this.accessToken = null;
    this.TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour as per API docs
  }

  // Simulate current implementation - no expiration tracking
  async getCurrentImplementationBehavior() {
    console.log('\n=== Testing Current Implementation Behavior ===');
    
    // Simulate token created 1 hour ago (expired)
    this.tokenCreatedAt = Date.now() - (61 * 60 * 1000); // 61 minutes ago
    this.accessToken = 'expired_token_example';
    
    console.log(`Token created: ${new Date(this.tokenCreatedAt).toISOString()}`);
    console.log(`Current time: ${new Date().toISOString()}`);
    console.log(`Token age: ${Math.floor((Date.now() - this.tokenCreatedAt) / (60 * 1000))} minutes`);
    
    // Current implementation would use expired token until 403 error
    const isExpired = this.isTokenExpired();
    console.log(`Token expired: ${isExpired}`);
    console.log(`Current implementation would: ${isExpired ? 'Use expired token until API fails' : 'Use valid token'}`);
    
    return isExpired;
  }

  // Simulate improved implementation with expiration tracking
  async getImprovedImplementationBehavior() {
    console.log('\n=== Testing Improved Implementation Behavior ===');
    
    const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry
    const timeUntilExpiry = this.getTimeUntilExpiry();
    const shouldRefresh = timeUntilExpiry < REFRESH_BUFFER_MS;
    
    console.log(`Time until expiry: ${Math.floor(timeUntilExpiry / (60 * 1000))} minutes`);
    console.log(`Should refresh proactively: ${shouldRefresh}`);
    console.log(`Improved implementation would: ${shouldRefresh ? 'Refresh token proactively' : 'Continue using current token'}`);
    
    return shouldRefresh;
  }

  // Test concurrent request scenario
  async testConcurrentRequestScenario() {
    console.log('\n=== Testing Concurrent Request Scenario ===');
    
    // Simulate 5 LibCal tools making requests simultaneously with expired token
    const tools = ['CheckRoomAvailability', 'ReserveRoom', 'CancelReservation', 'CheckOpenHour', 'SearchRooms'];
    
    console.log('Simulating concurrent requests with expired token...');
    tools.forEach((tool, index) => {
      setTimeout(() => {
        console.log(`${tool}: Detected 403 error, calling resetToken()`);
        // In current implementation, all would call resetToken() simultaneously
      }, index * 10); // Slight delay to simulate near-simultaneous requests
    });
    
    // Wait for simulation
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Result: Multiple unnecessary token requests generated');
    console.log('Risk: Could hit rate limit (25 req/sec) or generate token conflicts');
  }

  // Helper methods
  isTokenExpired() {
    if (!this.tokenCreatedAt) return true;
    return (Date.now() - this.tokenCreatedAt) > this.TOKEN_LIFETIME_MS;
  }

  getTimeUntilExpiry() {
    if (!this.tokenCreatedAt) return 0;
    const expiryTime = this.tokenCreatedAt + this.TOKEN_LIFETIME_MS;
    return Math.max(0, expiryTime - Date.now());
  }

  // Test the actual OAuth response structure
  simulateOAuthResponse() {
    console.log('\n=== OAuth Response Analysis ===');
    
    // Typical OAuth response includes expires_in
    const mockOAuthResponse = {
      access_token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
      token_type: "Bearer",
      expires_in: 3600, // 1 hour in seconds
      scope: "read write"
    };
    
    console.log('Typical OAuth response structure:');
    console.log(JSON.stringify(mockOAuthResponse, null, 2));
    
    console.log('\nCurrent implementation only extracts: access_token');
    console.log('Missing: expires_in field for expiration tracking');
    
    return mockOAuthResponse;
  }
}

// Run the tests
async function runTests() {
  const tester = new LibCalTokenTester();
  
  console.log('LibCal Token Expiration Issue Analysis');
  console.log('=====================================');
  
  await tester.getCurrentImplementationBehavior();
  await tester.getImprovedImplementationBehavior();
  await tester.testConcurrentRequestScenario();
  tester.simulateOAuthResponse();
  
  console.log('\n=== Summary of Issues ===');
  console.log('1. ❌ No token expiration tracking (1-hour lifetime ignored)');
  console.log('2. ❌ Reactive token refresh only (waits for 403 errors)');
  console.log('3. ❌ Race conditions in concurrent scenarios');
  console.log('4. ❌ Missing expires_in field handling from OAuth response');
  console.log('5. ❌ Potential rate limit violations (25 req/sec)');
  
  console.log('\n=== Recommended Fixes ===');
  console.log('1. ✅ Track token expiration time from OAuth response');
  console.log('2. ✅ Implement proactive token refresh (5 min before expiry)');
  console.log('3. ✅ Use BehaviorSubject for immediate token synchronization');
  console.log('4. ✅ Add token validation before API calls');
  console.log('5. ✅ Implement proper async/await in retry logic');
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = LibCalTokenTester;

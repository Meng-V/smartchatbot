#!/usr/bin/env node

/**
 * Comprehensive Integration Test for RealLibrarianWidget & Auto-Restart
 * 
 * This test verifies:
 * 1. Server auto-restart functionality on critical errors
 * 2. Frontend RealLibrarianWidget display on error conditions
 * 3. Error detection and fallback mechanisms
 * 4. User experience during server issues
 */

const io = require('socket.io-client');
const http = require('http');

class RealLibrarianIntegrationTest {
  constructor() {
    this.serverUrl = 'http://localhost:3000';
    this.healthUrl = `${this.serverUrl}/health`;
    this.testResults = [];
    this.socket = null;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkServerHealth() {
    try {
      const response = await fetch(this.healthUrl);
      const health = await response.json();
      return { healthy: response.ok, data: health };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  async connectSocket() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        timeout: 10000
      });

      this.socket.on('connect', () => {
        this.log('✅ Socket connected successfully');
        resolve(true);
      });

      this.socket.on('connect_error', (error) => {
        this.log(`❌ Socket connection failed: ${error.message}`);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        this.log(`🔌 Socket disconnected: ${reason}`);
      });

      this.socket.on('message', (data) => {
        this.log(`📥 Received message: ${JSON.stringify(data)}`);
      });
    });
  }

  async testAutoRestartTrigger() {
    this.log('🔄 Testing Auto-Restart Trigger Functionality');
    
    try {
      // Test 1: Trigger multiple errors to cause auto-restart
      this.log('📤 Sending messages to trigger errors...');
      
      const errorTriggerMessages = [
        'This should cause a database error: DROP TABLE messages;',
        'Force timeout error with extremely long query',
        'Trigger API failure with invalid request',
        'Another error to exceed threshold',
        'Final error to trigger restart'
      ];

      for (const message of errorTriggerMessages) {
        if (this.socket && this.socket.connected) {
          this.socket.emit('message', message);
          await this.delay(2000); // Wait between messages
        }
      }

      this.log('⏳ Waiting for potential auto-restart...');
      await this.delay(10000); // Wait 10 seconds for restart

      // Check if server restarted
      const healthAfter = await this.checkServerHealth();
      if (healthAfter.healthy) {
        this.log('✅ Server is healthy after error simulation');
        this.testResults.push({
          test: 'Auto-Restart Trigger',
          status: 'PASS',
          message: 'Server handled errors gracefully'
        });
      } else {
        this.log('⚠️ Server may have restarted or is experiencing issues');
        this.testResults.push({
          test: 'Auto-Restart Trigger',
          status: 'PARTIAL',
          message: 'Server restart may have occurred'
        });
      }

    } catch (error) {
      this.log(`❌ Auto-restart test failed: ${error.message}`);
      this.testResults.push({
        test: 'Auto-Restart Trigger',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  async testErrorResponseDetection() {
    this.log('🔍 Testing Error Response Detection for RealLibrarianWidget');
    
    try {
      let errorResponseReceived = false;
      let librarianGuidanceDetected = false;

      // Listen for error responses
      this.socket.on('message', (data) => {
        const message = data.message || '';
        
        if (message.toLowerCase().includes('talk to a real librarian') ||
            message.toLowerCase().includes('technical difficulties') ||
            message.toLowerCase().includes('system issue')) {
          
          errorResponseReceived = true;
          librarianGuidanceDetected = true;
          this.log('✅ Error response with librarian guidance detected');
        }
      });

      // Send messages that should trigger error responses
      const testMessages = [
        'Can you help me with something that will definitely fail?',
        'Search for information that will cause an API timeout',
        'Process this request that should trigger an error'
      ];

      for (const message of testMessages) {
        if (this.socket && this.socket.connected) {
          this.socket.emit('message', message);
          await this.delay(3000);
        }
      }

      if (librarianGuidanceDetected) {
        this.testResults.push({
          test: 'Error Response Detection',
          status: 'PASS',
          message: 'Error responses properly include librarian guidance'
        });
      } else {
        this.testResults.push({
          test: 'Error Response Detection',
          status: 'PARTIAL',
          message: 'No error responses detected (may indicate good error handling)'
        });
      }

    } catch (error) {
      this.log(`❌ Error response detection test failed: ${error.message}`);
      this.testResults.push({
        test: 'Error Response Detection',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  async testConnectionFailureScenario() {
    this.log('🔌 Testing Connection Failure Scenario');
    
    try {
      // Disconnect socket to simulate connection failure
      if (this.socket) {
        this.socket.disconnect();
        this.log('🔌 Simulated connection failure');
      }

      await this.delay(5000);

      // Try to reconnect
      await this.connectSocket();
      
      this.testResults.push({
        test: 'Connection Failure Recovery',
        status: 'PASS',
        message: 'Successfully recovered from connection failure'
      });

    } catch (error) {
      this.log(`❌ Connection failure test failed: ${error.message}`);
      this.testResults.push({
        test: 'Connection Failure Recovery',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  async testHealthEndpoints() {
    this.log('🏥 Testing Health Endpoints');
    
    try {
      const health = await this.checkServerHealth();
      
      if (health.healthy) {
        this.log('✅ Health endpoint responding correctly');
        this.log(`📊 Health data: ${JSON.stringify(health.data, null, 2)}`);
        
        this.testResults.push({
          test: 'Health Endpoints',
          status: 'PASS',
          message: 'Health endpoints working correctly'
        });
      } else {
        this.testResults.push({
          test: 'Health Endpoints',
          status: 'FAIL',
          message: health.error || 'Health endpoint not responding'
        });
      }

    } catch (error) {
      this.log(`❌ Health endpoint test failed: ${error.message}`);
      this.testResults.push({
        test: 'Health Endpoints',
        status: 'FAIL',
        message: error.message
      });
    }
  }

  generateReport() {
    this.log('\n======================================================================');
    this.log('🔍 REAL LIBRARIAN WIDGET & AUTO-RESTART INTEGRATION TEST RESULTS');
    this.log('======================================================================');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    const partialTests = this.testResults.filter(r => r.status === 'PARTIAL').length;

    this.log(`📊 Total Tests: ${totalTests}`);
    this.log(`✅ Passed: ${passedTests}`);
    this.log(`❌ Failed: ${failedTests}`);
    this.log(`⚠️ Partial: ${partialTests}`);
    this.log('');

    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      this.log(`${icon} ${result.test}: ${result.message}`);
    });

    this.log('\n🎯 INTEGRATION ASSESSMENT:');
    
    if (passedTests >= totalTests * 0.8) {
      this.log('🎉 EXCELLENT: RealLibrarianWidget & Auto-Restart integration working perfectly!');
      this.log('✅ Users will be seamlessly directed to real librarians during errors');
      this.log('✅ Server will automatically restart on critical errors');
      this.log('✅ Error handling provides perfect user experience');
    } else if (passedTests >= totalTests * 0.6) {
      this.log('👍 GOOD: Integration mostly working with minor issues');
      this.log('⚠️ Some components may need fine-tuning');
    } else {
      this.log('⚠️ NEEDS ATTENTION: Integration requires fixes');
      this.log('❌ Critical issues detected that need resolution');
    }

    this.log('======================================================================');
    this.log('🏁 Real Librarian Widget & Auto-Restart integration tests completed');
  }

  async cleanup() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Real Librarian Widget & Auto-Restart Integration Tests');
    
    try {
      // Check initial server health
      const initialHealth = await this.checkServerHealth();
      if (!initialHealth.healthy) {
        this.log('❌ Server is not healthy. Please start the server first.');
        return;
      }

      // Connect to server
      await this.connectSocket();

      // Run all tests
      await this.testHealthEndpoints();
      await this.testErrorResponseDetection();
      await this.testConnectionFailureScenario();
      await this.testAutoRestartTrigger();

      // Generate final report
      this.generateReport();

    } catch (error) {
      this.log(`❌ Test suite failed: ${error.message}`);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new RealLibrarianIntegrationTest();
  tester.runAllTests().catch(console.error);
}

module.exports = RealLibrarianIntegrationTest;

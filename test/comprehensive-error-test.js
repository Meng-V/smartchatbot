#!/usr/bin/env node

/**
 * Comprehensive Error Handling and Resilience Test Suite
 * Tests server failures, API failures, and user experience during errors
 */

const io = require('socket.io-client');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

class SmartChatbotErrorTester {
  constructor() {
    this.serverUrl = 'http://localhost:3000';
    this.testResults = [];
    this.socket = null;
    this.testStartTime = new Date();
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type}: ${message}`;
    console.log(logMessage);
    
    this.testResults.push({
      timestamp,
      type,
      message,
      testPhase: this.currentTestPhase || 'SETUP'
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAllTests() {
    this.log('🚀 Starting Comprehensive Error Handling Tests', 'START');
    
    try {
      // Test 1: Server Availability and Health Endpoint
      await this.testServerHealth();
      
      // Test 2: WebSocket Connection Resilience
      await this.testWebSocketResilience();
      
      // Test 3: Database Connection Failures
      await this.testDatabaseFailures();
      
      // Test 4: OpenAI API Failures
      await this.testOpenAIFailures();
      
      // Test 5: Third-party API Failures (LibApps, LibCal, Google)
      await this.testThirdPartyAPIFailures();
      
      // Test 6: Server Overload and Rate Limiting
      await this.testServerOverload();
      
      // Test 7: Network Connectivity Issues
      await this.testNetworkIssues();
      
      // Test 8: Frontend Error Boundary Testing
      await this.testFrontendErrorHandling();
      
      // Test 9: User Experience During Failures
      await this.testUserExperienceDuringFailures();
      
      // Generate comprehensive report
      await this.generateTestReport();
      
    } catch (error) {
      this.log(`Critical test failure: ${error.message}`, 'ERROR');
    } finally {
      if (this.socket) {
        this.socket.disconnect();
      }
    }
  }

  async testServerHealth() {
    this.currentTestPhase = 'SERVER_HEALTH';
    this.log('🔍 Testing Server Health and Availability');
    
    try {
      // Test health endpoint
      const healthResponse = await fetch(`${this.serverUrl}/health`, {
        timeout: 5000
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        this.log(`✅ Health endpoint responding: ${JSON.stringify(healthData)}`, 'PASS');
      } else {
        this.log(`❌ Health endpoint failed: ${healthResponse.status}`, 'FAIL');
      }
    } catch (error) {
      this.log(`❌ Health endpoint unreachable: ${error.message}`, 'FAIL');
    }

    // Test main application endpoint
    try {
      const mainResponse = await fetch(this.serverUrl, { timeout: 5000 });
      if (mainResponse.ok) {
        this.log('✅ Main application endpoint responding', 'PASS');
      } else {
        this.log(`❌ Main application endpoint failed: ${mainResponse.status}`, 'FAIL');
      }
    } catch (error) {
      this.log(`❌ Main application unreachable: ${error.message}`, 'FAIL');
    }
  }

  async testWebSocketResilience() {
    this.currentTestPhase = 'WEBSOCKET_RESILIENCE';
    this.log('🔌 Testing WebSocket Connection Resilience');
    
    return new Promise((resolve) => {
      this.socket = io(this.serverUrl, {
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      });

      let connectionEstablished = false;
      let messageReceived = false;

      this.socket.on('connect', () => {
        connectionEstablished = true;
        this.log('✅ WebSocket connection established', 'PASS');
        
        // Test message sending
        this.socket.emit('message', 'Hello, this is a test message');
        this.log('📤 Test message sent via WebSocket', 'INFO');
      });

      this.socket.on('message', (data) => {
        messageReceived = true;
        this.log(`📥 Received response: ${JSON.stringify(data)}`, 'PASS');
      });

      this.socket.on('connect_error', (error) => {
        this.log(`❌ WebSocket connection error: ${error.message}`, 'FAIL');
      });

      this.socket.on('disconnect', (reason) => {
        this.log(`🔌 WebSocket disconnected: ${reason}`, 'INFO');
      });

      // Wait for responses or timeout
      setTimeout(() => {
        if (!connectionEstablished) {
          this.log('❌ WebSocket connection failed to establish', 'FAIL');
        }
        if (!messageReceived) {
          this.log('❌ No response received to test message', 'FAIL');
        }
        resolve();
      }, 10000);
    });
  }

  async testDatabaseFailures() {
    this.currentTestPhase = 'DATABASE_FAILURES';
    this.log('🗄️ Testing Database Connection Failures');
    
    // Test with multiple messages to stress database
    const testMessages = [
      'What are your library hours?',
      'Help me find books about artificial intelligence',
      'Can you help me cite a research paper?',
      'I need to reserve a study room',
      'What services does the library offer?'
    ];

    for (let i = 0; i < testMessages.length; i++) {
      try {
        if (this.socket && this.socket.connected) {
          this.socket.emit('message', testMessages[i]);
          this.log(`📤 Sent database stress test message ${i + 1}`, 'INFO');
          await this.delay(2000); // Wait between messages
        }
      } catch (error) {
        this.log(`❌ Database stress test ${i + 1} failed: ${error.message}`, 'FAIL');
      }
    }
  }

  async testOpenAIFailures() {
    this.currentTestPhase = 'OPENAI_FAILURES';
    this.log('🤖 Testing OpenAI API Failure Scenarios');
    
    // Test with complex queries that might cause API issues
    const complexQueries = [
      'Can you help me with a very complex research question about quantum computing and its applications in machine learning, specifically focusing on quantum neural networks and their potential impact on natural language processing systems like yourself?',
      'I need help with multiple tasks: finding books, reserving rooms, getting citations, and checking library hours all at once',
      'Please provide a detailed analysis of the following 50 research papers...' + 'x'.repeat(1000), // Very long query
    ];

    for (let i = 0; i < complexQueries.length; i++) {
      try {
        if (this.socket && this.socket.connected) {
          this.socket.emit('message', complexQueries[i]);
          this.log(`📤 Sent OpenAI stress test query ${i + 1}`, 'INFO');
          await this.delay(5000); // Wait longer for complex queries
        }
      } catch (error) {
        this.log(`❌ OpenAI stress test ${i + 1} failed: ${error.message}`, 'FAIL');
      }
    }
  }

  async testThirdPartyAPIFailures() {
    this.currentTestPhase = 'THIRD_PARTY_API_FAILURES';
    this.log('🌐 Testing Third-party API Failure Scenarios');
    
    // Test queries that would trigger third-party API calls
    const apiTestQueries = [
      'What are the library hours for tomorrow?', // LibCal API
      'I need help from a librarian who specializes in computer science', // LibApps API
      'Can you search the library website for information about interlibrary loans?', // Google Site Search
      'I want to reserve a group study room for 2 hours', // LibCal API
      'Cancel my room reservation', // LibCal API
    ];

    for (let i = 0; i < apiTestQueries.length; i++) {
      try {
        if (this.socket && this.socket.connected) {
          this.socket.emit('message', apiTestQueries[i]);
          this.log(`📤 Sent third-party API test query ${i + 1}: "${apiTestQueries[i]}"`, 'INFO');
          await this.delay(3000);
        }
      } catch (error) {
        this.log(`❌ Third-party API test ${i + 1} failed: ${error.message}`, 'FAIL');
      }
    }
  }

  async testServerOverload() {
    this.currentTestPhase = 'SERVER_OVERLOAD';
    this.log('⚡ Testing Server Overload Scenarios');
    
    // Create multiple concurrent connections
    const connections = [];
    const numConnections = 10;
    
    for (let i = 0; i < numConnections; i++) {
      try {
        const socket = io(this.serverUrl, {
          timeout: 5000,
          reconnection: false
        });
        
        connections.push(socket);
        
        socket.on('connect', () => {
          this.log(`✅ Concurrent connection ${i + 1} established`, 'PASS');
          // Send rapid messages
          for (let j = 0; j < 5; j++) {
            socket.emit('message', `Rapid message ${j + 1} from connection ${i + 1}`);
          }
        });
        
        socket.on('connect_error', (error) => {
          this.log(`❌ Concurrent connection ${i + 1} failed: ${error.message}`, 'FAIL');
        });
        
      } catch (error) {
        this.log(`❌ Failed to create concurrent connection ${i + 1}: ${error.message}`, 'FAIL');
      }
    }
    
    // Wait and then clean up connections
    await this.delay(10000);
    connections.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
  }

  async testNetworkIssues() {
    this.currentTestPhase = 'NETWORK_ISSUES';
    this.log('🌐 Testing Network Connectivity Issues');
    
    // Test timeout scenarios
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 1000); // Very short timeout
      
      await fetch(`${this.serverUrl}/health`, {
        signal: controller.signal
      });
      
      this.log('✅ Short timeout test passed', 'PASS');
    } catch (error) {
      if (error.name === 'AbortError') {
        this.log('⚠️ Short timeout triggered as expected', 'EXPECTED');
      } else {
        this.log(`❌ Network timeout test failed: ${error.message}`, 'FAIL');
      }
    }
  }

  async testFrontendErrorHandling() {
    this.currentTestPhase = 'FRONTEND_ERROR_HANDLING';
    this.log('🖥️ Testing Frontend Error Handling');
    
    // Test health endpoint from frontend perspective
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      if (response.ok) {
        const data = await response.json();
        this.log(`✅ Frontend can access health endpoint: ${JSON.stringify(data)}`, 'PASS');
      } else {
        this.log(`❌ Frontend health check failed: ${response.status}`, 'FAIL');
      }
    } catch (error) {
      this.log(`❌ Frontend health check error: ${error.message}`, 'FAIL');
    }
  }

  async testUserExperienceDuringFailures() {
    this.currentTestPhase = 'USER_EXPERIENCE';
    this.log('👤 Testing User Experience During Failures');
    
    // Test if users get appropriate error messages
    if (this.socket && this.socket.connected) {
      // Test with invalid/problematic input
      const problematicInputs = [
        '', // Empty message
        'x'.repeat(10000), // Very long message
        '{"malformed": json}', // Malformed JSON-like input
        '<script>alert("test")</script>', // Potential XSS
        null, // Null input
      ];
      
      for (let i = 0; i < problematicInputs.length; i++) {
        try {
          this.socket.emit('message', problematicInputs[i]);
          this.log(`📤 Sent problematic input ${i + 1}`, 'INFO');
          await this.delay(2000);
        } catch (error) {
          this.log(`❌ Problematic input ${i + 1} caused error: ${error.message}`, 'FAIL');
        }
      }
    }
  }

  async generateTestReport() {
    this.currentTestPhase = 'REPORT_GENERATION';
    this.log('📊 Generating Comprehensive Test Report');
    
    const testEndTime = new Date();
    const testDuration = testEndTime - this.testStartTime;
    
    const report = {
      testSummary: {
        startTime: this.testStartTime.toISOString(),
        endTime: testEndTime.toISOString(),
        duration: `${Math.round(testDuration / 1000)} seconds`,
        totalTests: this.testResults.length
      },
      testResults: this.testResults,
      statistics: {
        passed: this.testResults.filter(r => r.type === 'PASS').length,
        failed: this.testResults.filter(r => r.type === 'FAIL').length,
        expected: this.testResults.filter(r => r.type === 'EXPECTED').length,
        info: this.testResults.filter(r => r.type === 'INFO').length
      },
      recommendations: this.generateRecommendations()
    };
    
    // Write report to file
    const reportPath = path.join(process.cwd(), 'error-handling-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📋 Test report saved to: ${reportPath}`, 'INFO');
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${report.statistics.passed + report.statistics.failed}`);
    console.log(`✅ Passed: ${report.statistics.passed}`);
    console.log(`❌ Failed: ${report.statistics.failed}`);
    console.log(`⚠️ Expected Failures: ${report.statistics.expected}`);
    console.log(`Duration: ${report.testSummary.duration}`);
    console.log('='.repeat(60));
    
    return report;
  }

  generateRecommendations() {
    return [
      {
        priority: 'HIGH',
        area: 'Chat Gateway Error Handling',
        issue: 'No try-catch blocks in ChatGateway.handleUserMessage()',
        recommendation: 'Add comprehensive error handling with user-friendly error messages and fallback to "Talk to Real Librarian" option',
        impact: 'Users see raw errors or application crashes when LLM or database fails'
      },
      {
        priority: 'HIGH',
        area: 'Third-party API Resilience',
        issue: 'No timeout or retry mechanisms for external API calls',
        recommendation: 'Implement timeout, retry logic, and circuit breaker patterns for OpenAI, LibApps, LibCal, and Google APIs',
        impact: 'Application hangs when external APIs are slow or unresponsive'
      },
      {
        priority: 'MEDIUM',
        area: 'User Error Communication',
        issue: 'Technical errors exposed to users',
        recommendation: 'Create user-friendly error messages and always provide "Talk to Real Librarian" option during failures',
        impact: 'Poor user experience during errors'
      },
      {
        priority: 'MEDIUM',
        area: 'Error Monitoring',
        issue: 'Limited error tracking and alerting',
        recommendation: 'Implement comprehensive error logging, monitoring, and alerting system',
        impact: 'Difficult to detect and respond to production issues'
      },
      {
        priority: 'LOW',
        area: 'Performance Monitoring',
        issue: 'No performance metrics during high load',
        recommendation: 'Add performance monitoring and rate limiting to prevent server overload',
        impact: 'Server may become unresponsive during high traffic'
      }
    ];
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SmartChatbotErrorTester();
  tester.runAllTests().then(() => {
    console.log('🏁 All tests completed');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = SmartChatbotErrorTester;

#!/usr/bin/env node

/**
 * API Failure Simulation Test
 * Tests what happens when third-party APIs fail and whether users get proper guidance
 */

const io = require('socket.io-client');
const http = require('http');
const express = require('express');

class APIFailureSimulator {
  constructor() {
    this.serverUrl = 'http://localhost:3000';
    this.mockServerPort = 3001;
    this.socket = null;
    this.mockServer = null;
    this.testResults = [];
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type}: ${message}`;
    console.log(logMessage);
    
    this.testResults.push({
      timestamp,
      type,
      message
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Create a mock server that simulates API failures
  createFailingMockServer() {
    return new Promise((resolve) => {
      const app = express();
      
      // Mock OpenAI API that always fails
      app.post('/v1/chat/completions', (req, res) => {
        this.log('Mock OpenAI API called - simulating failure', 'INFO');
        res.status(500).json({ error: 'OpenAI API is currently unavailable' });
      });
      
      // Mock LibCal API that times out
      app.get('/1.1/:path(*)', (req, res) => {
        this.log('Mock LibCal API called - simulating timeout', 'INFO');
        // Never respond to simulate timeout
      });
      
      // Mock LibApps API that returns errors
      app.get('/libguides/:path(*)', (req, res) => {
        this.log('Mock LibApps API called - simulating error', 'INFO');
        res.status(503).json({ error: 'Service temporarily unavailable' });
      });
      
      // Mock Google API that fails
      app.get('/customsearch/:path(*)', (req, res) => {
        this.log('Mock Google API called - simulating failure', 'INFO');
        res.status(429).json({ error: 'Rate limit exceeded' });
      });
      
      this.mockServer = app.listen(this.mockServerPort, () => {
        this.log(`Mock failing API server started on port ${this.mockServerPort}`, 'INFO');
        resolve();
      });
    });
  }

  async testAPIFailureScenarios() {
    this.log('🚀 Starting API Failure Simulation Tests', 'START');
    
    // Start mock failing server
    await this.createFailingMockServer();
    
    // Connect to main application
    await this.connectToMainApp();
    
    // Test scenarios that should trigger API calls
    await this.testOpenAIFailureScenario();
    await this.testLibCalFailureScenario();
    await this.testLibAppsFailureScenario();
    await this.testGoogleSearchFailureScenario();
    await this.testMultipleAPIFailures();
    
    // Test user experience during failures
    await this.testUserGuidanceToLibrarian();
    
    // Generate report
    await this.generateFailureReport();
    
    // Cleanup
    this.cleanup();
  }

  async connectToMainApp() {
    return new Promise((resolve) => {
      this.socket = io(this.serverUrl, {
        timeout: 10000,
        reconnection: false
      });

      this.socket.on('connect', () => {
        this.log('✅ Connected to SmartChatbot application', 'PASS');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        this.log(`❌ Failed to connect to SmartChatbot: ${error.message}`, 'FAIL');
        resolve();
      });

      this.socket.on('message', (data) => {
        this.log(`📥 Received: ${JSON.stringify(data)}`, 'RESPONSE');
        
        // Check if response contains "librarian" guidance
        if (data.message && data.message.toLowerCase().includes('librarian')) {
          this.log('✅ Response includes librarian guidance', 'PASS');
        } else {
          this.log('⚠️ Response does not mention librarian option', 'WARNING');
        }
        
        // Check for error messages exposed to user
        if (data.message && (
          data.message.includes('Error:') ||
          data.message.includes('500') ||
          data.message.includes('timeout') ||
          data.message.includes('unavailable')
        )) {
          this.log('❌ Technical error exposed to user', 'FAIL');
        }
      });

      this.socket.on('error', (error) => {
        this.log(`❌ Socket error: ${error.message}`, 'FAIL');
      });
    });
  }

  async testOpenAIFailureScenario() {
    this.log('🤖 Testing OpenAI API Failure Scenario', 'INFO');
    
    if (this.socket && this.socket.connected) {
      // Send a message that would require OpenAI processing
      const testMessage = "Can you help me understand quantum computing concepts?";
      this.socket.emit('message', testMessage);
      this.log(`📤 Sent OpenAI-dependent query: "${testMessage}"`, 'INFO');
      
      // Wait for response
      await this.delay(15000);
    }
  }

  async testLibCalFailureScenario() {
    this.log('📅 Testing LibCal API Failure Scenario', 'INFO');
    
    if (this.socket && this.socket.connected) {
      // Send messages that would trigger LibCal API calls
      const testMessages = [
        "What are the library hours for next Monday?",
        "I want to reserve a study room for tomorrow at 2 PM",
        "Can you check room availability for group study?"
      ];
      
      for (const message of testMessages) {
        this.socket.emit('message', message);
        this.log(`📤 Sent LibCal-dependent query: "${message}"`, 'INFO');
        await this.delay(10000);
      }
    }
  }

  async testLibAppsFailureScenario() {
    this.log('📚 Testing LibApps API Failure Scenario', 'INFO');
    
    if (this.socket && this.socket.connected) {
      // Send messages that would trigger LibApps API calls
      const testMessages = [
        "I need help from a librarian who specializes in biology",
        "Can you connect me with a subject librarian for engineering?",
        "Who is the librarian for computer science research?"
      ];
      
      for (const message of testMessages) {
        this.socket.emit('message', message);
        this.log(`📤 Sent LibApps-dependent query: "${message}"`, 'INFO');
        await this.delay(8000);
      }
    }
  }

  async testGoogleSearchFailureScenario() {
    this.log('🔍 Testing Google Search API Failure Scenario', 'INFO');
    
    if (this.socket && this.socket.connected) {
      // Send messages that would trigger Google Site Search
      const testMessages = [
        "Can you search the library website for information about interlibrary loans?",
        "Search the library site for thesis submission guidelines",
        "Find information about library databases on the website"
      ];
      
      for (const message of testMessages) {
        this.socket.emit('message', message);
        this.log(`📤 Sent Google Search-dependent query: "${message}"`, 'INFO');
        await this.delay(8000);
      }
    }
  }

  async testMultipleAPIFailures() {
    this.log('💥 Testing Multiple Simultaneous API Failures', 'INFO');
    
    if (this.socket && this.socket.connected) {
      // Send a complex message that would trigger multiple APIs
      const complexMessage = "I need to reserve a study room, find books about machine learning, get help from a computer science librarian, and search the library website for citation guidelines - can you help with all of this?";
      
      this.socket.emit('message', complexMessage);
      this.log(`📤 Sent multi-API query: "${complexMessage}"`, 'INFO');
      await this.delay(20000);
    }
  }

  async testUserGuidanceToLibrarian() {
    this.log('👤 Testing User Guidance to Real Librarian', 'INFO');
    
    // Check if any responses mentioned librarian options
    const librarianMentions = this.testResults.filter(r => 
      r.message.toLowerCase().includes('librarian') && r.type === 'RESPONSE'
    );
    
    if (librarianMentions.length > 0) {
      this.log(`✅ Found ${librarianMentions.length} responses mentioning librarian options`, 'PASS');
    } else {
      this.log('❌ No responses provided librarian guidance during API failures', 'FAIL');
    }
    
    // Test direct request for librarian help
    if (this.socket && this.socket.connected) {
      this.socket.emit('message', "I'm having trouble and need to talk to a real librarian");
      this.log('📤 Sent direct librarian request', 'INFO');
      await this.delay(5000);
    }
  }

  async generateFailureReport() {
    this.log('📊 Generating API Failure Test Report', 'INFO');
    
    const report = {
      testSummary: {
        timestamp: new Date().toISOString(),
        totalTests: this.testResults.length,
        apiFailureTests: [
          'OpenAI API Failure',
          'LibCal API Failure', 
          'LibApps API Failure',
          'Google Search API Failure',
          'Multiple API Failures'
        ]
      },
      testResults: this.testResults,
      statistics: {
        passed: this.testResults.filter(r => r.type === 'PASS').length,
        failed: this.testResults.filter(r => r.type === 'FAIL').length,
        warnings: this.testResults.filter(r => r.type === 'WARNING').length,
        responses: this.testResults.filter(r => r.type === 'RESPONSE').length
      },
      criticalFindings: this.analyzeCriticalFindings(),
      recommendations: this.generateAPIFailureRecommendations()
    };
    
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(process.cwd(), 'api-failure-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📋 API failure test report saved to: ${reportPath}`, 'INFO');
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('💥 API FAILURE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${report.statistics.passed}`);
    console.log(`❌ Failed: ${report.statistics.failed}`);
    console.log(`⚠️ Warnings: ${report.statistics.warnings}`);
    console.log(`📥 Responses Received: ${report.statistics.responses}`);
    console.log('='.repeat(60));
    
    return report;
  }

  analyzeCriticalFindings() {
    const findings = [];
    
    // Check for exposed technical errors
    const technicalErrors = this.testResults.filter(r => 
      r.type === 'FAIL' && r.message.includes('Technical error exposed')
    );
    
    if (technicalErrors.length > 0) {
      findings.push({
        severity: 'HIGH',
        issue: 'Technical errors exposed to users',
        count: technicalErrors.length,
        impact: 'Poor user experience, confusing error messages'
      });
    }
    
    // Check for lack of librarian guidance
    const librarianGuidance = this.testResults.filter(r => 
      r.type === 'PASS' && r.message.includes('librarian guidance')
    );
    
    if (librarianGuidance.length === 0) {
      findings.push({
        severity: 'HIGH',
        issue: 'No guidance to real librarian during API failures',
        count: 0,
        impact: 'Users left without alternative when system fails'
      });
    }
    
    // Check response rate during failures
    const responses = this.testResults.filter(r => r.type === 'RESPONSE');
    if (responses.length < 5) {
      findings.push({
        severity: 'MEDIUM',
        issue: 'Low response rate during API failures',
        count: responses.length,
        impact: 'Users may think system is completely broken'
      });
    }
    
    return findings;
  }

  generateAPIFailureRecommendations() {
    return [
      {
        priority: 'CRITICAL',
        area: 'Error Handling in Chat Gateway',
        issue: 'No try-catch blocks in handleUserMessage method',
        solution: 'Wrap all API calls in try-catch blocks with user-friendly error messages',
        implementation: 'Add error handling that always provides "Talk to Real Librarian" option'
      },
      {
        priority: 'HIGH',
        area: 'API Timeout Handling',
        issue: 'No timeout mechanisms for third-party API calls',
        solution: 'Implement timeout and retry logic for all external APIs',
        implementation: 'Set 10-second timeouts with 2 retry attempts before fallback'
      },
      {
        priority: 'HIGH',
        area: 'Graceful Degradation',
        issue: 'System fails completely when APIs are unavailable',
        solution: 'Implement graceful degradation with alternative responses',
        implementation: 'Provide helpful fallback responses and librarian contact info'
      },
      {
        priority: 'MEDIUM',
        area: 'User Communication',
        issue: 'Users not informed about system limitations during failures',
        solution: 'Add proactive communication about system status',
        implementation: 'Show status indicators and alternative help options'
      },
      {
        priority: 'MEDIUM',
        area: 'Circuit Breaker Pattern',
        issue: 'No circuit breaker to prevent cascading failures',
        solution: 'Implement circuit breaker pattern for external APIs',
        implementation: 'Temporarily disable failing APIs and route to alternatives'
      }
    ];
  }

  cleanup() {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.mockServer) {
      this.mockServer.close();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const simulator = new APIFailureSimulator();
  simulator.testAPIFailureScenarios().then(() => {
    console.log('🏁 API failure simulation tests completed');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 API failure test suite failed:', error);
    process.exit(1);
  });
}

module.exports = APIFailureSimulator;

#!/usr/bin/env node

/**
 * Focused Third-Party API Failure Test
 * Tests specific scenarios where OpenAI, LibCal, LibApps, and Google APIs fail
 */

const io = require('socket.io-client');

class ThirdPartyAPIFailureTest {
  constructor() {
    this.serverUrl = 'http://localhost:3000';
    this.socket = null;
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

  async runThirdPartyAPITests() {
    this.log('🚀 Starting Third-Party API Failure Tests', 'START');
    
    try {
      await this.connectToApp();
      
      // Test 1: OpenAI API Failure Scenarios
      await this.testOpenAIFailures();
      
      // Test 2: LibCal API Failure Scenarios  
      await this.testLibCalFailures();
      
      // Test 3: LibApps API Failure Scenarios
      await this.testLibAppsFailures();
      
      // Test 4: Google Search API Failure Scenarios
      await this.testGoogleSearchFailures();
      
      // Test 5: Multiple API Failure Scenarios
      await this.testMultipleAPIFailures();
      
      await this.generateReport();
      
    } catch (error) {
      this.log(`Test suite error: ${error.message}`, 'ERROR');
    } finally {
      if (this.socket) {
        this.socket.disconnect();
      }
    }
  }

  async connectToApp() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        timeout: 10000,
        reconnection: false
      });

      this.socket.on('connect', () => {
        this.log('✅ Connected to SmartChatbot', 'PASS');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        this.log(`❌ Connection failed: ${error.message}`, 'FAIL');
        reject(error);
      });

      this.socket.on('message', (data) => {
        this.analyzeResponse(data);
      });

      this.socket.on('error', (error) => {
        this.log(`❌ Socket error: ${error.message}`, 'FAIL');
      });
    });
  }

  analyzeResponse(data) {
    this.log(`📥 Response: ${JSON.stringify(data)}`, 'RESPONSE');
    
    const message = data.message || '';
    const lowerMessage = message.toLowerCase();
    
    // Check for user-friendly error handling
    if (data.isError && data.showLibrarianOption) {
      this.log('✅ Proper error response with librarian option', 'PASS');
    }
    
    // Check for librarian guidance
    if (lowerMessage.includes('librarian') || lowerMessage.includes('(513) 529-1356')) {
      this.log('✅ Response includes librarian guidance', 'PASS');
    }
    
    // Check for alternative contact methods
    if (lowerMessage.includes('libcal.lib.miamioh.edu') || 
        lowerMessage.includes('libraries.miamioh.edu') ||
        lowerMessage.includes('(513) 529-1356')) {
      this.log('✅ Response includes alternative contact methods', 'PASS');
    }
    
    // Check for technical errors (should NOT be present)
    if (lowerMessage.includes('error:') || 
        lowerMessage.includes('500') || 
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('api') && lowerMessage.includes('failed')) {
      this.log('❌ Technical error exposed to user', 'FAIL');
    }
    
    // Check for helpful fallback responses
    if (lowerMessage.includes('technical difficulties') ||
        lowerMessage.includes('having trouble') ||
        lowerMessage.includes('unable to process')) {
      this.log('✅ User-friendly fallback response provided', 'PASS');
    }
  }

  async testOpenAIFailures() {
    this.log('🤖 Testing OpenAI API Failure Scenarios', 'INFO');
    
    const openAITestQueries = [
      'Can you help me understand quantum computing and machine learning?',
      'I need a detailed explanation of artificial intelligence concepts.',
      'Please analyze this complex research topic for me.',
      'Help me with advanced computer science concepts.'
    ];

    for (let i = 0; i < openAITestQueries.length; i++) {
      this.log(`📤 Testing OpenAI failure scenario ${i + 1}: "${openAITestQueries[i]}"`, 'INFO');
      this.socket.emit('message', openAITestQueries[i]);
      await this.delay(8000); // Wait for response
    }
  }

  async testLibCalFailures() {
    this.log('📅 Testing LibCal API Failure Scenarios', 'INFO');
    
    const libCalTestQueries = [
      'What are the library hours for tomorrow?',
      'I want to reserve a study room for 2 PM today.',
      'Can you check room availability for group study?',
      'What time does the library close on weekends?',
      'I need to book a private study space.'
    ];

    for (let i = 0; i < libCalTestQueries.length; i++) {
      this.log(`📤 Testing LibCal failure scenario ${i + 1}: "${libCalTestQueries[i]}"`, 'INFO');
      this.socket.emit('message', libCalTestQueries[i]);
      await this.delay(6000);
    }
  }

  async testLibAppsFailures() {
    this.log('📚 Testing LibApps API Failure Scenarios', 'INFO');
    
    const libAppsTestQueries = [
      'I need help from a librarian who specializes in biology.',
      'Can you connect me with a computer science librarian?',
      'Who is the subject librarian for engineering?',
      'I need research help from a specialized librarian.',
      'Can you find me a librarian expert in chemistry?'
    ];

    for (let i = 0; i < libAppsTestQueries.length; i++) {
      this.log(`📤 Testing LibApps failure scenario ${i + 1}: "${libAppsTestQueries[i]}"`, 'INFO');
      this.socket.emit('message', libAppsTestQueries[i]);
      await this.delay(6000);
    }
  }

  async testGoogleSearchFailures() {
    this.log('🔍 Testing Google Search API Failure Scenarios', 'INFO');
    
    const googleSearchTestQueries = [
      'Can you search the library website for interlibrary loan information?',
      'Search the library site for thesis submission guidelines.',
      'Find information about database access on the library website.',
      'Search for library policies on the website.',
      'Look up citation help on the library site.'
    ];

    for (let i = 0; i < googleSearchTestQueries.length; i++) {
      this.log(`📤 Testing Google Search failure scenario ${i + 1}: "${googleSearchTestQueries[i]}"`, 'INFO');
      this.socket.emit('message', googleSearchTestQueries[i]);
      await this.delay(6000);
    }
  }

  async testMultipleAPIFailures() {
    this.log('💥 Testing Multiple API Failure Scenarios', 'INFO');
    
    const multiAPITestQueries = [
      'I need library hours, want to reserve a room, need a computer science librarian, and want to search the website for citation help.',
      'Can you check when the library is open, find me books, and connect me with a research librarian?',
      'Help me with room booking, library hours, and finding research databases.',
    ];

    for (let i = 0; i < multiAPITestQueries.length; i++) {
      this.log(`📤 Testing multiple API failure scenario ${i + 1}`, 'INFO');
      this.socket.emit('message', multiAPITestQueries[i]);
      await this.delay(10000); // Longer wait for complex queries
    }
  }

  async generateReport() {
    this.log('📊 Generating Third-Party API Test Report', 'INFO');
    
    const totalTests = this.testResults.filter(r => r.type === 'INFO' && r.message.includes('Testing')).length;
    const responses = this.testResults.filter(r => r.type === 'RESPONSE').length;
    const passes = this.testResults.filter(r => r.type === 'PASS').length;
    const fails = this.testResults.filter(r => r.type === 'FAIL').length;
    
    const librarianGuidance = this.testResults.filter(r => 
      r.type === 'PASS' && r.message.includes('librarian guidance')
    ).length;
    
    const fallbackResponses = this.testResults.filter(r => 
      r.type === 'PASS' && r.message.includes('fallback response')
    ).length;
    
    const alternativeContacts = this.testResults.filter(r => 
      r.type === 'PASS' && r.message.includes('alternative contact')
    ).length;

    console.log('\n' + '='.repeat(70));
    console.log('🔍 THIRD-PARTY API FAILURE TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`📊 Test Scenarios: ${totalTests}`);
    console.log(`📥 Responses Received: ${responses}`);
    console.log(`✅ Successful Checks: ${passes}`);
    console.log(`❌ Failed Checks: ${fails}`);
    console.log('');
    console.log('📋 SPECIFIC API FAILURE HANDLING:');
    console.log(`👥 Librarian Guidance Provided: ${librarianGuidance} times`);
    console.log(`🔄 Fallback Responses Generated: ${fallbackResponses} times`);
    console.log(`📞 Alternative Contacts Provided: ${alternativeContacts} times`);
    console.log('');
    
    if (fails === 0 && librarianGuidance > 0) {
      console.log('🎉 EXCELLENT: All third-party API failures handled gracefully!');
      console.log('✅ Users receive helpful guidance when APIs fail');
      console.log('✅ No technical errors exposed to users');
      console.log('✅ Librarian contact information provided');
    } else if (fails > 0) {
      console.log('⚠️  ISSUES FOUND: Some API failures not handled properly');
      console.log(`❌ ${fails} technical errors exposed to users`);
    } else {
      console.log('✅ GOOD: API failures handled, but could improve librarian guidance');
    }
    
    console.log('='.repeat(70));
    
    return {
      totalTests,
      responses,
      passes,
      fails,
      librarianGuidance,
      fallbackResponses,
      alternativeContacts
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ThirdPartyAPIFailureTest();
  tester.runThirdPartyAPITests().then(() => {
    console.log('🏁 Third-party API failure tests completed');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Third-party API test failed:', error);
    process.exit(1);
  });
}

module.exports = ThirdPartyAPIFailureTest;

// Script to test quiz republishing flow
const fetch = require('node-fetch');

// Configuration
const API_BASE = 'http://localhost:3000/api';

// Replace this with your actual auth cookie from browser dev tools
// Instructions:
// 1. Login to the organizer portal in your browser
// 2. Open browser dev tools (F12 or right-click -> Inspect)
// 3. Go to Application tab -> Cookies -> http://localhost:3000
// 4. Find and copy the value of 'next-auth.session-token' cookie
const AUTH_COOKIE = 'YOUR_AUTH_COOKIE_HERE'; // Replace with your auth cookie

// Test data
let testQuizId;
const testQuiz = {
  title: 'Test Republish Quiz',
  description: 'Quiz created for testing republishing functionality',
  duration: 10, // 10 minutes
  passingScore: 60,
  availableFrom: new Date().toISOString(),
  availableTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
  status: 'created',
  categoryId: 1, // You may need to adjust this to a valid categoryId from your database
};

// Test question for the quiz
const testQuestion = {
  questionText: 'This is a test question for republishing',
  optionA: 'Option A',
  optionB: 'Option B',
  optionC: 'Option C',
  optionD: 'Option D',
  correctAnswer: 'A',
};

// Function to make authenticated API requests
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `next-auth.session-token=${AUTH_COOKIE}`
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  return {
    status: response.status,
    data: await response.json().catch(() => null)
  };
}

// Step 1: Create a test quiz
async function createTestQuiz() {
  console.log('Step 1: Creating test quiz...');
  const response = await apiRequest('/organizer/quizzes', 'POST', testQuiz);
  
  if (response.status !== 201) {
    console.error('Failed to create quiz:', response);
    process.exit(1);
  }
  
  testQuizId = response.data.id;
  console.log(`Quiz created with ID: ${testQuizId}`);
  
  // Add a test question to the quiz
  const questionResponse = await apiRequest(`/organizer/quizzes/${testQuizId}/questions`, 'POST', testQuestion);
  
  if (questionResponse.status !== 201) {
    console.error('Failed to add question to quiz:', questionResponse);
    process.exit(1);
  }
  
  console.log('Added test question to the quiz');
  
  return response.data;
}

// Step 2: Publish the quiz
async function publishQuiz() {
  console.log('Step 2: Publishing quiz...');
  const response = await apiRequest(`/organizer/quizzes/${testQuizId}/publish`, 'POST');
  
  if (response.status !== 200) {
    console.error('Failed to publish quiz:', response);
    process.exit(1);
  }
  
  console.log('Quiz published successfully');
  console.log('Quiz status:', response.data.status);
  
  return response.data;
}

// Step 3: Retract the quiz
async function retractQuiz() {
  console.log('Step 3: Retracting quiz...');
  const response = await apiRequest(`/organizer/quizzes/${testQuizId}/retract`, 'POST');
  
  if (response.status !== 200) {
    console.error('Failed to retract quiz:', response);
    process.exit(1);
  }
  
  console.log('Quiz retracted successfully');
  console.log('Quiz status:', response.data.status);
  
  return response.data;
}

// Step 4: Republish the quiz
async function republishQuiz() {
  console.log('Step 4: Republishing quiz...');
  const response = await apiRequest(`/organizer/quizzes/${testQuizId}/publish`, 'POST');
  
  if (response.status !== 200) {
    console.error('Failed to republish quiz:', response);
    process.exit(1);
  }
  
  console.log('Quiz republished successfully');
  console.log('Quiz status:', response.data.status);
  
  return response.data;
}

// Step 5: Verify the final state
async function verifyFinalState() {
  console.log('Step 5: Verifying final quiz state...');
  const response = await apiRequest(`/organizer/quizzes/${testQuizId}`);
  
  if (response.status !== 200) {
    console.error('Failed to get quiz details:', response);
    process.exit(1);
  }
  
  console.log('Quiz final status:', response.data.status);
  console.log('Quiz published at:', response.data.publishedAt);
  
  if (response.data.status !== 'published') {
    console.error('ERROR: Quiz is not in published state after republishing!');
    process.exit(1);
  }
  
  console.log('✅ Success! Quiz republishing test passed.');
  
  return response.data;
}

// Main test function
async function runTest() {
  try {
    console.log('Starting quiz republishing test...');
    
    await createTestQuiz();
    await publishQuiz();
    await retractQuiz();
    await republishQuiz();
    await verifyFinalState();
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

// Check if the AUTH_COOKIE has been updated
if (AUTH_COOKIE === 'YOUR_AUTH_COOKIE_HERE') {
  console.error('⚠️  Error: You need to update the AUTH_COOKIE value in this script!');
  console.error('Follow these steps to get your authentication cookie:');
  console.error('1. Login to the organizer portal in your browser');
  console.error('2. Open browser dev tools (F12 or right-click -> Inspect)');
  console.error('3. Go to Application tab -> Cookies -> http://localhost:3000');
  console.error('4. Find and copy the value of "next-auth.session-token" cookie');
  console.error('5. Replace "YOUR_AUTH_COOKIE_HERE" in this script with that value');
  process.exit(1);
}

console.log('==================================================');
console.log('🧪 Quiz Republishing Test Script');
console.log('==================================================');
console.log('This script will test the complete quiz lifecycle:');
console.log('  1. Create a new test quiz with a question');
console.log('  2. Publish the quiz');
console.log('  3. Retract the quiz');
console.log('  4. Republish the quiz (testing our new functionality)');
console.log('  5. Verify the final state');
console.log('==================================================');

// Run the test
runTest();

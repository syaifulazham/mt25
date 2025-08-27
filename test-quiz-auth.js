/**
 * Simple Authorization Test Script
 * This script tests the quiz authorization logic for different user roles
 * to verify that both ADMIN and OPERATOR roles are properly authorized
 */

console.log('=== QUIZ AUTHORIZATION LOGIC TEST ===\n');

// Mock users with different roles
const ADMIN_USER = {
  id: 'admin-user-id',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'ADMIN',
  isParticipant: false
};

const OPERATOR_USER = {
  id: 'operator-user-id',
  name: 'Operator User',
  email: 'operator@example.com',
  role: 'OPERATOR',
  isParticipant: false
};

const PARTICIPANT_USER = {
  id: 'participant-user-id',
  name: 'Participant User',
  email: 'participant@example.com',
  role: 'USER',
  isParticipant: true
};

const REGULAR_USER = {
  id: 'regular-user-id',
  name: 'Regular User',
  email: 'user@example.com',
  role: 'USER',
  isParticipant: false
};

// Import the authorization utilities
// Note: Since we're directly running Node.js, we need to use require() instead of ES6 import
// This is just for testing the logic - in a real setup we'd need to transpile or use ES modules
function checkQuizAuthorization(user) {
  // If no user, not authenticated
  if (!user) {
    return {
      authorized: false,
      response: { 
        error: 'Unauthorized - Please log in',
        status: 401
      }
    };
  }

  // If user is a participant, deny access
  if (user.isParticipant) {
    return {
      authorized: false,
      response: {
        error: 'Participants cannot access organizer features',
        status: 403
      }
    };
  }

  // Check if user has ADMIN or OPERATOR role
  if (user.role !== 'ADMIN' && user.role !== 'OPERATOR') {
    return {
      authorized: false,
      response: {
        error: 'Insufficient permissions',
        status: 403
      }
    };
  }

  // User is authorized
  return {
    authorized: true,
    response: null
  };
}

console.log('Authorization checks for different users:\n');

async function checkQuestionAuthorization(user) {
  // Same logic as quiz authorization
  return checkQuizAuthorization(user);
}

// Test with ADMIN user
console.log('1. ADMIN user:');
const adminAuth = checkQuizAuthorization(ADMIN_USER);
console.log('   Authorized:', adminAuth.authorized);
console.log('   Response:', adminAuth.response);

// Test with OPERATOR user
console.log('\n2. OPERATOR user:');
const operatorAuth = checkQuizAuthorization(OPERATOR_USER);
console.log('   Authorized:', operatorAuth.authorized);
console.log('   Response:', operatorAuth.response);

// Test with PARTICIPANT user
console.log('\n3. PARTICIPANT user:');
const participantAuth = checkQuizAuthorization(PARTICIPANT_USER);
console.log('   Authorized:', participantAuth.authorized);
console.log('   Response:', participantAuth.response);

// Test with regular user
console.log('\n4. Regular USER:');
const userAuth = checkQuizAuthorization(REGULAR_USER);
console.log('   Authorized:', userAuth.authorized);
console.log('   Response:', userAuth.response);

// Test with no user (unauthenticated)
console.log('\n5. No user (unauthenticated):');
const noUserAuth = checkQuizAuthorization(null);
console.log('   Authorized:', noUserAuth.authorized);
console.log('   Response:', noUserAuth.response);

console.log('\n=== TEST COMPLETE ===')


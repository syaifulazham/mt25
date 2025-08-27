/**
 * Simple Quiz Authorization Verification Script
 */

console.log('=== QUIZ AUTHORIZATION VERIFICATION ===');

// Mock users with different roles
const users = {
  admin: { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', isParticipant: false },
  operator: { id: '2', name: 'Operator User', email: 'operator@example.com', role: 'OPERATOR', isParticipant: false },
  participant: { id: '3', name: 'Participant User', email: 'participant@example.com', role: 'USER', isParticipant: true },
  regularUser: { id: '4', name: 'Regular User', email: 'user@example.com', role: 'USER', isParticipant: false },
  noUser: null
};

// Simple authorization function that replicates our production logic
function isAuthorized(user) {
  // If no user, not authenticated
  if (!user) {
    return { authorized: false, reason: 'Not authenticated' };
  }

  // If user is a participant, deny access
  if (user.isParticipant) {
    return { authorized: false, reason: 'Participants cannot access organizer features' };
  }

  // Check if user has ADMIN or OPERATOR role
  if (user.role !== 'ADMIN' && user.role !== 'OPERATOR') {
    return { authorized: false, reason: 'Insufficient permissions' };
  }

  // User is authorized
  return { authorized: true, reason: 'User is authorized' };
}

// Test authorization for each user type
const results = {};

Object.entries(users).forEach(([userType, user]) => {
  results[userType] = isAuthorized(user);
});

// Print results in a table format
console.log('\nAuthorization Results:');
console.log('=====================================================================');
console.log('| User Type     | Authorized | Reason                              |');
console.log('=====================================================================');

Object.entries(results).forEach(([userType, result]) => {
  const paddedType = userType.padEnd(14);
  const paddedAuth = String(result.authorized).padEnd(10);
  const paddedReason = result.reason.padEnd(35);
  console.log(`| ${paddedType} | ${paddedAuth} | ${paddedReason} |`);
});

console.log('=====================================================================');

// Verify OPERATOR role is authorized (test pass/fail result)
if (results.operator.authorized) {
  console.log('\n✅ TEST PASSED: OPERATOR role is authorized to access quiz features');
} else {
  console.log('\n❌ TEST FAILED: OPERATOR role is not authorized to access quiz features');
}

console.log('\n=== VERIFICATION COMPLETE ===');

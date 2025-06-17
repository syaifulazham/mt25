/**
 * Test script for Moodle account creation API
 * 
 * This script makes a POST request to the Moodle account creation API endpoint
 * with a valid team ID to diagnose the 500 error.
 */

// Using a valid team ID from our database query
const teamId = 132; // Team: Big Abu, Email: calmomatic@gmail.com, ContestCode: 4.1K
const authToken = ""; // Add a valid auth token if needed

async function testMoodleApi() {
  try {
    console.log(`Testing Moodle API for team ID: ${teamId}`);
    
    const response = await fetch(`http://localhost:3000/api/participants/teams/${teamId}/moodle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication if needed
        // 'Authorization': `Bearer ${authToken}`
      },
    });
    
    const contentType = response.headers.get("content-type");
    let data;
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response data:`, data);
    
    return {
      status: response.status,
      data
    };
  } catch (error) {
    console.error(`Error testing Moodle API:`, error);
    return {
      error: error.message
    };
  }
}

// Execute the test
testMoodleApi().then(result => {
  console.log('Test completed:', result);
});

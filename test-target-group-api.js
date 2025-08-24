// Test script for target group API with contestant_class_grade field
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Function to make API requests
async function makeRequest(url, method, body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.data = body;
    }

    const response = await axios(url, options);
    return { status: response.status, data: response.data };
  } catch (error) {
    console.error('Error making request:', error.message);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      return { status: error.response.status, error: error.response.data };
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      return { status: 500, error: 'No response received from server' };
    } else {
      // Something happened in setting up the request
      return { status: 500, error: error.message };
    }
  }
}

// Test creating a target group with contestant_class_grade
async function testCreateTargetGroup() {
  console.log('\n=== Testing Create Target Group with Class Grade ===');
  
  const newTargetGroup = {
    name: 'Test Target Group with Class Grade',
    code: `TG-TEST-${Date.now()}`,
    ageGroup: 'Test Age Group',
    schoolLevel: 'PRIMARY',
    minAge: 7,
    maxAge: 12,
    contestant_class_grade: '3'
  };

  const response = await makeRequest(`${API_BASE_URL}/target-groups`, 'POST', newTargetGroup);
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  return response.data;
}

// Test updating a target group with contestant_class_grade
async function testUpdateTargetGroup(targetGroupId) {
  console.log('\n=== Testing Update Target Group with Class Grade ===');
  
  const updatedTargetGroup = {
    name: 'Updated Test Target Group',
    code: `TG-UPDATED-${Date.now()}`,
    ageGroup: 'Updated Age Group',
    schoolLevel: 'PRIMARY',
    minAge: 7,
    maxAge: 12,
    contestant_class_grade: 'PPKI'
  };

  const response = await makeRequest(`${API_BASE_URL}/target-groups/${targetGroupId}`, 'PUT', updatedTargetGroup);
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  return response.data;
}

// Test getting a target group to verify contestant_class_grade is returned
async function testGetTargetGroup(targetGroupId) {
  console.log('\n=== Testing Get Target Group to verify Class Grade ===');
  
  const response = await makeRequest(`${API_BASE_URL}/target-groups/${targetGroupId}`, 'GET');
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  return response.data;
}

// Main test function
async function runTests() {
  try {
    // Test creating a target group
    const createdTargetGroup = await testCreateTargetGroup();
    
    if (createdTargetGroup && createdTargetGroup.id) {
      // Test updating the target group
      await testUpdateTargetGroup(createdTargetGroup.id);
      
      // Test getting the target group
      await testGetTargetGroup(createdTargetGroup.id);
    } else {
      console.error('Failed to create target group, cannot continue tests');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
console.log('Starting Target Group API tests...');
runTests().then(() => console.log('Tests completed!'));

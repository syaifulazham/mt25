// NextAuth API testing script for online registration
const axios = require('axios');
const https = require('https');
const jose = require('jose');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const JWT_SECRET = process.env.NEXTAUTH_SECRET || '8Li3veTh1515MySeCr3t'; // Match the secret in auth-options.ts

// Mock participant user for development/testing
const MOCK_PARTICIPANT = {
  id: 304, // Using the same participant ID shown in the logs
  name: 'Test Participant',
  email: 'test.participant@example.com',
  role: 'PARTICIPANT',
  username: 'testparticipant',
  isParticipant: true
};

// Generate a NextAuth compatible token for the mock user
async function generateMockToken() {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  // Create a token that mimics NextAuth JWT structure
  return await new jose.SignJWT({
    id: String(MOCK_PARTICIPANT.id),
    name: MOCK_PARTICIPANT.name,
    email: MOCK_PARTICIPANT.email,
    role: MOCK_PARTICIPANT.role,
    username: MOCK_PARTICIPANT.username,
    isParticipant: MOCK_PARTICIPANT.isParticipant,
    sub: String(MOCK_PARTICIPANT.id), // NextAuth uses 'sub' as the subject identifier
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60), // 8 hours from now
    jti: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 10)}` // Random JWT ID
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

// Test the online registration API with authentication
async function testOnlineRegistrationApi() {
  try {
    console.log('='.repeat(50));
    console.log(`TESTING ONLINE REGISTRATION API ENDPOINT WITH AUTH`);
    console.log('='.repeat(50));
    
    // Generate auth token
    const token = await generateMockToken();
    console.log('Generated auth token:', token.substring(0, 20) + '...');
    
    // Set up cookies for NextAuth authentication
    const sessionCookieName = 'next-auth.session-token';
    const legacyCookieName = 'techlympics-auth';
    
    // Create axios instance with auth cookies and headers
    const api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Cookie: `${sessionCookieName}=${token}; ${legacyCookieName}=${token}`,
        Authorization: `Bearer ${token}`,
        'x-auth-token': token
      },
      withCredentials: true,
      // For local development with self-signed certs
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
    
    // Also set up a cookie jar for axios to handle cookies properly
    console.log('Setting up NextAuth session cookie:', sessionCookieName);
    console.log('Setting up legacy auth cookie:', legacyCookieName);
    
    // Make request to non-authenticated test API endpoint
    console.log(`\nSending request to ${API_BASE_URL}/api/participants/online-registration-test`);
    
    const response = await api.get(`/api/participants/online-registration-test`);
    
    console.log('\n✅ API request successful!');
    console.log(`Status: ${response.status}`);
    
    // Extract teams data
    const teams = response.data.teams || [];
    console.log(`\nFound ${teams.length} teams`);
    
    if (teams.length > 0) {
      // Check if we have trainers in the data
      const teamsWithManagers = teams.filter(team => 
        (team.managerTeams && team.managerTeams.length > 0) || 
        (team.independentManagers && team.independentManagers.length > 0)
      );
      
      console.log(`\n${teamsWithManagers.length} teams have trainer data`);
      
      if (teamsWithManagers.length > 0) {
        // Display the first team with managers as example
        const exampleTeam = teamsWithManagers[0];
        console.log('\nExample team:');
        console.log(`Team ID: ${exampleTeam.id}`);
        console.log(`Team Name: ${exampleTeam.teamName}`);
        console.log(`Contest: ${exampleTeam.contestName}`);
        console.log(`Status: ${exampleTeam.status}`);
        
        // Display managers from teamManager relation
        if (exampleTeam.managerTeams && exampleTeam.managerTeams.length > 0) {
          console.log('\nTeam Managers:');
          exampleTeam.managerTeams.forEach((mt, idx) => {
            console.log(`  [${idx+1}] ID: ${mt.manager.id}, Name: ${mt.manager.name}, Email: ${mt.manager.email}`);
          });
        } else {
          console.log('\nNo team managers found through teamManager relation');
        }
        
        // Display managers from independentManagers relation
        if (exampleTeam.independentManagers && exampleTeam.independentManagers.length > 0) {
          console.log('\nIndependent Managers:');
          exampleTeam.independentManagers.forEach((manager, idx) => {
            console.log(`  [${idx+1}] ID: ${manager.id}, Name: ${manager.name}, Email: ${manager.email}`);
          });
        } else {
          console.log('\nNo independent managers found');
        }
      } else {
        console.log('\n⚠️ No teams found with trainer data');
      }
      
    } else {
      console.log('\n⚠️ No teams found for online registration');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:');
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
      console.error(`Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      console.error(error.request);
    } else {
      // Something happened in setting up the request
      console.error('Error setting up request:', error.message);
    }
  }
}

// Run the test
testOnlineRegistrationApi();

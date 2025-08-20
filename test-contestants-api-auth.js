// NextAuth API testing script
const axios = require('axios');
const https = require('https');
const jose = require('jose');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const EVENT_ID = 6;
const CONTINGENT_ID = 294;
const JWT_SECRET = process.env.NEXTAUTH_SECRET || '8Li3veTh1515MySeCr3t'; // Match the secret in auth-options.ts

// Mock user for development/testing
const MOCK_USER = {
  id: 1,
  name: 'Development User',
  email: 'dev@techlympics.com',
  role: 'ADMIN',
  username: 'devuser'
};

// Generate a NextAuth compatible token for the mock user
async function generateMockToken() {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  // Create a token that mimics NextAuth JWT structure
  return await new jose.SignJWT({
    id: String(MOCK_USER.id),
    name: MOCK_USER.name,
    email: MOCK_USER.email,
    role: MOCK_USER.role,
    username: MOCK_USER.username,
    isParticipant: false,
    sub: String(MOCK_USER.id), // NextAuth uses 'sub' as the subject identifier
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60), // 8 hours from now
    jti: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 10)}` // Random JWT ID
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

// Test the contestants API with authentication
async function testContestantsApi() {
  try {
    console.log('='.repeat(50));
    console.log(`TESTING CONTESTANTS API ENDPOINT WITH AUTH`);
    console.log(`Event ID: ${EVENT_ID}, Contingent ID: ${CONTINGENT_ID}`);
    console.log('='.repeat(50));
    
    // Generate auth token
    const token = await generateMockToken();
    console.log('Generated auth token:', token.substring(0, 20) + '...');
    
    // Set up cookies for NextAuth authentication
    const sessionCookieName = 'next-auth.session-token';
    const legacyCookieName = 'techlympics-auth';
    
    // Create axios instance with auth cookies
    const api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Cookie: `${sessionCookieName}=${token}; ${legacyCookieName}=${token}`
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
    
    // Make request to contestants API endpoint
    console.log(`\nSending request to ${API_BASE_URL}/api/organizer/events/${EVENT_ID}/attendance/contingents/${CONTINGENT_ID}/contestants`);
    
    const response = await api.get(`/api/organizer/events/${EVENT_ID}/attendance/contingents/${CONTINGENT_ID}/contestants`);
    
    console.log('\n✅ API request successful!');
    console.log(`Status: ${response.status}`);
    console.log(`Data: ${JSON.stringify(response.data, null, 2)}`);
    
    // Extract contestants
    const contestants = response.data.contestants || [];
    console.log(`\nFound ${contestants.length} contestants`);
    
    if (contestants.length > 0) {
      console.log('\nExample contestant:');
      console.log(JSON.stringify(contestants[0], null, 2));
      
      // Count how many have team info vs how many don't
      const withTeam = contestants.filter(c => c.teamId !== null).length;
      const withoutTeam = contestants.length - withTeam;
      
      console.log(`\nContestants with team info: ${withTeam}`);
      console.log(`Contestants without team info: ${withoutTeam}`);
    } else {
      console.log('\n⚠️ No contestants found for this contingent and event');
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
testContestantsApi();

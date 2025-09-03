// Test script for dashboard APIs with authentication
const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
const prisma = new PrismaClient();

/**
 * HOW TO USE THIS SCRIPT:
 * 
 * 1. Log in to the application in your browser
 * 2. Open browser developer tools (F12) and go to the Application tab
 * 3. Find the Cookies section and look for 'next-auth.session-token'
 * 4. Copy its value and paste it below
 * 5. Run this script with: node test-dashboard-api.js
 */

async function testDashboardApis() {
  try {
    // Replace this with your actual session cookie value from browser developer tools
    const sessionCookie = 'YOUR_SESSION_COOKIE_HERE'; // Replace with an actual session cookie
    
    if (sessionCookie === 'YOUR_SESSION_COOKIE_HERE') {
      console.error('ERROR: You need to replace the session cookie with your actual session token!\n');
      console.error('Follow the instructions at the top of this file to get your session token.');
      return;
    }
    
    // Test endpoints with various stateIds
    const endpoints = [
      '/api/dashboard/gender-distribution',
      '/api/dashboard/education-level',
      '/api/dashboard/school-category',
      '/api/dashboard/school-ppd-distribution'
    ];
    
    const stateIds = [1, 16]; // Test with a few different stateIds
    
    for (const endpoint of endpoints) {
      console.log(`\n=== Testing ${endpoint} ===`);
      
      // Test without stateId
      const baseResponse = await fetch(`http://localhost:3000${endpoint}`, {
        headers: {
          Cookie: `next-auth.session-token=${sessionCookie}`
        }
      });
      
      console.log(`Without stateId: Status ${baseResponse.status}`);
      if (!baseResponse.ok) {
        console.error(await baseResponse.text());
      } else {
        const data = await baseResponse.json();
        console.log(`Results: ${JSON.stringify(data, null, 2)}`);
      }
      
      // Test with stateIds
      for (const stateId of stateIds) {
        const stateResponse = await fetch(`http://localhost:3000${endpoint}?stateId=${stateId}`, {
          headers: {
            Cookie: `next-auth.session-token=${sessionCookie}`
          }
        });
        
        console.log(`\nWith stateId=${stateId}: Status ${stateResponse.status}`);
        if (!stateResponse.ok) {
          console.error(await stateResponse.text());
        } else {
          const data = await stateResponse.json();
          console.log(`Results: ${JSON.stringify(data, null, 2)}`);
        }
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboardApis();

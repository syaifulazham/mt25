#!/bin/bash

# Test script to check API endpoint using curl
EVENT_ID=6
CONTINGENT_ID=294
BASE_URL="http://localhost:3001"

# Test unauthenticated first
echo "=== Testing without authentication ==="
echo "GET ${BASE_URL}/api/organizer/events/${EVENT_ID}/attendance/contingents/${CONTINGENT_ID}/contestants"
curl -v "${BASE_URL}/api/organizer/events/${EVENT_ID}/attendance/contingents/${CONTINGENT_ID}/contestants" 2>&1

# Kill existing server process
echo -e "\n\n=== Stopping existing Node.js server ==="
pkill -f "next dev"

# Start server with MOCK_AUTH enabled
echo -e "\n\n=== Starting server with MOCK_AUTH=true ==="
echo "This will enable automatic authentication in development mode"
MOCK_AUTH=true NODE_ENV=development npm run dev -- --port 3001 > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "Server starting with PID: ${SERVER_PID}. Waiting 10 seconds..."
sleep 10

# Test with mock auth enabled
echo -e "\n\n=== Testing with MOCK_AUTH enabled ==="
echo "GET ${BASE_URL}/api/organizer/events/${EVENT_ID}/attendance/contingents/${CONTINGENT_ID}/contestants"
curl -v "${BASE_URL}/api/organizer/events/${EVENT_ID}/attendance/contingents/${CONTINGENT_ID}/contestants" 2>&1

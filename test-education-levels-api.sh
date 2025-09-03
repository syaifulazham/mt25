#!/bin/bash
# Script to test the education-levels and education-level API endpoints

# Base URL - change if needed
BASE_URL="http://localhost:3000"
ENDPOINT1="/api/dashboard/education-levels"
ENDPOINT2="/api/dashboard/education-level"

# Colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Testing Education Levels API =====${NC}"

# Function to test and display results
test_api() {
  local url="$1"
  local description="$2"
  
  echo -e "\n${BLUE}Testing: ${description}${NC}"
  echo "URL: $url"
  
  # Replace SESSION_TOKEN with your actual session token from browser cookies
  SESSION_TOKEN="YOUR_SESSION_TOKEN_HERE"
  
  response=$(curl -s -X GET "$url" \
    -H "Content-Type: application/json" \
    -H "Cookie: next-auth.session-token=$SESSION_TOKEN")
  
  # Check if response contains "error"
  if echo "$response" | grep -q "error"; then
    echo -e "${RED}Error in response:${NC}"
    echo "$response" | jq .
  else
    echo -e "${GREEN}Success:${NC}"
    echo "$response" | jq .
  fi
}

# Test global education levels
echo -e "${BLUE}\n======= Testing Global Education Levels =======${NC}"
test_api "${BASE_URL}${ENDPOINT1}" "Global Education Levels"

# Test state-specific education level
echo -e "${BLUE}\n======= Testing State-Specific Education Levels =======${NC}"
test_api "${BASE_URL}${ENDPOINT2}" "No State Filter"
test_api "${BASE_URL}${ENDPOINT2}?stateId=1" "State ID = 1"
test_api "${BASE_URL}${ENDPOINT2}?stateId=16" "State ID = 16"

echo -e "\n${BLUE}===== Tests Complete =====${NC}"
echo -e "Note: Remember to replace 'YOUR_SESSION_TOKEN_HERE' in this script with your actual session token"
echo -e "You can get this from your browser's dev tools under Application > Cookies > next-auth.session-token"

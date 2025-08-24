#!/bin/bash

API_BASE_URL="http://localhost:3000/api"

# Generate a unique code for testing
UNIQUE_CODE="TG-TEST-$(date +%s)"

echo "=== Testing Target Group API with contestant_class_grade field ==="
echo

# Test 1: Create a new target group with contestant_class_grade
echo "1. Creating a new target group with contestant_class_grade='3'"
CREATE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Target Group with Class Grade",
    "code": "'$UNIQUE_CODE'",
    "ageGroup": "Test Age Group",
    "schoolLevel": "PRIMARY",
    "minAge": 7,
    "maxAge": 12,
    "contestant_class_grade": "3"
  }' \
  $API_BASE_URL/target-groups)

echo "Response:"
echo "$CREATE_RESPONSE" | jq .

# Extract the ID from the response
TARGET_GROUP_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$TARGET_GROUP_ID" ]; then
  echo "Failed to extract target group ID from response. Exiting."
  exit 1
fi

echo
echo "Created target group with ID: $TARGET_GROUP_ID"
echo

# Test 2: Get the target group to verify contestant_class_grade is returned
echo "2. Getting target group to verify contestant_class_grade is returned"
GET_RESPONSE=$(curl -s -X GET $API_BASE_URL/target-groups/$TARGET_GROUP_ID)

echo "Response:"
echo "$GET_RESPONSE" | jq .
echo

# Test 3: Update the target group with a different contestant_class_grade
echo "3. Updating target group with contestant_class_grade='PPKI'"
UPDATE_RESPONSE=$(curl -s -X PUT \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Target Group",
    "code": "'$UNIQUE_CODE'-UPDATED",
    "ageGroup": "Updated Age Group",
    "schoolLevel": "PRIMARY",
    "minAge": 7,
    "maxAge": 12,
    "contestant_class_grade": "PPKI"
  }' \
  $API_BASE_URL/target-groups/$TARGET_GROUP_ID)

echo "Response:"
echo "$UPDATE_RESPONSE" | jq .
echo

# Test 4: Get the updated target group to verify contestant_class_grade was updated
echo "4. Getting updated target group to verify contestant_class_grade was changed"
GET_UPDATED_RESPONSE=$(curl -s -X GET $API_BASE_URL/target-groups/$TARGET_GROUP_ID)

echo "Response:"
echo "$GET_UPDATED_RESPONSE" | jq .
echo

echo "=== Tests completed ==="

-- Check if test participant already exists
SET @exists = (SELECT COUNT(*) FROM user WHERE username = 'testparticipant');

-- Only insert if the user doesn't exist
SET @password = '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa'; -- Hashed version of 'password123'

-- Insert the test participant if they don't exist
INSERT INTO user (name, email, username, password, role, isActive, createdAt, updatedAt)
SELECT 'Test Participant', 'testparticipant@example.com', 'testparticipant', @password, 'PARTICIPANT', 1, NOW(), NOW()
WHERE @exists = 0;

-- Output the result
SELECT 'Test participant user created successfully' AS Result
WHERE @exists = 0
UNION
SELECT 'Test participant user already exists' AS Result
WHERE @exists > 0;

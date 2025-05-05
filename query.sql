-- Check managers table and see if email and phoneNumber fields have data
SELECT id, name, ic, email, phoneNumber, hashcode, teamId, createdAt 
FROM manager 
ORDER BY createdAt DESC;

// Script to identify quizzes with target_group values that don't match any targetgroup.code
const mysql = require('mysql2/promise');

async function checkQuizTargetGroups() {
  // Create MySQL connection
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'azham',
    password: 'DBAzham231',
    database: 'mtdb'
  });

  try {
    console.log('Checking quiz target_group values against targetgroup.code...\n');

    // Get all targetgroup codes
    const [targetGroups] = await connection.query('SELECT code FROM targetgroup');
    const validCodes = targetGroups.map(tg => tg.code);
    
    console.log(`Available targetgroup codes (${validCodes.length}): ${validCodes.join(', ')}`);
    
    // Get all quizzes
    const [quizzes] = await connection.query('SELECT id, quiz_name, target_group FROM quiz');
    console.log(`\nFound ${quizzes.length} quizzes in database`);
    
    // Find quizzes with no matching targetgroup
    const problematicQuizzes = quizzes.filter(quiz => !validCodes.includes(quiz.target_group));
    
    if (problematicQuizzes.length > 0) {
      console.log(`\n⚠️  Found ${problematicQuizzes.length} quizzes with no matching targetgroup.code:`);
      problematicQuizzes.forEach(quiz => {
        console.log(`- Quiz ID ${quiz.id}: "${quiz.quiz_name}" has target_group "${quiz.target_group}"`);
      });
      
      // Suggest possible matches
      console.log('\nPossible matches based on similarity:');
      problematicQuizzes.forEach(quiz => {
        const targetGroup = quiz.target_group;
        // This is a very simple similarity check - for a production system you might want 
        // a more sophisticated algorithm like Levenshtein distance
        const possibleMatches = validCodes.filter(code => 
          code.includes(targetGroup) || targetGroup.includes(code) || 
          code.toLowerCase() === targetGroup.toLowerCase()
        );
        
        if (possibleMatches.length > 0) {
          console.log(`- For "${targetGroup}" consider: ${possibleMatches.join(', ')}`);
        } else {
          console.log(`- No similar match found for "${targetGroup}"`);
        }
      });
    } else {
      console.log('✅ All quizzes have valid target_group values that match a targetgroup.code');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkQuizTargetGroups();

// Script to identify quizzes with target_group values that don't match any targetgroup.code
import prisma from "./src/lib/prisma";

async function checkQuizTargetGroups() {
  try {
    console.log('Checking quiz target_group values against targetgroup.code...\n');

    // Get all targetgroup codes
    const targetGroups = await prisma.targetgroup.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        minAge: true,
        maxAge: true,
        schoolLevel: true
      }
    });
    
    const validCodes = targetGroups.map(tg => tg.code);
    console.log(`Available targetgroup codes (${validCodes.length}): ${validCodes.join(', ')}`);
    
    // Get all quizzes
    const quizzes = await prisma.quiz.findMany({
      select: {
        id: true,
        quiz_name: true,
        target_group: true
      }
    });
    
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
        const targetGroup = quiz.target_group || '';
        // This is a very simple similarity check
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

      // Print SQL update statements that could be used to fix the issue
      console.log('\nSQL statements to fix the issues (please review before executing):');
      problematicQuizzes.forEach(quiz => {
        const targetGroup = quiz.target_group || '';
        const possibleMatches = validCodes.filter(code => 
          code.includes(targetGroup) || targetGroup.includes(code) || 
          code.toLowerCase() === targetGroup.toLowerCase()
        );
        
        if (possibleMatches.length > 0) {
          // Suggest the first possible match
          console.log(`UPDATE quiz SET target_group = '${possibleMatches[0]}' WHERE id = ${quiz.id}; -- Change from '${targetGroup}' to '${possibleMatches[0]}'`);
        } else {
          console.log(`-- No similar match found for quiz ID ${quiz.id} with target_group "${targetGroup}"`);
        }
      });
    } else {
      console.log('✅ All quizzes have valid target_group values that match a targetgroup.code');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkQuizTargetGroups();

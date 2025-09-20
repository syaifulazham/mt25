import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

// GET /api/survey/[id]/results
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Temporarily disable authentication for testing
    console.log('Authentication check temporarily bypassed for testing');
    // const user = await getSessionUser({ redirectToLogin: false });
    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if the survey exists
    console.log(`Checking if survey ID ${id} exists...`);
    const survey = await prisma.survey.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }
    console.log(`Found survey: ${survey.name}`);

    // Get all questions for this survey
    console.log(`Fetching questions for survey ID ${id}...`);
    const questions = await prisma.survey_question.findMany({
      where: { surveyId: id },
      orderBy: { displayOrder: 'asc' }
    });
    console.log(`Found ${questions.length} questions`);
    
    // Check if survey_answer table exists by checking table info
    console.log(`Checking if survey_answer table exists...`);
    try {
      // Check if we can get schema information about the survey_answer table
      const columns = await prisma.$queryRaw`SHOW COLUMNS FROM survey_answer`;
      console.log(`Found survey_answer table with columns:`, 
        Array.isArray(columns) ? columns.map((col: any) => col.Field).join(', ') : 'Unknown structure');
      
      // Also check contestant table structure
      const contestantColumns = await prisma.$queryRaw`SHOW COLUMNS FROM contestant`;
      console.log(`Found contestant table with columns:`, 
        Array.isArray(contestantColumns) ? contestantColumns.map((col: any) => col.Field).join(', ') : 'Unknown structure');
    } catch (tableError) {
      console.error(`Error accessing survey_answer or contestant table:`, tableError);
      return NextResponse.json({ 
        error: "Database structure issue", 
        details: "The survey_answer table does not exist or is not accessible" 
      }, { status: 500 });
    }

    // Try a simple count query to see if the table has records
    let answersCount = 0;
    try {
      // Use explicit casting for the id comparison
      const countResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM survey_answer WHERE CAST(surveyId AS CHAR) = CAST(${id} AS CHAR)`;
      console.log('Count query result:', countResult); // Debug the count result
      answersCount = Number((countResult as any)[0]?.count || 0);
      console.log(`Found ${answersCount} answers in survey_answer table for survey ID ${id}`);
    } catch (countError) {
      console.error(`Error counting answers:`, countError);
      return NextResponse.json({ 
        error: "Database query failed", 
        details: "Could not count answers for this survey" 
      }, { status: 500 });
    }

    // Fetch answers using a simpler approach with separate queries
    console.log(`Fetching survey answers using a simpler approach...`);
    let allAnswers: any[] = [];
    
    try {
      // Step 1: Get all answers for this survey (without joining)
      // Add EXPLICIT conversion to make sure we get the correct surveyId
      const surveyAnswers = await prisma.$queryRaw`
        SELECT id, surveyId, contestantId, questionId, answer, submittedAt 
        FROM survey_answer 
        WHERE CAST(surveyId AS CHAR) = CAST(${id} AS CHAR)
      ` as any[];
      console.log(`Found ${surveyAnswers.length} answers for survey ID ${id}`);
      
      // Step 2: Extract unique contestant IDs
      const contestantIds = [...new Set(surveyAnswers.map((a: any) => a.contestantId))];
      console.log(`Found ${contestantIds.length} unique contestant IDs`);
      
      // Step 3: Get contestant details separately (if any contestant IDs exist)
      // Use string keys since the IDs might be strings from the database
      const contestantMap: Record<string, any> = {};
      if (contestantIds.length > 0) {
        try {
          // Try to get contestant data in chunks to avoid query size limitations
          for (let i = 0; i < contestantIds.length; i += 50) {
            const chunk = contestantIds.slice(i, i + 50);
            const placeholders = chunk.map(() => '?').join(',');
            
            // Need to use parameterized query safely
            const contestants = await prisma.$queryRawUnsafe(`
              SELECT c.id, c.name, c.email, c.gender, c.age, c.edu_level, 
                     cont.name as contingentName, cont.contingentType,
                     CASE 
                       WHEN cont.contingentType = 'SCHOOL' THEN 
                         (SELECT s.name FROM state s JOIN school sch ON sch.stateId = s.id WHERE sch.id = cont.schoolId)
                       WHEN cont.contingentType = 'INDEPENDENT' THEN 
                         (SELECT s.name FROM state s JOIN independent ind ON ind.stateId = s.id WHERE ind.id = cont.independentId)
                       ELSE 'Unknown'
                     END as stateName
              FROM contestant c
              LEFT JOIN contingent cont ON c.contingentId = cont.id
              WHERE c.id IN (${placeholders})
            `, ...chunk) as any[];
            
            // Build map of contestant ID to contestant data
            contestants.forEach((c: any) => {
              // Convert ID to string to ensure consistent key format
              contestantMap[String(c.id)] = c;
              console.log(`Adding contestant ${c.id} to map with name: ${c.name || 'unknown'}`);
            });
            
            console.log(`Fetched ${contestants.length} contestants from chunk ${i/50 + 1}`);
          }
        } catch (contestantError) {
          console.error('Error fetching contestant data:', contestantError);
          // Continue with empty contestantMap rather than failing
        }
      }
      
      // Log contestant map for debugging
      console.log('Contestant map keys:', Object.keys(contestantMap));
      console.log('First few contestant IDs in answers:', surveyAnswers.slice(0, 3).map(a => a.contestantId));
      
      // Log a sample contestant entry to check state information
      if (Object.keys(contestantMap).length > 0) {
        const sampleKey = Object.keys(contestantMap)[0];
        console.log('Sample contestant data:', contestantMap[sampleKey]);
      }
      
      // Step 4: Combine answers with contestant data
      allAnswers = surveyAnswers.map((a: any) => {
        // Convert to string to ensure consistent lookup
        const contestantIdKey = String(a.contestantId);
        const contestant = contestantMap[contestantIdKey] || {};
        console.log(`Processing contestant ${a.contestantId}, found in map: ${!!contestantMap[contestantIdKey]}, state: ${contestant.stateName || 'Unknown'}`);
        return {
          answerId: a.id,
          surveyId: a.surveyId,
          contestantId: a.contestantId,
          questionId: a.questionId,
          answer: a.answer,
          answerDate: a.submittedAt,
          contestantName: contestant.name || 'Unknown',
          contestantEmail: contestant.email || '',
          gender: contestant.gender || 'Unknown',
          age: contestant.age || 0,
          edu_level: contestant.edu_level || 'Unknown',
          state: contestant.stateName || 'Unknown',
          contingentName: contestant.contingentName || 'Unknown',
          contingentType: contestant.contingentType || 'Unknown'
        };
      });
      
      console.log(`Successfully combined ${allAnswers.length} answers with contestant data`);
    } catch (error) {
      console.error('Error in simplified answer fetching:', error);
      // On error, set to empty array rather than failing
      allAnswers = [];
    }

    // Process the raw answers into a more usable format
    const processedAnswers = allAnswers.map((answer: any) => {
      // Parse answer if it's stored as a JSON string
      let processedAnswer = answer.answer;
      try {
        if (typeof answer.answer === 'string' && (
          answer.answer.startsWith('[') || 
          answer.answer.startsWith('{')
        )) {
          processedAnswer = JSON.parse(answer.answer);
        }
      } catch (e) {
        // If parsing fails, keep the original answer
        console.warn('Error parsing answer:', e);
      }

      return {
        ...answer,
        answer: processedAnswer
      };
    });

    // Create summary statistics
    console.log('Processed answers:', processedAnswers.length, processedAnswers.slice(0, 2));
    const uniqueRespondentIds = [...new Set(processedAnswers.map((a: any) => a.contestantId))];
    console.log('Unique respondent IDs:', uniqueRespondentIds);
    const totalRespondents = uniqueRespondentIds.length;
    
    // Count responses by gender
    const genderCounts: Record<string, number> = {};
    const ageGroups: Record<string, number> = {};
    const eduLevels: Record<string, number> = {};
    const stateCounts: Record<string, number> = {};
    
    // Create a unique list of respondents with their demographic data
    const respondents = [...new Set(processedAnswers.map((a: any) => a.contestantId))].map(
      (contestantId) => {
        const respondent = processedAnswers.find((a: any) => a.contestantId === contestantId);
        return {
          contestantId,
          name: respondent?.contestantName,
          email: respondent?.contestantEmail,
          gender: respondent?.gender || 'Unknown',
          age: respondent?.age || 0,
          edu_level: respondent?.edu_level || 'Unknown',
          state: respondent?.state || 'Unknown',
          contingentName: respondent?.contingentName || 'Unknown',
          contingentType: respondent?.contingentType || 'Unknown'
        };
      }
    );
    
    // Calculate demographic distributions
    respondents.forEach(respondent => {
      // Gender distribution
      genderCounts[respondent.gender] = (genderCounts[respondent.gender] || 0) + 1;
      
      // Age group distribution
      const ageGroup = getAgeGroup(respondent.age);
      ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;
      
      // Education level distribution
      eduLevels[respondent.edu_level] = (eduLevels[respondent.edu_level] || 0) + 1;
      
      // State distribution
      stateCounts[respondent.state] = (stateCounts[respondent.state] || 0) + 1;
    });
    
    // Get question-specific statistics
    const questionStats = questions.map(question => {
      const questionAnswers = processedAnswers.filter(
        (a: any) => a.questionId === question.id
      );
      
      let distribution: Record<string, number> = {};
      
      if (question.questionType === 'single_choice' || question.questionType === 'multiple_choice') {
        // For choice questions, count frequency of each option
        const options = question.options ? (typeof question.options === 'string' ? 
                       JSON.parse(question.options) : question.options) : [];
        
        options.forEach((option: string) => {
          distribution[option] = 0;
        });
        
        questionAnswers.forEach((answer: any) => {
          if (question.questionType === 'single_choice') {
            // Strip quotes from JSON string answers
            let cleanAnswer = answer.answer;
            if (typeof cleanAnswer === 'string') {
              // Remove surrounding quotes if present
              cleanAnswer = cleanAnswer.replace(/^"|"$/g, '');
            }
            distribution[cleanAnswer] = (distribution[cleanAnswer] || 0) + 1;
          } else if (question.questionType === 'multiple_choice' && Array.isArray(answer.answer)) {
            answer.answer.forEach((selected: string) => {
              // Clean multiple choice answers as well
              let cleanSelected = selected;
              if (typeof cleanSelected === 'string') {
                cleanSelected = cleanSelected.replace(/^"|"$/g, '');
              }
              distribution[cleanSelected] = (distribution[cleanSelected] || 0) + 1;
            });
          }
        });
      }
      
      return {
        questionId: question.id,
        question: question.question,
        type: question.questionType,
        responseCount: questionAnswers.length,
        distribution
      };
    });
    
    // Prepare data for CSV export
    let rawData: any[] = [];
    try {
      rawData = processRespondentAnswers(respondents, questions, processedAnswers);
      console.log(`Processed ${rawData.length} raw data records for CSV export`);
    } catch (processError) {
      console.error(`Error processing respondent answers:`, processError);
      // Continue with empty rawData rather than failing completely
      rawData = [];
    }

    return NextResponse.json({
      surveyId: id,
      surveyName: survey?.name || `Survey ${id}`,
      totalRespondents,
      demographics: {
        genderDistribution: genderCounts,
        ageDistribution: ageGroups,
        educationDistribution: eduLevels,
        stateDistribution: stateCounts
      },
      questions: questionStats,
      rawData
    });
  } catch (error) {
    // More detailed error logging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error(`Error fetching survey results for survey ID ${params.id}:`);
    console.error(`Message: ${errorMessage}`);
    console.error(`Stack: ${errorStack}`);
    
    return NextResponse.json(
      { error: "Failed to fetch survey results", details: errorMessage },
      { status: 500 }
    );
  }
}

// Helper function to categorize ages into groups
function getAgeGroup(age: number): string {
  if (age < 13) return 'Under 13';
  if (age < 18) return '13-17';
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return '65+';
}

// Helper function to process data for CSV export
function processRespondentAnswers(
  respondents: any[], 
  questions: any[], 
  answers: any[]
): any[] {
  console.log('Processing respondents for CSV:', respondents);
  return respondents.map(respondent => {
    const respondentAnswers: Record<string, any> = {
      contestantId: respondent.contestantId,
      gender: respondent.gender,
      age: respondent.age,
      edu_level: respondent.edu_level,
      state: respondent.state || 'Unknown',
      contingentName: respondent.contingentName || 'Unknown',
      contingentType: respondent.contingentType || 'Unknown'
    };
    
    // Add answers for each question
    questions.forEach(question => {
      const answer = answers.find(
        (a: any) => a.contestantId === respondent.contestantId && a.questionId === question.id
      );
      
      // Use q{id} as the column name for each question
      const questionKey = `q${question.id}`;
      if (answer) {
        if (question.questionType === 'multiple_choice' && Array.isArray(answer.answer)) {
          respondentAnswers[questionKey] = answer.answer.join(', ');
        } else {
          respondentAnswers[questionKey] = answer.answer;
        }
      } else {
        respondentAnswers[questionKey] = '';
      }
    });
    
    return respondentAnswers;
  });
}

// Special handler for generating CSV data
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Temporarily disable authentication for testing
    console.log('Authentication check temporarily bypassed for CSV export');
    // const user = await getSessionUser({ redirectToLogin: false });
    // if (!user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Verify format is CSV
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    
    if (format !== 'csv') {
      return NextResponse.json(
        { error: "Invalid format requested" },
        { status: 400 }
      );
    }

    // Check survey exists
    const survey = await prisma.survey.findUnique({
      where: { id },
      select: { id: true, name: true }
    });
    
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }
    
    // Get questions
    const questions = await prisma.survey_question.findMany({
      where: { surveyId: id },
      orderBy: { displayOrder: 'asc' }
    });
    
    // Get answers directly
    const surveyAnswers = await prisma.$queryRaw`
      SELECT id, surveyId, contestantId, questionId, answer, submittedAt 
      FROM survey_answer 
      WHERE surveyId = ${id}
    ` as any[];
    
    if (!Array.isArray(surveyAnswers) || surveyAnswers.length === 0) {
      // No answers - return empty CSV with headers
      const headers = ['contestantId', 'gender', 'age', 'edu_level', 'state', 'contingentName', 'contingentType'];
      questions.forEach(q => headers.push(`q${q.id}`));
      
      return new NextResponse(headers.join(','), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="survey_${id}_results_empty.csv"`
        }
      });
    }

    // Collect contestant info
    const contestantIds = [...new Set(surveyAnswers.map((a: any) => a.contestantId))];
    const contestantMap: Record<string, any> = {};
    
    try {
      // Fetch contestant data in chunks
      for (let i = 0; i < contestantIds.length; i += 30) {
        const chunk = contestantIds.slice(i, i + 30);
        const placeholders = chunk.map(() => '?').join(',');
        
        try {
          const contestants = await prisma.$queryRawUnsafe(`
            SELECT c.id, c.name, c.email, c.gender, c.age, c.edu_level, 
                   cont.name as contingentName, cont.contingentType,
                   CASE 
                     WHEN cont.contingentType = 'SCHOOL' THEN 
                       (SELECT s.name FROM state s JOIN school sch ON sch.stateId = s.id WHERE sch.id = cont.schoolId)
                     WHEN cont.contingentType = 'INDEPENDENT' THEN 
                       (SELECT s.name FROM state s JOIN independent ind ON ind.stateId = s.id WHERE ind.id = cont.independentId)
                     ELSE 'Unknown'
                   END as stateName
            FROM contestant c
            LEFT JOIN contingent cont ON c.contingentId = cont.id
            WHERE c.id IN (${placeholders})
          `, ...chunk) as any[];
          
          if (Array.isArray(contestants)) {
            contestants.forEach((c: any) => {
              if (c && c.id) {
                contestantMap[String(c.id)] = c;
              }
            });
          }
        } catch (err) {
          console.warn('Error fetching contestant chunk:', err);
          // Continue anyway - we'll handle missing data
        }
      }
    } catch (err) {
      console.error('Error fetching contestant data:', err);
      // Continue with empty map - will handle missing data
    }
    
    // Process answers
    let processedAnswers: any[] = [];
    try {
      processedAnswers = surveyAnswers.map((a: any) => {
        // Handle null values
        if (!a) return {};
        
        const contestantIdKey = String(a.contestantId);
        const contestant = contestantMap[contestantIdKey] || {};
        console.log(`POST processing contestant ${a.contestantId}, found in map: ${!!contestantMap[contestantIdKey]}, state: ${contestant?.stateName || 'Unknown'}`);
        let processedAnswer = a.answer;
        
        try {
          if (typeof a.answer === 'string' && 
             (a.answer.startsWith('[') || a.answer.startsWith('{'))) {
            processedAnswer = JSON.parse(a.answer);
          }
        } catch {
          // Use original on parse error
        }
        
        return {
          answerId: a.id,
          surveyId: a.surveyId,
          contestantId: a.contestantId,
          questionId: a.questionId,
          answer: processedAnswer,
          answerDate: a.submittedAt,
          contestantName: contestant?.name || 'Unknown',
          contestantEmail: contestant?.email || '',
          gender: contestant?.gender || 'Unknown',
          age: contestant?.age || 0,
          edu_level: contestant?.edu_level || 'Unknown',
          state: contestant?.stateName || 'Unknown',
          contingentName: contestant?.contingentName || 'Unknown',
          contingentType: contestant?.contingentType || 'Unknown'
        };
      });
    } catch (err) {
      console.error('Error processing answers:', err);
      processedAnswers = [];
    }
    
    // Build respondent list
    const respondents = contestantIds.map(id => {
      const contestant = contestantMap[String(id)] || {};
      return {
        contestantId: id,
        name: contestant?.name || 'Unknown',
        email: contestant?.email || '',
        gender: contestant?.gender || 'Unknown',
        age: contestant?.age || 0,
        edu_level: contestant?.edu_level || 'Unknown',
        state: contestant?.stateName || 'Unknown',
        contingentName: contestant?.contingentName || 'Unknown',
        contingentType: contestant?.contingentType || 'Unknown'
      };
    });
    
    // Build CSV data
    let rawData: any[] = [];
    try {
      rawData = processRespondentAnswers(respondents, questions, processedAnswers);
    } catch (err) {
      console.error('Error processing respondent answers:', err);
      // Provide a simple fallback if processing fails
      rawData = respondents.map(r => ({
        contestantId: r.contestantId,
        gender: r.gender,
        age: r.age,
        edu_level: r.edu_level,
        state: r.state || 'Unknown',
        contingentName: r.contingentName || 'Unknown',
        contingentType: r.contingentType || 'Unknown'
      }));
    }
    
    // Generate CSV
    const headers = Object.keys(rawData[0] || {});
    const csvRows = [
      headers.join(','), // CSV header row
      ...rawData.map((row: Record<string, any>) => 
        headers.map(header => {
          const value = row[header];
          // Handle CSV formatting
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && 
              (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`; 
          }
          return value;
        }).join(',')
      )
    ];
    
    const csv = csvRows.join('\n');
    
    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="survey_${id}_results.csv"`
      }
    });
  } catch (error) {
    console.error(`Error generating CSV for survey ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to generate CSV" },
      { status: 500 }
    );
  }
}

// Test script for testing the target group API with authentication
const axios = require('axios');

async function main() {
  try {
    const apiBaseUrl = 'http://localhost:3000/api';
    
    // Create a new target group with contestant_class_grade
    console.log('Creating a new target group with class grade...');
    const createResponse = await axios.post(`${apiBaseUrl}/target-groups`, {
      name: `Test Class Grade ${Date.now()}`,
      code: `TCG-${Date.now()}`,
      ageGroup: 'Test Age Group',
      schoolLevel: 'PRIMARY',
      minAge: 7,
      maxAge: 12,
      contestant_class_grade: '5'
    });
    
    console.log('Creation response status:', createResponse.status);
    console.log('Created target group:', createResponse.data);
    console.log('Has contestant_class_grade in response:', 'contestant_class_grade' in createResponse.data);
    
    const createdId = createResponse.data.id;
    
    // Get the target group to verify the field was saved
    console.log('\nRetrieving created target group...');
    const getResponse = await axios.get(`${apiBaseUrl}/target-groups/${createdId}`);
    console.log('Get response status:', getResponse.status);
    console.log('Retrieved target group:', getResponse.data);
    console.log('Has contestant_class_grade in response:', 'contestant_class_grade' in getResponse.data);
    console.log('contestant_class_grade value:', getResponse.data.contestant_class_grade);
    
    // Update the target group with a different class grade
    console.log('\nUpdating the target group with a different class grade...');
    const updateResponse = await axios.put(`${apiBaseUrl}/target-groups/${createdId}`, {
      ...getResponse.data,
      contestant_class_grade: '6'
    });
    console.log('Update response status:', updateResponse.status);
    console.log('Updated target group:', updateResponse.data);
    console.log('Has contestant_class_grade in response:', 'contestant_class_grade' in updateResponse.data);
    console.log('Updated contestant_class_grade value:', updateResponse.data.contestant_class_grade);
    
    // Final check - get the target group again to confirm update was persisted
    console.log('\nFinal check - retrieving updated target group...');
    const finalGetResponse = await axios.get(`${apiBaseUrl}/target-groups/${createdId}`);
    console.log('Final get response status:', finalGetResponse.status);
    console.log('Final retrieved target group:', finalGetResponse.data);
    console.log('Has contestant_class_grade in response:', 'contestant_class_grade' in finalGetResponse.data);
    console.log('Final contestant_class_grade value:', finalGetResponse.data.contestant_class_grade);
    
  } catch (error) {
    console.error('Test error:', error.response ? {
      status: error.response.status,
      data: error.response.data
    } : error.message);
  }
}

main()
  .catch(e => console.error(e));

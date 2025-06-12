/**
 * Moodle API client for interacting with Moodle LMS
 */

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

// Log which Moodle URL is being used (but not the token for security reasons)
console.log(`[Moodle API] Using Moodle URL: ${MOODLE_URL}`);
console.log(`[Moodle API] Moodle token configured: ${!!MOODLE_TOKEN}`);

interface MoodleUser {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  auth: string;
  confirmed: boolean;
  idnumber?: string;
  password?: string;
}

interface MoodleApiResponse<T> {
  data?: T;
  exception?: {
    message: string;
    errorcode: string;
  };
  error?: string;
}

/**
 * Calls Moodle API with the specified function and parameters
 */
async function callMoodleApi<T>(
  functionName: string, 
  params: Record<string, any> = {}
): Promise<MoodleApiResponse<T>> {
  try {
    if (!MOODLE_URL || !MOODLE_TOKEN) {
      throw new Error('Moodle configuration is missing');
    }
    
    const url = `${MOODLE_URL}/webservice/rest/server.php`;

    console.log("url:------------------------------------------->", url);
    
    // Create a URLSearchParams object for x-www-form-urlencoded format
    const formData = new URLSearchParams();
    formData.append('wstoken', MOODLE_TOKEN);
    formData.append('wsfunction', functionName);
    formData.append('moodlewsrestformat', 'json');
    
    // Add all parameters to the form data
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Handle arrays according to Moodle's format
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            Object.entries(item).forEach(([subKey, subValue]) => {
              formData.append(`${key}[${index}][${subKey}]`, String(subValue));
            });
          } else {
            formData.append(`${key}[${index}]`, String(item));
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects according to Moodle's format
        Object.entries(value).forEach(([subKey, subValue]) => {
          formData.append(`${key}[${subKey}]`, String(subValue));
        });
      } else {
        formData.append(key, String(value));
      }
    });

    console.log("formData: ",formData.toString());
    
    console.log('Making API call to Moodle:', functionName);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    // Log HTTP response status
    console.log(`Moodle API response status: ${response.status} ${response.statusText}`);
    
    // Check if the response is OK
    if (!response.ok) {
      console.error(`HTTP error from Moodle API: ${response.status} ${response.statusText}`);
    }
    
    // Try to parse the response as JSON
    let data;
    const responseText = await response.text();
    console.log('Raw response from Moodle API:', responseText);
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Moodle API response as JSON:', e);
      throw new Error(`Invalid JSON response from Moodle API: ${responseText}`);
    }
    
    // Log the parsed data
    console.log('Parsed Moodle API response:', data);
    
    if (data.exception || data.error) {
      return {
        exception: data.exception,
        error: data.error,
      };
    }
    
    return { data: data as T };
  } catch (error) {
    console.error('Moodle API error:', error);
    return {
      exception: {
        message: error instanceof Error ? error.message : 'Unknown error',
        errorcode: 'apicall_failed',
      },
    };
  }
}

/**
 * Checks if a user exists in Moodle by email
 */
export async function checkUserExists(email: string): Promise<{ exists: boolean; user?: MoodleUser }> {
  console.log(`Checking if user exists with email: ${email}`);
  
  // Normalize the email (lowercase) to ensure consistent matching
  const normalizedEmail = email.trim().toLowerCase();
  
  // Try the core_user_get_users method first
  const response = await callMoodleApi<any>('core_user_get_users', {
    criteria: [
      {
        key: 'email',
        value: normalizedEmail,
      },
    ],
  });
  
  console.log('Moodle API response for user check:', JSON.stringify(response));
  
  if (response.exception) {
    console.error('Error from Moodle API:', response.exception);
    return { exists: false };
  }
  
  if (!response.data) {
    console.log('No data returned from Moodle API');
    return { exists: false };
  }
  
  // Check the structure of the response
  console.log('Response data structure:', Object.keys(response.data));
  
  // Moodle might return the users in a nested structure
  let users = [];
  
  if (Array.isArray(response.data)) {
    // Direct array of users
    users = response.data;
    console.log(`Found ${users.length} users in array format`);
  } else if (response.data.users && Array.isArray(response.data.users)) {
    // Nested under 'users' property
    users = response.data.users;
    console.log(`Found ${users.length} users in nested format`);
  } else {
    console.log('Unexpected response structure from Moodle API');
    return { exists: false };
  }
  
  // Print each user found (for debugging)
  users.forEach((user: any, index: number) => {
    console.log(`User ${index}:`, JSON.stringify(user));
  });
  
  if (users.length === 0) {
    console.log('No users found with that email');
    return { exists: false };
  }
  
  // Alternative approach: try directly searching by email as a fallback
  if (users.length === 0) {
    console.log('Trying alternative search method...');
    const altResponse = await callMoodleApi<any>('core_user_get_users_by_field', {
      field: 'email',
      values: [normalizedEmail]
    });
    
    console.log('Alternative search response:', JSON.stringify(altResponse));
    
    if (altResponse.data && Array.isArray(altResponse.data) && altResponse.data.length > 0) {
      console.log('Found user with alternative method');
      return {
        exists: true,
        user: altResponse.data[0]
      };
    }
  }
  
  console.log(`User exists check result: ${users.length > 0}`);
  return {
    exists: users.length > 0,
    user: users.length > 0 ? users[0] : undefined,
  };
}

/**
 * Creates a new user in Moodle
 */
export async function createUser(userData: {
  email: string;
  firstname: string;
  lastname: string;
  password?: string | null;
}): Promise<{ success: boolean; user?: MoodleUser; error?: string }> {
  // Generate username from email (before @) with timestamp to ensure uniqueness
  // Adding a timestamp helps avoid conflicts if multiple users have similar email usernames
  const emailUsername = userData.email.split('@')[0].toLowerCase();
  const timestamp = new Date().getTime().toString().slice(-4); // Last 4 digits of timestamp
  const username = `${emailUsername}${timestamp}`;
  
  // Always use manual authentication method
  const authMethod = 'manual';
  
  // Use provided password or generate a secure one if not provided
  if (!userData.password) {
    console.log('Warning: No password provided for LMS registration. Using randomly generated password.');
  }
  
  const password = userData.password || Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10).toUpperCase();
  
  const userToCreate = {
    username,
    password,
    firstname: userData.firstname || username,
    lastname: userData.lastname || 'User',
    email: userData.email,
    auth: authMethod,
    idnumber: '',
    lang: 'en',
    calendartype: 'gregorian',
    theme: '',
    timezone: 'Asia/Kuala_Lumpur',
    mailformat: 1,
    description: '',
    city: '',
    country: 'MY',
    firstnamephonetic: '',
    lastnamephonetic: '',
    middlename: '',
    alternatename: '',
  };
  
  const response = await callMoodleApi<MoodleUser[]>('core_user_create_users', {
    users: [userToCreate],
  });
  
  if (response.exception || !response.data) {
    return { 
      success: false, 
      error: response.exception?.message || 'Failed to create user' 
    };
  }
  
  const createdUsers = Array.isArray(response.data) ? response.data : [];
  
  if (createdUsers.length === 0) {
    return { success: false, error: 'No user was created' };
  }
  
  return {
    success: true,
    user: createdUsers[0],
  };
}

/**
 * Gets user preferences
 */
export async function getUserPreferences(userId: number): Promise<Record<string, string>> {
  const response = await callMoodleApi<Record<string, string>>('core_user_get_user_preferences', {
    userid: userId,
  });
  
  if (response.exception || !response.data) {
    return {};
  }
  
  return response.data;
}

/**
 * Sets user preferences
 */
export async function setUserPreferences(
  userId: number,
  preferences: Record<string, string>
): Promise<boolean> {
  const formattedPreferences = Object.entries(preferences).map(([name, value]) => ({
    name,
    value,
    userid: userId,
  }));
  
  const response = await callMoodleApi('core_user_set_user_preferences', {
    preferences: formattedPreferences,
  });
  
  return !response.exception;
}

/**
 * Deletes a user
 */
export async function deleteUser(userId: number): Promise<boolean> {
  const response = await callMoodleApi('core_user_delete_users', {
    userids: [userId],
  });
  
  return !response.exception;
}

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
}): Promise<{ success: boolean; user?: MoodleUser; error?: string; password?: string }> {
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
  
  // Generate a password that meets Moodle requirements:
  // - Must include lowercase letters
  // - Must include uppercase letters
  // - Must include at least 1 special character (*, -, #, etc.)
  // - Should be reasonably strong
  const specialChars = "*-#$%&!?+=";
  const randomSpecialChar = specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  const password = userData.password || 
    Math.random().toString(36).slice(2, 8) + // lowercase and numbers
    Math.random().toString(36).slice(2, 8).toUpperCase() + // UPPERCASE and numbers
    randomSpecialChar; // At least one special character
  
  // Log the generated password for debugging purposes
  console.log(`[Moodle API] Generated password for ${userData.email}: ${password}`);
  
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
  
  let response;
  try {
    console.log('[Moodle API] Creating user with data:', {
      username: userToCreate.username,
      firstname: userToCreate.firstname,
      lastname: userToCreate.lastname,
      email: userToCreate.email,
      // Don't log the password for security
    });
    
    response = await callMoodleApi<MoodleUser[]>('core_user_create_users', {
      users: [userToCreate],
    });
    
    // Log the raw response for debugging
    console.log('[Moodle API] Raw create_users response:', JSON.stringify(response));
    
    if (response.exception || !response.data) {
      console.error('[Moodle API] Error creating user:', response.exception || 'No data returned');
      return { 
        success: false, 
        error: response.exception?.message || 'Failed to create user' 
      };
    }
  } catch (error) {
    console.error('[Moodle API] Exception in createUser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
  
  // If we reached here, we have a valid response with data
  if (!response || !response.data) {
    return { success: false, error: 'No response data available' };
  }
  
  const createdUsers = Array.isArray(response.data) ? response.data : [];
  
  if (createdUsers.length === 0) {
    return { success: false, error: 'No user was created' };
  }
  
  return {
    success: true,
    user: createdUsers[0],
    password: password // Include the password in the return value for debugging
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

/**
 * Get list of available Moodle courses
 */
export async function getCourses(): Promise<{ id: number; shortname: string; fullname: string; idnumber: string }[]> {
  const response = await callMoodleApi<any[]>('core_course_get_courses');
  
  if (response.exception || !response.data) {
    console.error('Error fetching Moodle courses:', response.exception?.message);
    return [];
  }
  
  // Map the response to a simpler structure
  return response.data.map(course => ({
    id: course.id,
    shortname: course.shortname,
    fullname: course.fullname,
    idnumber: course.idnumber || ''
  }));
}

/**
 * Enrolls a user in a course
 */
export async function enrollUserInCourse(
  userId: number,
  courseId: number,
  roleId: number = 5 // Default role ID for students
): Promise<{ success: boolean; error?: string }> {
  const response = await callMoodleApi('enrol_manual_enrol_users', {
    enrolments: [
      {
        roleid: roleId,
        userid: userId,
        courseid: courseId
      }
    ]
  });
  
  if (response.exception) {
    return { 
      success: false, 
      error: response.exception.message || 'Failed to enroll user in course'
    };
  }
  
  return {
    success: true
  };
}

/**
 * Creates a Moodle user and enrolls them in a course in one operation
 */
export async function createUserAndEnrollInCourse(
  userData: {
    email: string;
    firstname: string;
    lastname: string;
    password?: string | null;
  },
  courseId: number,
  roleId: number = 5 // Default role ID for students
): Promise<{ success: boolean; user?: MoodleUser; enrolled: boolean; error?: string; password?: string }> {
  // Check if user already exists
  const userCheck = await checkUserExists(userData.email);
  
  let userId: number;
  let createSuccess = false;
  let generatedPassword: string | undefined;
  
  if (userCheck.exists && userCheck.user) {
    // User already exists, use their ID
    userId = userCheck.user.id;
    createSuccess = true;
    console.log(`User already exists with ID ${userId}, will attempt to enroll in course`);
  } else {
    // Create new user
    const createResult = await createUser(userData);
    if (!createResult.success || !createResult.user) {
      return {
        success: false,
        enrolled: false,
        error: createResult.error || 'Failed to create user'
      };
    }
    userId = createResult.user.id;
    createSuccess = true;
    // Save password for later return
    generatedPassword = createResult.password;
  }
  
  // Enroll user in course
  if (createSuccess) {
    const enrollResult = await enrollUserInCourse(userId, courseId, roleId);
    
    if (!enrollResult.success) {
      return {
        success: true, // User creation succeeded
        enrolled: false,
        error: enrollResult.error || 'Failed to enroll user in course'
      };
    }
    
    // Return success with user data if we have it
    const result: { 
      success: boolean; 
      enrolled: boolean; 
      user?: MoodleUser; 
      password?: string 
    } = {
      success: true,
      enrolled: true
    };
    
    // Add user info if we have a user ID
    if (userId) {
      result.user = { 
        id: userId,
        username: '', // These fields aren't used but required by the type
        firstname: '',
        lastname: '',
        email: userData.email,
        auth: 'manual',
        confirmed: true
      };
    }
    
    // Add password if we have one
    if (generatedPassword) {
      result.password = generatedPassword;
    }
    
    return result;
  }
  
  return {
    success: false,
    enrolled: false,
    error: 'Failed to create or find user'
  };
}

/**
 * Updates a Moodle user's password
 */
export async function updateUserPassword(
  userId: number,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const response = await callMoodleApi('core_user_update_users', {
    users: [
      {
        id: userId,
        password: newPassword
      }
    ]
  });
  
  if (response.exception) {
    return { 
      success: false, 
      error: response.exception.message || 'Failed to update user password' 
    };
  }
  
  return {
    success: true
  };
}

/**
 * Joins a user to a course (ensures enrollment in the course)
 */
export async function joinCourse(
  email: string,
  courseId: number,
  roleId: number = 5 // Default role ID for students
): Promise<{ success: boolean; enrolled: boolean; error?: string }> {
  // First check if the user exists
  const userCheck = await checkUserExists(email);
  
  if (!userCheck.exists || !userCheck.user) {
    return {
      success: false,
      enrolled: false,
      error: `No Moodle account found with email ${email}`
    };
  }
  
  // User exists, enroll them in the course
  const enrollResult = await enrollUserInCourse(userCheck.user.id, courseId, roleId);
  
  if (!enrollResult.success) {
    return {
      success: false,
      enrolled: false,
      error: enrollResult.error || 'Failed to join course'
    };
  }
  
  return {
    success: true,
    enrolled: true
  };
}

/**
 * Get all courses a user is enrolled in
 * @param userId Moodle user ID
 * @returns Array of courses the user is enrolled in
 */
export async function getUserCourses(userId: number): Promise<{ id: number; shortname: string; fullname: string }[]> {
  try {
    const response = await callMoodleApi("core_enrol_get_users_courses", { userid: userId });
    
    if (isApiSuccess(response) && Array.isArray(response.data)) {
      return response.data.map(course => ({
        id: course.id,
        shortname: course.shortname,
        fullname: course.fullname,
      }));
    }
    
    console.error("[Moodle API] Error getting user courses:", response);
    return [];
  } catch (error) {
    console.error("[Moodle API] Exception getting user courses:", error);
    return [];
  }
}

/**
 * True if the api request succeeded
 * @param response 
 * @returns 
 */
export function isApiSuccess(response: any): boolean {
  return !response.exception && !response.error && !response.errorcode;
}

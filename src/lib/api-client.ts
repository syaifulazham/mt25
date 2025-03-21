/**
 * API client utility for making requests to the API
 */

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
};

/**
 * Makes a request to the API
 * @param endpoint The API endpoint to request
 * @param options Request options
 * @returns The response data
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, params } = options;

  // Build URL with query parameters
  let url = endpoint;
  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      url = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
    }
  }

  // Build request options
  const requestOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
  };

  // Add body if needed
  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    // Make the request
    console.log(`Making ${method} request to ${url}`);
    const response = await fetch(url, requestOptions);

    // Handle errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`API error (${response.status}):`, errorData);
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    // Parse and return the response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

/**
 * User API client
 */
export const userApi = {
  /**
   * Get all users
   */
  getUsers: (params?: {
    role?: string;
    isActive?: boolean;
    search?: string;
  }) => apiRequest<any[]>('/api/users', { params }),

  /**
   * Get a user by ID
   */
  getUser: (id: string) => apiRequest<any>(`/api/users/${id}`),

  /**
   * Create a new user
   */
  createUser: (userData: any) => apiRequest<any>('/api/users', {
    method: 'POST',
    body: userData,
  }),

  /**
   * Update a user
   */
  updateUser: (id: string, userData: any) => apiRequest<any>(`/api/users/${id}`, {
    method: 'PATCH',
    body: userData,
  }),

  /**
   * Delete a user
   */
  deleteUser: (id: string) => apiRequest<{ success: boolean }>(`/api/users/${id}`, {
    method: 'DELETE',
  }),

  /**
   * Reset a user's password
   */
  resetPassword: (id: string) => apiRequest<{ success: boolean; temporaryPassword?: string }>(`/api/users/${id}/reset-password`, {
    method: 'POST',
  }),
};

/**
 * Reference Data API client
 */
export const referenceDataApi = {
  /**
   * Get all reference data
   */
  getReferenceData: (params?: {
    type?: string;
    isActive?: boolean;
    search?: string;
  }) => apiRequest<any[]>('/api/reference-data', { params }),

  /**
   * Get a reference data item by ID
   */
  getReferenceDataItem: (id: string) => apiRequest<any>(`/api/reference-data/${id}`),

  /**
   * Create a new reference data item
   */
  createReferenceData: (data: any) => apiRequest<any>('/api/reference-data', {
    method: 'POST',
    body: data,
  }),

  /**
   * Update a reference data item
   */
  updateReferenceData: (id: string, data: any) => apiRequest<any>(`/api/reference-data/${id}`, {
    method: 'PATCH',
    body: data,
  }),

  /**
   * Delete a reference data item
   */
  deleteReferenceData: (id: string) => apiRequest<{ success: boolean }>(`/api/reference-data/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * Zone API client
 */
export const zoneApi = {
  /**
   * Get all zones
   */
  getZones: (params?: {
    search?: string;
  }) => apiRequest<any[]>('/api/zones', { params }),

  /**
   * Get a zone by ID
   */
  getZone: (id: string) => apiRequest<any>(`/api/zones/${id}`),

  /**
   * Create a new zone
   */
  createZone: (data: { name: string }) => apiRequest<any>('/api/zones', {
    method: 'POST',
    body: data,
  }),

  /**
   * Update a zone
   */
  updateZone: (id: string, data: { name: string }) => apiRequest<any>(`/api/zones/${id}`, {
    method: 'PATCH',
    body: data,
  }),

  /**
   * Delete a zone
   */
  deleteZone: (id: string) => apiRequest<{ success: boolean }>(`/api/zones/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * State API client
 */
export const stateApi = {
  /**
   * Get all states
   */
  getStates: (params?: {
    search?: string;
    zoneId?: string | number;
  }) => apiRequest<any[]>('/api/states', { params }),

  /**
   * Get a state by ID
   */
  getState: (id: string) => apiRequest<any>(`/api/states/${id}`),

  /**
   * Create a new state
   */
  createState: (data: { name: string; zoneId: number }) => apiRequest<any>('/api/states', {
    method: 'POST',
    body: data,
  }),

  /**
   * Update a state
   */
  updateState: (id: string, data: { name: string; zoneId: number }) => apiRequest<any>(`/api/states/${id}`, {
    method: 'PATCH',
    body: data,
  }),

  /**
   * Delete a state
   */
  deleteState: (id: string) => apiRequest<{ success: boolean }>(`/api/states/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * School API client
 */
export const schoolApi = {
  /**
   * Get all schools
   */
  getSchools: async (params?: { 
    search?: string;
    stateId?: string | number;
    level?: string;
    category?: string;
  }) => {
    return apiRequest<any[]>('/api/schools', { params });
  },

  /**
   * Get all schools paginated
   */
  getSchoolsPaginated: async (params?: { 
    search?: string;
    stateId?: string | number;
    level?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  }) => {
    return apiRequest<{
      data: any[];
      totalCount: number;
      totalPages: number;
      currentPage: number;
    }>('/api/schools/paginated', { params });
  },

  /**
   * Get a school by ID
   */
  getSchool: async (id: string) => {
    return apiRequest<any>(`/api/schools/${id}`);
  },

  /**
   * Create a new school
   */
  createSchool: (data: {
    name: string;
    code: string;
    level: string;
    category: string;
    ppd?: string | null;
    address?: string | null;
    city?: string | null;
    postcode?: string | null;
    stateId: number;
    latitude?: number | null;
    longitude?: number | null;
  }) => apiRequest<any>('/api/schools', {
    method: 'POST',
    body: data,
  }),

  /**
   * Update a school
   */
  updateSchool: (id: string, data: {
    name: string;
    code: string;
    level: string;
    category: string;
    ppd?: string | null;
    address?: string | null;
    city?: string | null;
    postcode?: string | null;
    stateId: number;
    latitude?: number | null;
    longitude?: number | null;
  }) => apiRequest<any>(`/api/schools/${id}`, {
    method: 'PATCH',
    body: data,
  }),

  /**
   * Delete a school
   */
  deleteSchool: (id: string) => apiRequest<{ success: boolean }>(`/api/schools/${id}`, {
    method: 'DELETE',
  }),

  /**
   * Upload schools from CSV
   */
  uploadSchoolsCsv: (formData: FormData) => {
    return fetch('/api/schools/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }).then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.error || `Upload failed with status ${response.status}`);
        });
      }
      return response.json();
    });
  },
};

/**
 * Higher Institution API client
 */
export const higherInstitutionApi = {
  /**
   * Get all higher institutions
   */
  getHigherInstitutions: (params?: {
    search?: string;
    stateId?: string | number;
  }) => apiRequest<any[]>('/api/higher-institutions', { params }),

  /**
   * Get higher institutions with pagination
   */
  getHigherInstitutionsPaginated: (params?: { 
    search?: string;
    stateId?: string | number;
    page?: number;
    pageSize?: number;
  }) => apiRequest<{
    data: any[];
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    }
  }>('/api/higher-institutions/paginated', { params }),

  /**
   * Get a higher institution by ID
   */
  getHigherInstitution: (id: string) => apiRequest<any>(`/api/higher-institutions/${id}`),

  /**
   * Create a new higher institution
   */
  createHigherInstitution: (data: {
    name: string;
    code: string;
    address?: string | null;
    city?: string | null;
    postcode?: string | null;
    stateId: number;
    latitude?: number | null;
    longitude?: number | null;
  }) => apiRequest<any>('/api/higher-institutions', {
    method: 'POST',
    body: data,
  }),

  /**
   * Update a higher institution
   */
  updateHigherInstitution: (id: string, data: {
    name: string;
    code: string;
    address?: string | null;
    city?: string | null;
    postcode?: string | null;
    stateId: number;
    latitude?: number | null;
    longitude?: number | null;
  }) => apiRequest<any>(`/api/higher-institutions/${id}`, {
    method: 'PATCH',
    body: data,
  }),

  /**
   * Delete a higher institution
   */
  deleteHigherInstitution: (id: string) => apiRequest<{ success: boolean }>(`/api/higher-institutions/${id}`, {
    method: 'DELETE',
  }),

  /**
   * Upload higher institutions from CSV
   */
  uploadHigherInstitutionsCsv: (formData: FormData) => {
    return fetch('/api/higher-institutions/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }).then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.error || `Upload failed with status ${response.status}`);
        });
      }
      return response.json();
    });
  },
};

/**
 * Target Group API client
 */
export const targetGroupApi = {
  /**
   * Get all target groups with optional search
   */
  async getTargetGroups(search?: string) {
    const url = search 
      ? `/api/target-groups?search=${encodeURIComponent(search)}` 
      : '/api/target-groups';
    
    return apiRequest(url);
  },
  
  /**
   * Get target groups with pagination
   */
  async getTargetGroupsPaginated(params?: { 
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    return apiRequest('/api/target-groups', {
      params: {
        search: params?.search,
        page: params?.page,
        pageSize: params?.pageSize
      }
    });
  },
  
  /**
   * Get a specific target group by ID
   */
  async getTargetGroup(id: number) {
    return apiRequest(`/api/target-groups/${id}`);
  },
  
  /**
   * Create a new target group
   */
  async createTargetGroup(data: any) {
    return apiRequest('/api/target-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  /**
   * Update an existing target group
   */
  async updateTargetGroup(id: number, data: any) {
    return apiRequest(`/api/target-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  /**
   * Delete a target group
   */
  async deleteTargetGroup(id: number) {
    return apiRequest(`/api/target-groups/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Contest API client
 */
export const contestApi = {
  /**
   * Get all contests with optional filters
   */
  async getContests(filters?: { search?: string; contestType?: string; status?: string }) {
    return apiRequest('/api/contests', {
      params: filters,
    });
  },

  /**
   * Get a specific contest by ID
   */
  async getContest(id: number) {
    return apiRequest(`/api/contests/${id}`);
  },

  /**
   * Create a new contest
   */
  async createContest(data: any) {
    return apiRequest('/api/contests', {
      method: 'POST',
      body: data,
    });
  },

  /**
   * Update an existing contest
   */
  async updateContest(id: number, data: any) {
    return apiRequest(`/api/contests/${id}`, {
      method: 'PATCH',
      body: data,
    });
  },

  /**
   * Delete a contest
   */
  async deleteContest(id: number) {
    return apiRequest(`/api/contests/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Theme API client
 */
export const themeApi = {
  /**
   * Get all themes with optional search
   */
  getThemes(search?: string) {
    return apiRequest<any[]>('/api/themes', {
      params: { search }
    });
  },

  /**
   * Get themes with pagination
   */
  getThemesPaginated(params?: { 
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    return apiRequest<{ data: any[]; meta: any }>('/api/themes', {
      params
    });
  },

  /**
   * Get a specific theme by ID
   */
  getTheme(id: number | string) {
    return apiRequest<any>(`/api/themes/${id}`);
  },

  /**
   * Create a new theme
   */
  createTheme(data: {
    name: string;
    color?: string | null;
    logoPath?: string | null;
    description?: string | null;
  }) {
    return apiRequest<any>('/api/themes', {
      method: 'POST',
      body: data
    });
  },

  /**
   * Update an existing theme
   */
  updateTheme(id: number | string, data: {
    name: string;
    color?: string | null;
    logoPath?: string | null;
    description?: string | null;
  }) {
    return apiRequest<any>(`/api/themes/${id}`, {
      method: 'PUT',
      body: data
    });
  },

  /**
   * Delete a theme
   */
  deleteTheme(id: number | string) {
    return apiRequest<any>(`/api/themes/${id}`, {
      method: 'DELETE'
    });
  }
};

/**
 * Judging Template API client
 */
export const judgingTemplateApi = {
  // Get all judging templates
  getJudgingTemplates: async (contestType?: string) => {
    const queryParams = contestType ? `?contestType=${contestType}` : '';
    return apiRequest(`/api/judging-templates${queryParams}`);
  },

  // Get a specific judging template
  getJudgingTemplate: async (id: string) => {
    return apiRequest(`/api/judging-templates/${id}`);
  },

  // Create a new judging template
  createJudgingTemplate: async (templateData: any) => {
    return apiRequest('/api/judging-templates', {
      method: 'POST',
      body: JSON.stringify(templateData)
    });
  },

  // Update a judging template
  updateJudgingTemplate: async (id: string, templateData: any) => {
    return apiRequest(`/api/judging-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData)
    });
  },

  // Delete a judging template
  deleteJudgingTemplate: async (id: string) => {
    return apiRequest(`/api/judging-templates/${id}`, {
      method: 'DELETE'
    });
  },

  // Get a contest's judging template
  getContestJudgingTemplate: async (contestId: string) => {
    return apiRequest(`/api/contests/${contestId}/judging-template`);
  },

  // Assign a judging template to a contest
  assignJudgingTemplate: async (contestId: string, templateId: string | null) => {
    return apiRequest(`/api/contests/${contestId}/judging-template`, {
      method: 'PUT',
      body: JSON.stringify({ templateId })
    });
  }
};

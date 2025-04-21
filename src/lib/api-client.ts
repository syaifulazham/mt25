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
    credentials: 'include', // Always include cookies for authentication
  };

  // Add body if needed
  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, requestOptions);

    // Handle API errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `API request failed with status ${response.status}`;
      
      // Log more details in development
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
      }
      
      throw new Error(errorMessage);
    }

    // Parse JSON response
    const data = await response.json();
    return data as T;
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
      body: data,
    });
  },
  
  /**
   * Update an existing target group
   */
  async updateTargetGroup(id: number, data: any) {
    return apiRequest(`/api/target-groups/${id}`, {
      method: 'PUT',
      body: data,
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

  /**
   * Upload target groups from CSV
   */
  async uploadTargetGroupsCsv(formData: FormData) {
    return apiRequest('/api/target-groups/upload', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, browser will set it with boundary for FormData
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
      method: 'PATCH',
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
  /**
   * Get all judging templates
   */
  async getJudgingTemplates(contestType?: string) {
    try {
      const params = contestType ? { contestType } : undefined;
      return await apiRequest('/api/judging-templates', { params });
    } catch (error) {
      console.error('Error fetching judging templates:', error);
      throw error;
    }
  },

  /**
   * Get a specific judging template
   */
  async getJudgingTemplate(id: string) {
    try {
      return await apiRequest(`/api/judging-templates/${id}`);
    } catch (error) {
      console.error(`Error fetching judging template ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new judging template
   */
  async createJudgingTemplate(templateData: any) {
    try {
      return await apiRequest('/api/judging-templates', {
        method: 'POST',
        body: templateData,
      });
    } catch (error) {
      console.error('Error creating judging template:', error);
      throw error;
    }
  },

  /**
   * Update a judging template
   */
  async updateJudgingTemplate(id: string, templateData: any) {
    try {
      return await apiRequest(`/api/judging-templates/${id}`, {
        method: 'PUT',
        body: templateData,
      });
    } catch (error) {
      console.error(`Error updating judging template ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a judging template
   */
  async deleteJudgingTemplate(id: string) {
    try {
      return await apiRequest(`/api/judging-templates/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`Error deleting judging template ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get a contest's judging template
   */
  async getContestJudgingTemplate(contestId: string) {
    try {
      return await apiRequest(`/api/contests/${contestId}/judging-template`);
    } catch (error) {
      console.error(`Error fetching contest ${contestId} judging template:`, error);
      throw error;
    }
  },

  /**
   * Assign a judging template to a contest
   */
  async assignJudgingTemplate(contestId: string, templateId: string | null) {
    try {
      return await apiRequest(`/api/contests/${contestId}/judging-template`, {
        method: 'PUT',
        body: { templateId },
      });
    } catch (error) {
      console.error(`Error assigning judging template to contest ${contestId}:`, error);
      throw error;
    }
  }
};

/**
 * Announcement API client
 */
export const announcementApi = {
  /**
   * Get all announcements with optional search and filters
   */
  getAnnouncements(params?: { 
    search?: string;
    activeOnly?: boolean;
  }) {
    return apiRequest<any[]>('/api/announcements', {
      params
    });
  },

  /**
   * Get announcements with pagination
   */
  getAnnouncementsPaginated(params?: { 
    search?: string;
    activeOnly?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    return apiRequest<{ data: any[]; meta: any }>('/api/announcements', {
      params
    });
  },

  /**
   * Get a specific announcement by ID
   */
  getAnnouncement(id: number | string) {
    return apiRequest<any>(`/api/announcements/${id}`);
  },

  /**
   * Create a new announcement
   */
  createAnnouncement(data: {
    title: string;
    description: string;
    icon?: string;
    link?: string;
    linkText?: string;
  }) {
    return apiRequest<any>('/api/announcements', {
      method: 'POST',
      body: data
    });
  },

  /**
   * Update an announcement
   */
  updateAnnouncement(id: number | string, data: {
    title?: string;
    description?: string;
    icon?: string;
    link?: string;
    linkText?: string;
    isActive?: boolean;
  }) {
    return apiRequest<any>(`/api/announcements/${id}`, {
      method: 'PUT',
      body: data
    });
  },

  /**
   * Delete an announcement
   */
  deleteAnnouncement(id: number | string) {
    return apiRequest<{ success: boolean }>(`/api/announcements/${id}`, {
      method: 'DELETE'
    });
  }
};

/**
 * News API client
 */
export const newsApi = {
  /**
   * Get all news with optional search and filters
   */
  getNews(params?: { 
    search?: string;
    publishedOnly?: boolean;
    featuredOnly?: boolean;
  }) {
    return apiRequest<any[]>('/api/news', {
      params
    });
  },

  /**
   * Get news with pagination
   */
  getNewsPaginated(params?: { 
    search?: string;
    publishedOnly?: boolean;
    featuredOnly?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    return apiRequest<{ data: any[]; meta: any }>('/api/news', {
      params
    });
  },

  /**
   * Get a specific news item by ID
   */
  getNewsItem(id: number | string) {
    return apiRequest<any>(`/api/news/${id}`);
  },

  /**
   * Create a new news item
   */
  createNews(data: {
    title: string;
    excerpt: string;
    content: string;
    coverImage?: string;
    readTime?: string;
    author?: string;
    featured?: boolean;
    isPublished?: boolean;
    slug?: string;
  }) {
    return apiRequest<any>('/api/news', {
      method: 'POST',
      body: data
    });
  },

  /**
   * Update a news item
   */
  updateNews(id: number | string, data: {
    title?: string;
    excerpt?: string;
    content?: string;
    coverImage?: string;
    readTime?: string;
    author?: string;
    featured?: boolean;
    isPublished?: boolean;
    slug?: string;
  }) {
    return apiRequest<any>(`/api/news/${id}`, {
      method: 'PUT',
      body: data
    });
  },

  /**
   * Delete a news item
   */
  deleteNews(id: number | string) {
    return apiRequest<{ success: boolean }>(`/api/news/${id}`, {
      method: 'DELETE'
    });
  }
};

/**
 * Event API client
 */
export const eventApi = {
  /**
   * Get all events with optional filters
   */
  getEvents: (filters?: { search?: string; activeOnly?: boolean; addressState?: string; scopeArea?: string }) =>
    apiRequest<any[]>('/api/events', { params: filters }),

  /**
   * Get events with pagination
   */
  getEventsPaginated: (params?: { 
    search?: string;
    activeOnly?: boolean;
    addressState?: string;
    scopeArea?: string;
    page?: number;
    pageSize?: number;
  }) => apiRequest<{ data: any[]; meta: any }>('/api/events/paginated', { params }),

  /**
   * Get a specific event by ID
   */
  getEvent: (id: number | string) =>
    apiRequest<any>(`/api/events/${id}`),

  /**
   * Create a new event
   */
  createEvent: (data: {
    name: string;
    code: string;
    description?: string | null;
    startDate: Date;
    endDate: Date;
    venue?: string | null;
    address?: string | null;
    city?: string | null;
    addressState?: string | null;
    scopeArea?: 'NATIONAL' | 'ZONE' | 'STATE' | 'OPEN';
    zoneId?: number | null;
    stateId?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    isActive?: boolean;
  }) => apiRequest<any>('/api/events', {
    method: 'POST',
    body: data,
  }),

  /**
   * Update an existing event
   */
  updateEvent: (id: number | string, data: {
    name?: string;
    code?: string;
    description?: string | null;
    startDate?: Date;
    endDate?: Date;
    venue?: string | null;
    address?: string | null;
    city?: string | null;
    addressState?: string | null;
    scopeArea?: 'NATIONAL' | 'ZONE' | 'STATE' | 'OPEN';
    zoneId?: number | null;
    stateId?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    isActive?: boolean;
  }) => apiRequest<any>(`/api/events/${id}`, {
    method: 'PATCH',
    body: data,
  }),

  /**
   * Delete an event
   */
  deleteEvent: (id: number | string) =>
    apiRequest<{ success: boolean; message: string }>(`/api/events/${id}`, {
      method: 'DELETE',
    }),
};

/**
 * API client for contingent management
 */
const contingentApi = {
  // Get participant's contingents
  async getUserContingents(participantId: number) {
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const response = await fetch(`/api/participants/contingents?participantId=${participantId}&t=${timestamp}`, {
        // Add cache: 'no-store' to prevent caching issues
        cache: 'no-store',
        // Add cache control headers to bypass cache
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contingents');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching contingents:', error);
      throw error;
    }
  },

  // Search schools
  async searchSchools(query: string) {
    try {
      const response = await fetch(`/api/schools?search=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to search schools');
      }
      return response.json();
    } catch (error) {
      console.error('Error searching schools:', error);
      throw error;
    }
  },

  // Search higher institutions
  async searchHigherInstitutions(query: string) {
    try {
      const response = await fetch(`/api/higher-institutions?search=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to search higher institutions');
      }
      return response.json();
    } catch (error) {
      console.error('Error searching higher institutions:', error);
      throw error;
    }
  },

  // Create a new contingent
  async createContingent(data: any) {
    console.log('Creating contingent with data:', data);
    
    // If managerIds is not provided, initialize it as an empty array
    if (!data.managerIds) {
      data.managerIds = [];
    }
    
    // Add a retry mechanism for contingent creation
    let retries = 3;
    let response;
    let responseData;
    
    while (retries > 0) {
      try {
        response = await fetch('/api/participants/contingents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        responseData = await response.json();
        console.log('API response:', responseData);
        
        if (response.ok) {
          break; // Success, exit the retry loop
        } else {
          throw new Error(responseData.error || 'Failed to create contingent');
        }
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw error; // Rethrow the error after all retries fail
        }
        console.log(`Retrying contingent creation... ${retries} attempts left`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
      }
    }
    
    return responseData;
  },

  // Request to join a contingent
  // Upload contingent logo
  async uploadLogo(contingentId: number, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contingentId', contingentId.toString());
    
    const response = await fetch('/api/upload/contingent-logo', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload logo');
    }
    
    const result = await response.json();
    return result.fileUrl;
  },

  // Update contingent details
  async updateContingentDetails(contingentId: number, data: { short_name?: string, logoFile?: File }) {
    // Create update data object
    const updateData: { short_name?: string, logoUrl?: string } = {};
    
    // Add short_name if provided
    if (data.short_name) {
      updateData.short_name = data.short_name;
    }
    
    // If there's a logo file, upload it first
    if (data.logoFile) {
      updateData.logoUrl = await this.uploadLogo(contingentId, data.logoFile);
    }
    
    // Now update the contingent with all data
    try {

      const response = await fetch(`/api/participants/contingents/${contingentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update contingent details');
      }

      return response.json();
    } catch (error) {
      console.error('Error updating contingent details:', error);
      throw error;
    }
  },

  // Get pending requests for a contingent
  async getContingentRequests(contingentId: number) {
    try {
      const response = await fetch(`/api/participants/contingent-requests?contingentId=${contingentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contingent requests');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching contingent requests:', error);
      throw error;
    }
  },

  // Approve or reject a contingent request
  async updateContingentRequest(requestId: number, status: 'APPROVED' | 'REJECTED') {
    try {
      const response = await fetch(`/api/participants/contingent-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update request');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error updating contingent request:', error);
      throw error;
    }
  },
};

export default contingentApi;

// Type definitions for use with the API
export interface School {
  id: number;
  name: string;
  code: string;
  level: string;
  category: string;
  state: {
    name: string;
  };
}

export interface HigherInstitution {
  id: number;
  name: string;
  code: string;
  state: {
    name: string;
  };
}

export interface Contingent {
  id: number;
  name: string;
  description: string;
  school: School | null;
  higherInstitution: HigherInstitution | null;
  isManager: boolean;
  isOwner: boolean;
  status: 'ACTIVE' | 'PENDING';
  memberCount: number;
  managerCount?: number;
  short_name?: string;
  logoUrl?: string;
}

export interface ContingentRequest {
  id: number;
  userId: number;
  contingentId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

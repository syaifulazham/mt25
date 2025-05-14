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
  async createContingent(data: CreateContingentRequest) {
    console.log('Creating contingent with data:', data);
    
    // If managerIds is not provided, initialize it as an empty array
    data.managerIds = data.managerIds || [];

    try {
      const response = await fetch('/api/participants/contingents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create contingent');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating contingent:', error);
      throw error;
    }
  },

  // Request to join a contingent
  async requestToJoinContingent(data: { participantId: number, institutionType: string, institutionId: number }) {
    try {
      const response = await fetch('/api/participants/contingent-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to request joining contingent');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error requesting to join contingent:', error);
      throw error;
    }
  },
  
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
  async updateContingentDetails(contingentId: number, data: { name?: string, short_name?: string, logoFile?: File }) {
    // Create a FormData object if we have a logo file
    if (data.logoFile) {
      const formData = new FormData();
      formData.append('contingentId', contingentId.toString());
      if (data.name) {
        formData.append('name', data.name);
      }
      if (data.short_name) {
        formData.append('short_name', data.short_name);
      }
      formData.append('logoFile', data.logoFile);

      try {
        const response = await fetch(`/api/participants/contingents/${contingentId}`, {
          method: 'PATCH',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update contingent details');
        }
        
        return response.json();
      } catch (error) {
        console.error('Error updating contingent details:', error);
        throw error;
      }
    } else {
      // Just update the text fields
      const response = await fetch(`/api/participants/contingents/${contingentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          short_name: data.short_name,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update contingent details');
      }
      
      return response.json();
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
  
  // Leave/quit a contingent
  async leaveContingent(contingentId: number, participantId: number) {
    try {
      const response = await fetch(`/api/participants/contingents/${contingentId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave contingent');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error leaving contingent:', error);
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
  state?: {
    name: string;
  };
}

export interface HigherInstitution {
  id: number;
  name: string;
  code: string;
  state?: {
    name: string;
  };
}

export interface Independent {
  id: number;
  name: string;
  address?: string;
  town?: string;
  postcode?: string;
  stateId: number;
  institution?: string;
  type: 'PARENT' | 'YOUTH_GROUP';
  state?: {
    name: string;
  };
}

export interface Contingent {
  id: number;
  name: string;
  description: string;
  contingentType: 'SCHOOL' | 'HIGHER_INST' | 'INDEPENDENT';
  school: School | null;
  higherInstitution: HigherInstitution | null;
  independent: Independent | null;
  isManager: boolean;
  isOwner: boolean;
  status: 'ACTIVE' | 'PENDING';
  memberCount: number;
  managerCount?: number;
  short_name?: string;
  logoUrl?: string;
}

export interface CreateContingentRequest {
  name: string;
  description?: string;
  short_name?: string;
  participantId: number;
  managedByParticipant?: boolean;
  contingentType: 'SCHOOL' | 'HIGHER_INST' | 'INDEPENDENT';
  schoolId?: number;
  higherInstId?: number;
  independentData?: {
    name: string;
    address?: string;
    town?: string;
    postcode?: string;
    stateId: number;
    institution?: string;
    type: 'PARENT' | 'YOUTH_GROUP';
  };
  managerIds?: number[];
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

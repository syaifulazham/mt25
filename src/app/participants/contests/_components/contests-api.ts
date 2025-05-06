/**
 * API client for contests
 */
const contestsApi = {
  // Get all contests with their target groups
  async getContests() {
    try {
      const response = await fetch('/api/participants/contests/with-target-groups', {
        cache: 'no-store', // Don't cache this request
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch contests');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching contests:', error);
      throw error;
    }
  },

  // Get contest details
  async getContestDetails(contestId: number) {
    try {
      const response = await fetch(`/api/participants/contests/${contestId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch contest details');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching contest details:', error);
      throw error;
    }
  }
};

export default contestsApi;

// Types
export interface Theme {
  id?: number;
  name?: string;
  color: string;
  logoPath?: string;
}

export interface TargetGroup {
  id: number;
  code: string;
  name: string;
  ageGroup: string;
  schoolLevel: string;
  maxAge: number;
  minAge: number;
}

export interface Contest {
  id: number;
  name: string;
  code: string;
  description: string | null;
  contestType: string;
  startDate: string;
  endDate: string;
  participation_mode: string;
  targetGroups: TargetGroup[];
  theme: Theme;
}

export interface ContestGroupedByTarget {
  targetGroup: TargetGroup;
  contests: Contest[];
}

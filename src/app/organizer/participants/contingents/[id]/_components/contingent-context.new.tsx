"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toast } from '@/components/ui/use-toast';

// Define types for our contingent data
interface ContingentDetails {
  id: number;
  name: string;
  short_name: string;
  logoUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  schoolId: number | null;
  schoolName?: string;
  higherInstId: number | null;
  higherInstName?: string;
  participantId: number | null;
  managedByParticipant: boolean;
  managerCount: number;
  contestantCount: number;
  teamCount: number;
}

interface Contestant {
  id: number;
  name: string;
  ic: string;
  gender: string;
  edu_level: string;
  class_grade: string;
  class_name?: string;
  email?: string;
  phone?: string;
  contingentId: number;
  createdAt: string;
  updatedAt: string;
  status?: string;
}

interface Team {
  id: number;
  name: string;
  hashcode?: string;
  description?: string;
  contestId: number;
  contestName?: string;
  contingentId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  maxMembers?: number;
  memberCount?: number;
}

interface ContingentContextType {
  contingent: ContingentDetails | null;
  contestants: Contestant[];
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  refreshContingent: () => Promise<void>;
  refreshContestants: () => Promise<void>;
  refreshTeams: () => Promise<void>;
}

// Create the context
const ContingentContext = createContext<ContingentContextType | undefined>(undefined);

// Provider component
export function ContingentProvider({ children, contingentId }: {
  children: ReactNode;
  contingentId: string | number;
}) {
  // Convert to number if string
  const numericId = typeof contingentId === 'string' ? parseInt(contingentId, 10) : contingentId;
  
  const [contingent, setContingent] = useState<ContingentDetails | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const devMode = process.env.NODE_ENV === 'development';

  // Development mode sample data
  const sampleContingent: ContingentDetails = {
    id: numericId,
    name: 'Sample Contingent (Dev Mode)',
    short_name: 'SAMPLE',
    logoUrl: 'https://placekitten.com/200/200',
    description: 'This is a sample contingent for development',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schoolId: 1,
    schoolName: 'Sample School',
    higherInstId: null,
    higherInstName: '',
    participantId: null,
    managedByParticipant: true,
    managerCount: 1,
    contestantCount: 2,
    teamCount: 1
  };

  const sampleContestants: Contestant[] = [
    {
      id: 1,
      name: 'Sample Contestant 1',
      ic: '990101012345',
      gender: 'MALE',
      edu_level: 'Sekolah Rendah',
      class_grade: '3',
      class_name: 'Cerdik',
      email: 'sample1@example.com',
      phone: '0123456789',
      contingentId: numericId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ACTIVE'
    },
    {
      id: 2,
      name: 'Sample Contestant 2',
      ic: '990101054321',
      gender: 'FEMALE',
      edu_level: 'Sekolah Rendah',
      class_grade: '4',
      class_name: 'Bijak',
      email: 'sample2@example.com',
      phone: '0123456789',
      contingentId: numericId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ACTIVE'
    }
  ];

  const sampleTeams: Team[] = [
    {
      id: 1,
      name: 'Sample Team Alpha',
      hashcode: 'TEAM-ABC123',
      description: 'A sample team for testing',
      contestId: 1,
      contingentId: numericId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      maxMembers: 4,
      memberCount: 2,
      contestName: 'Sample Contest',
    }
  ];

  // Fetch contingent details
  const fetchContingent = async () => {
    try {
      setIsLoading(true);
      
      // In development mode, use sample data
      if (devMode) {
        console.log('DEV MODE: Using sample contingent data');
        setContingent(sampleContingent);
        setIsLoading(false);
        return;
      }
      
      // Production mode - fetch real data
      const response = await fetch(`/api/organizer/contingents/${numericId}`);
      
      if (response.status === 401) {
        console.error('Authentication required. User is not logged in.');
        setError("Authentication required");
        toast({
          title: "Authentication required",
          description: "Please log in as an organizer to view this content",
          variant: "destructive",
          action: (
            <button 
              className="bg-primary text-white px-3 py-1 rounded-md text-sm" 
              onClick={() => window.location.href = '/auth/organizer/login'}
            >
              Login
            </button>
          ),
        });
        
        // In development, still show sample data
        if (devMode) {
          console.log('DEV MODE: Using sample data even after auth error');
          setContingent(sampleContingent);
        }
        
        setIsLoading(false);
        return;
      }

      if (response.status === 403) {
        console.error('Insufficient permissions to access this contingent.');
        setError("Insufficient permissions");
        
        // In development, still show sample data
        if (devMode) {
          console.log('DEV MODE: Using sample data even after permission error');
          setContingent(sampleContingent);
        }
        
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      
      if (response.ok) {
        console.log('Contingent data received:', data);
        setContingent(data);
      } else {
        console.error('Failed to fetch contingent:', data.error);
        setError(`Failed to load contingent: ${data.error || 'Unknown error'}`);
        
        // In development, use sample data as fallback
        if (devMode) {
          console.log('DEV MODE: Using sample contingent data after API error');
          setContingent(sampleContingent);
        }
      }
    } catch (err) {
      console.error('Error fetching contingent:', err);
      setError('Failed to load contingent details');
      
      // In development, use sample data as fallback
      if (devMode) {
        console.log('DEV MODE: Using sample contingent data after error');
        setContingent(sampleContingent);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch contestants
  const fetchContestants = async () => {
    try {
      setIsLoading(true);
      
      // In development mode, use sample data
      if (devMode) {
        console.log('DEV MODE: Using sample contestants data');
        setContestants(sampleContestants);
        setIsLoading(false);
        return;
      }
      
      // Production mode - fetch real data
      const response = await fetch(`/api/organizer/contingents/${numericId}/contestants`);
      
      if (response.status === 401) {
        console.error('Authentication required. User is not logged in.');
        setError("Authentication required for contestant access");
        toast({
          title: "Authentication required",
          description: "Please log in as an organizer to access contestants",
          variant: "destructive",
          action: (
            <button 
              className="bg-primary text-white px-3 py-1 rounded-md text-sm" 
              onClick={() => window.location.href = '/auth/organizer/login'}
            >
              Login
            </button>
          ),
        });
        
        // In development, still show sample data
        if (devMode) {
          console.log('DEV MODE: Using sample data even after auth error');
          setContestants(sampleContestants);
        }
        
        setIsLoading(false);
        return;
      }

      if (response.status === 403) {
        console.error('Insufficient permissions to access contestants.');
        setError("Insufficient permissions for contestants");
        
        // In development, still show sample data
        if (devMode) {
          console.log('DEV MODE: Using sample data even after permission error');
          setContestants(sampleContestants);
        }
        
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      
      if (response.ok) {
        console.log(`Received ${data.length} contestants:`, data);
        setContestants(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch contestants:', data.error);
        setError(`Failed to load contestants: ${data.error || 'Unknown error'}`);
        
        // In development, use sample data as fallback
        if (devMode) {
          console.log('DEV MODE: Using sample contestants data after API error');
          setContestants(sampleContestants);
        }
      }
    } catch (err) {
      console.error('Error fetching contestants:', err);
      setError('Failed to load contestants');
      
      // In development, use sample data as fallback
      if (devMode) {
        console.log('DEV MODE: Using sample contestants data after error');
        setContestants(sampleContestants);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch teams
  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      
      // In development mode, use sample data
      if (devMode) {
        console.log('DEV MODE: Using sample teams data');
        setTeams(sampleTeams);
        setIsLoading(false);
        return;
      }
      
      // Production mode - fetch real data
      const response = await fetch(`/api/organizer/contingents/${numericId}/teams`);
      
      if (response.status === 401) {
        console.error('Authentication required. User is not logged in.');
        setError("Authentication required for team access");
        toast({
          title: "Authentication required",
          description: "Please log in as an organizer to access teams",
          variant: "destructive",
          action: (
            <button 
              className="bg-primary text-white px-3 py-1 rounded-md text-sm" 
              onClick={() => window.location.href = '/auth/organizer/login'}
            >
              Login
            </button>
          ),
        });
        
        // In development, still show sample data
        if (devMode) {
          console.log('DEV MODE: Using sample data even after auth error');
          setTeams(sampleTeams);
        }
        
        setIsLoading(false);
        return;
      }

      if (response.status === 403) {
        console.error('Insufficient permissions to access teams.');
        setError("Insufficient permissions for teams");
        
        // In development, still show sample data
        if (devMode) {
          console.log('DEV MODE: Using sample data even after permission error');
          setTeams(sampleTeams);
        }
        
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      
      if (response.ok) {
        console.log(`Received ${data.length} teams:`, data);
        setTeams(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch teams:', data.error);
        setError(`Failed to load teams: ${data.error || 'Unknown error'}`);
        
        // In development, use sample data as fallback
        if (devMode) {
          console.log('DEV MODE: Using sample teams data after API error');
          setTeams(sampleTeams);
        }
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams');
      
      // In development, use sample data as fallback
      if (devMode) {
        console.log('DEV MODE: Using sample teams data after error');
        setTeams(sampleTeams);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load all data on initial render
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading contingent data for ID:', numericId);
        await fetchContingent();
        await fetchContestants();
        await fetchTeams();
      } catch (error) {
        console.error('Error in initial data loading:', error);
      }
    };

    loadData();
  }, [numericId]);

  return (
    <ContingentContext.Provider
      value={{
        contingent,
        contestants,
        teams,
        isLoading,
        error,
        refreshContingent: fetchContingent,
        refreshContestants: fetchContestants,
        refreshTeams: fetchTeams
      }}
    >
      {children}
    </ContingentContext.Provider>
  );
}

// Custom hook to use the context
export const useContingent = () => {
  const context = useContext(ContingentContext);
  if (context === undefined) {
    throw new Error('useContingent must be used within a ContingentProvider');
  }
  return context;
};

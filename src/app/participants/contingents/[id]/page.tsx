'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import ContestantManager from '../_components/contestant-manager';

type Contingent = {
  id: number;
  name: string;
  description?: string;
  schoolId?: number;
  higherInstId?: number;
  school?: {
    name: string;
  };
  higherInstitution?: {
    name: string;
  };
  contestId: number;
  contest: {
    name: string;
  };
};

type Manager = {
  id: number;
  participantId: number;
  isOwner: boolean;
  participant: {
    name: string;
    email: string;
  };
};

export default function ContingentDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const contingentId = params.id as string;
  
  const [contingent, setContingent] = useState<Contingent | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [isPrimaryManager, setIsPrimaryManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!session || !contingentId) return;
    
    const fetchContingentDetails = async () => {
      setLoading(true);
      try {
        // Fetch contingent details
        const response = await fetch(`/api/participants/contingents/${contingentId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch contingent details');
        }
        
        const data = await response.json();
        setContingent(data.contingent);
        
        // Fetch contingent managers
        const managersResponse = await fetch(`/api/participants/contingents/${contingentId}/managers`);
        
        if (!managersResponse.ok) {
          const errorData = await managersResponse.json();
          throw new Error(errorData.error || 'Failed to fetch contingent managers');
        }
        
        const managersData = await managersResponse.json();
        setManagers(managersData.managers);
        
        // Check if current user is a manager
        const currentUserEmail = session.user.email;
        const userIsManager = managersData.managers.some(
          (manager: Manager) => manager.participant.email === currentUserEmail
        );
        
        const userIsPrimaryManager = managersData.managers.some(
          (manager: Manager) => manager.participant.email === currentUserEmail && manager.isOwner
        );
        
        setIsManager(userIsManager);
        setIsPrimaryManager(userIsPrimaryManager);
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching contingent details:', err);
        setError(err.message || 'Failed to load contingent details');
        toast.error('Failed to load contingent details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContingentDetails();
  }, [session, contingentId]);
  
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !contingent) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>Error: {error || 'Contingent not found'}</p>
            <button 
              className="mt-2 bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
              onClick={() => router.push('/participants/contingents')}
            >
              Back to Contingents
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <button
          onClick={() => router.push('/participants/contingents')}
          className="text-blue-500 hover:text-blue-700 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Contingents
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{contingent.school?.name || contingent.higherInstitution?.name || 'No institution specified'}</h1>
            </div>
            
            <div>
              {isPrimaryManager && (
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Primary Manager
                </span>
              )}
              {isManager && !isPrimaryManager && (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Co-Manager
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-semibold">Description</h3>
            <p className="mt-1">{contingent.description || 'No description provided.'}</p>
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-semibold">Contest</h3>
            <p className="mt-1">{contingent.contest?.name || 'Not specified'}</p>
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-semibold">Managers</h3>
            <div className="mt-2 space-y-2">
              {managers.length > 0 ? (
                managers.map((manager) => (
                  <div key={manager.id} className="flex items-center">
                    <div className="flex-1">
                      <p className="font-medium">{manager.participant.name}</p>
                      <p className="text-sm text-gray-600">{manager.participant.email}</p>
                    </div>
                    {manager.isOwner && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                    {!manager.isOwner && (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Co-Manager
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No managers found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Contestant Manager Component */}
      <ContestantManager 
        contingentId={parseInt(contingentId)} 
        contingentName={contingent.school?.name || contingent.higherInstitution?.name || ''}
        isManager={isManager}
      />
    </div>
  );
}

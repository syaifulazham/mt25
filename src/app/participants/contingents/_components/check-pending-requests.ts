import { useEffect } from "react";
import contingentApi from "./contingent-api";

/**
 * Custom hook to check if a user has any pending contingent requests
 */
export const useCheckPendingRequests = (
  userId: number,
  setPendingRequest: (request: any) => void,
  setCheckingPendingRequest: (loading: boolean) => void
) => {
  useEffect(() => {
    const checkPendingRequests = async () => {
      try {
        setCheckingPendingRequest(true);
        const pendingRequests = await contingentApi.getUserPendingRequests(userId);
        
        if (pendingRequests && pendingRequests.length > 0) {
          // User has a pending request, store it
          setPendingRequest(pendingRequests[0]); // Take the most recent one
        }
        setCheckingPendingRequest(false);
      } catch (error) {
        console.error('Error checking pending requests:', error);
        setCheckingPendingRequest(false);
      }
    };
    
    checkPendingRequests();
  }, [userId, setPendingRequest, setCheckingPendingRequest]);
};

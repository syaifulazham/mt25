"use client";

import { useEffect } from "react";
import contingentApi from "./contingent-api";

/**
 * Hook to check for pending contingent requests for a user
 * @param userId - The ID of the user to check for pending requests
 * @param setPendingRequest - State setter for the pending request
 * @param setIsChecking - State setter for the loading state
 */
export function useCheckPendingRequests(
  userId: number,
  setPendingRequest: (request: any) => void,
  setIsChecking: (isChecking: boolean) => void
) {
  useEffect(() => {
    const checkPendingRequest = async () => {
      if (!userId) return;
      
      try {
        setIsChecking(true);
        const pendingRequests = await contingentApi.getUserPendingRequests(userId);
        
        // If there are pending requests, set the first one
        if (pendingRequests && pendingRequests.length > 0) {
          setPendingRequest(pendingRequests[0]);
        }
      } catch (error) {
        console.error("Error checking pending requests:", error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkPendingRequest();
  }, [userId, setPendingRequest, setIsChecking]);
}

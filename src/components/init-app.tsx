"use client";

import { useEffect, useState } from "react";

export function InitApp() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Call the init API to ensure database is initialized
        const response = await fetch("/api/init");
        const data = await response.json();
        
        if (data.success) {
          console.log("App initialized successfully");
        } else {
          console.error("App initialization failed:", data.message);
        }
      } catch (error) {
        console.error("Error during app initialization:", error);
      } finally {
        setInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // This component doesn't render anything visible
  return null;
}

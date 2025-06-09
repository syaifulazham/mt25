"use client";

import React from 'react';
import { PrimaryManagerChanger } from './primary-manager-changer';

interface Manager {
  id: number;
  isOwner: boolean;
  participant: {
    id: number;
    name: string;
    email: string;
  };
}

interface PrimaryManagerWrapperProps {
  contingentId: number;
  managers: Manager[];
}

export function PrimaryManagerWrapper({ contingentId, managers }: PrimaryManagerWrapperProps) {
  const handleManagersUpdated = () => {
    // Refresh the page when managers are updated
    window.location.reload();
  };
  
  return (
    <PrimaryManagerChanger
      contingentId={contingentId}
      managers={managers}
      onManagersUpdated={handleManagersUpdated}
    />
  );
}

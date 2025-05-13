import { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import { prismaExecute } from "@/lib/prisma";
import { ParticipantsList } from "../_components/participants-list";

export const metadata: Metadata = {
  title: "Participants List | Techlympics 2025",
  description: "View and manage all participants in the Techlympics 2025 system",
};

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default async function ParticipantsListPage() {
  // Fetch all participants and total count with proper connection management
  const { participants, totalParticipants } = await prismaExecute(async (prisma) => {
    // Fetch all participants for the client component to handle pagination
    const participantsData = await prisma.user_participant.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        contingents: {
          include: {
            school: true,
            higherInstitution: true
          }
        }
      }
    });

    // Get total count
    const count = await prisma.user_participant.count();
    
    return { participants: participantsData, totalParticipants: count };
  });
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="All Participants" 
          description="View and manage all registered participants in the system"
        />
        
        <Button className="gap-1">
          <Plus className="h-4 w-4" />
          Add Participant
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <ParticipantsList 
            participants={participants} 
            totalCount={totalParticipants} 
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}

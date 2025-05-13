import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prismaExecute } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";
import { Prisma } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RelationshipGraph from "./_components/relationship-graph";
import DeleteParticipantDialog from "./_components/delete-participant-dialog";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const user = await getParticipantDetails(params.id);
  
  return {
    title: user?.name ? `${user.name} | Techlympics 2025` : "Participant Details",
    description: `Details for participant ${user?.name || params.id}`,
  };
}

async function getParticipantDetails(id: string) {
  const participantId = parseInt(id, 10);
  if (isNaN(participantId)) return null;

  return prismaExecute(async (prisma) => {
    const user = await prisma.user_participant.findUnique({
      where: {
        id: participantId,
      },
      include: {
        school: true,
        higherInstitution: true,
        contingents: {
          include: {
            school: true,
            higherInstitution: true,
          },
        },
        contingentRequests: true,
      },
    });
    return user;
  });
}

async function getParticipantRelationships(id: string) {
  const participantId = parseInt(id, 10);
  if (isNaN(participantId)) return null;

  return prismaExecute(async (prisma) => {
    // Get all entities related to this participant
    const participantWithRelations = await prisma.user_participant.findUnique({
      where: { id: participantId },
      include: {
        contingents: true,
        contingentRequests: true,
        managedContingents: {
          include: {
            contingent: true,
          }
        },
        teamManagers: {
          include: {
            team: {
              include: {
                members: {
                  include: {
                    contestant: true
                  }
                },
                contest: true
              }
            }
          }
        }
      }
    });

    // Get contestants count from managed contingents
    const managedContingentIds = participantWithRelations?.managedContingents.map(cm => cm.contingentId) || [];
    
    // Get contestant counts by contingent ID
    const contestantCountsByContingent = managedContingentIds.length > 0 ?
      await prismaExecute(prisma => Promise.all(
        managedContingentIds.map(async (contingentId) => {
          const count = await prisma.contestant.count({
            where: { contingentId }
          });
          return { contingentId, count };
        })
      )) : [];
      
    // Get contest participation counts
    const contestParticipationCounts = managedContingentIds.length > 0 ?
      await prismaExecute(async (prisma) => {
        // Fetch all contest participations for contestants in the managed contingents
        const contestParticipations = await prisma.contestParticipation.findMany({
          where: {
            contestant: {
              contingentId: {
                in: managedContingentIds
              }
            }
          },
          include: {
            contestant: true,
            contest: true
          }
        });
        
        // Group participations by contingentId and contestId
        const participationsByGroup: Record<string, any> = {};
        
        contestParticipations.forEach(participation => {
          const key = `${participation.contestant.contingentId}-${participation.contestId}`;
          
          if (!participationsByGroup[key]) {
            participationsByGroup[key] = {
              contingentId: participation.contestant.contingentId,
              contestId: participation.contestId,
              contestName: participation.contest.name,
              count: 0
            };
          }
          
          participationsByGroup[key].count++;
        });
        
        return Object.values(participationsByGroup);
      }) : [];

    // Format the data for D3 visualization
    const nodes: any[] = [];
    const links: any[] = [];
    
    console.log("Creating participant relationship data", {
      participantExists: !!participantWithRelations,
      managedContingents: participantWithRelations?.managedContingents?.length || 0,
      teamManagers: participantWithRelations?.teamManagers?.length || 0
    });
    
    // Add participant node
    if (participantWithRelations) {
      nodes.push({
        id: `participant-${participantWithRelations.id}`,
        type: "participant",
        name: participantWithRelations.name,
        email: participantWithRelations.email,
        data: participantWithRelations
      });
      
      // If there are no relationships, add sample nodes for testing
      if (participantWithRelations.managedContingents.length === 0 && 
          participantWithRelations.teamManagers.length === 0) {
        console.log("No relationships found, adding test nodes");
        
        // Add test node
        nodes.push({
          id: `test-node-1`,
          type: "contingent",
          name: "Sample Contingent",
          data: { name: "Sample Contingent" }
        });
        
        links.push({
          source: `participant-${participantWithRelations.id}`,
          target: `test-node-1`,
          type: "sample"
        });
      }

      // Add contingents and their relationships
      participantWithRelations.managedContingents.forEach(cm => {
        if (cm.contingent) {
          nodes.push({
            id: `contingent-${cm.contingent.id}`,
            type: "contingent",
            name: cm.contingent.name,
            data: cm.contingent
          });

          links.push({
            source: `participant-${participantWithRelations.id}`,
            target: `contingent-${cm.contingent.id}`,
            type: cm.isOwner ? "owner" : "manager"
          });
        }
      });

      // Add teams and their relationships
      participantWithRelations.teamManagers.forEach(tm => {
        if (tm.team) {
          nodes.push({
            id: `team-${tm.team.id}`,
            type: "team",
            name: tm.team.name,
            data: tm.team
          });

          links.push({
            source: `participant-${participantWithRelations.id}`,
            target: `team-${tm.team.id}`,
            type: "manager"
          });

          // Add team members and their relationships
          tm.team.members.forEach(member => {
            if (member.contestant) {
              const contestantNodeId = `contestant-${member.contestant.id}`;
              
              // Check if we already added this contestant
              if (!nodes.some(n => n.id === contestantNodeId)) {
                nodes.push({
                  id: contestantNodeId,
                  type: "contestant",
                  name: member.contestant.name,
                  data: member.contestant
                });
              }

              links.push({
                source: `team-${tm.team.id}`,
                target: contestantNodeId,
                type: "member"
              });
            }
          });

          // Link team to contest
          if (tm.team.contest) {
            const contestNodeId = `contest-${tm.team.contest.id}`;
            
            // Check if contest already exists in nodes
            if (!nodes.some(n => n.id === contestNodeId)) {
              nodes.push({
                id: contestNodeId,
                type: "contest",
                name: tm.team.contest.name,
                data: tm.team.contest
              });
            }

            links.push({
              source: `team-${tm.team.id}`,
              target: contestNodeId,
              type: "participation"
            });
          }
        }
      });
    }

    // Add aggregated contestant nodes for each contingent
    contestantCountsByContingent.forEach(({ contingentId, count }) => {
      if (count > 0) {
        const contingentNodeId = `contingent-${contingentId}`;
        const contestantsNodeId = `contestants-${contingentId}`;
        
        // Check if the contingent exists in nodes
        if (nodes.some(n => n.id === contingentNodeId)) {
          // Add contestants group node
          nodes.push({
            id: contestantsNodeId,
            type: "contestants-group",
            name: `${count} Contestant${count !== 1 ? 's' : ''}`,
            data: { count, contingentId }
          });
          
          // Link contingent to contestants group
          links.push({
            source: contingentNodeId,
            target: contestantsNodeId,
            type: "has-members"
          });
          
          // Add contest connections for this contingent's contestants
          const participations = Array.isArray(contestParticipationCounts) ? 
            contestParticipationCounts.filter((p: any) => p.contingentId === contingentId) : [];
            
          participations.forEach((participation: any) => {
            const contestId = participation.contestId;
            const count = participation.count;
            const contestNodeId = `contest-${contestId}`;
            
            // Create contest node if it doesn't exist
            if (!nodes.some(n => n.id === contestNodeId)) {
              nodes.push({
                id: contestNodeId,
                type: "contest",
                name: `Contest ${contestId}`,
                data: { id: contestId }
              });
            }
            
            // Link contestants group to contest
            links.push({
              source: contestantsNodeId,
              target: contestNodeId,
              type: "participation",
              count: count
            });
          });
        }
      }
    });

    return { nodes, links };
  });
}

export default async function ParticipantPage({
  params,
}: {
  params: { id: string };
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return <div>Access denied. Please log in.</div>;
  }

  const participant = await getParticipantDetails(params.id);
  if (!participant) {
    notFound();
  }

  const relationships = await getParticipantRelationships(params.id);
  
  // Log relationship data for debugging
  console.log("Participant relationship data", {
    hasRelationships: !!relationships,
    nodeCount: relationships?.nodes?.length || 0,
    linkCount: relationships?.links?.length || 0
  });

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{participant.name}</h1>
            <p className="text-muted-foreground">Participant details and connections visualization</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="px-2 py-1">
                {participant.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <DeleteParticipantDialog 
              participantId={participant.id} 
              participantName={participant.name} 
            />
            
            <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">View Participant Details</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle className="text-xl">{participant.name}</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium mb-3 text-gray-500">Participant Details</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-xs text-gray-500">Name</div>
                      <div className="text-sm break-words">{participant.name}</div>
                    </div>
                    
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-xs text-gray-500">Email</div>
                      <div className="text-sm break-words">{participant.email}</div>
                    </div>
                    
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-xs text-gray-500">Username</div>
                      <div className="text-sm break-words">{participant.username}</div>
                    </div>
                    
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-xs text-gray-500">Phone</div>
                      <div className="text-sm break-words">{participant.phoneNumber || "Not provided"}</div>
                    </div>
                    
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-xs text-gray-500">IC Number</div>
                      <div className="text-sm break-words">{participant.ic || "Not provided"}</div>
                    </div>
                    
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-xs text-gray-500">Gender</div>
                      <div className="text-sm break-words">{participant.gender || "Not provided"}</div>
                    </div>
                    
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-xs text-gray-500">Birth Date</div>
                      <div className="text-sm break-words">
                        {participant.dateOfBirth
                          ? new Date(participant.dateOfBirth).toLocaleDateString()
                          : "Not provided"}
                      </div>
                    </div>
                    
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-xs text-gray-500">School</div>
                      <div className="text-sm break-words">{participant.school?.name || "Not associated"}</div>
                    </div>
                    
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-xs text-gray-500">Institution</div>
                      <div className="text-sm break-words">{participant.higherInstitution?.name || "Not associated"}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-3 text-gray-500">Account Information</h3>
                  <div className="space-y-3">
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-xs text-gray-500">Status</div>
                      <div>
                        <Badge variant={participant.isActive ? "default" : "destructive"} className={participant.isActive ? "bg-green-500" : ""}>
                          {participant.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-xs text-gray-500">Created</div>
                      <div className="text-sm break-words">{new Date(participant.createdAt).toLocaleDateString()}</div>
                    </div>
                    
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-xs text-gray-500">Last Login</div>
                      <div className="text-sm break-words">
                        {participant.lastLogin
                          ? new Date(participant.lastLogin).toLocaleString()
                          : "Never"}
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="text-xs text-gray-500 mb-1">Managing Contingents</div>
                      {participant.contingents.length > 0 ? (
                        <ul className="text-sm list-disc pl-5 space-y-1">
                          {participant.contingents.map((contingent) => (
                            <li key={contingent.id} className="break-words">
                              {contingent.name} ({contingent.school?.name || contingent.higherInstitution?.name || "Independent"})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs italic text-gray-500">Not managing any contingents</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Key Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="text-sm font-medium text-gray-500">Email</div>
                <div className="mt-1 font-medium break-words">{participant.email}</div>
              </div>
              
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="text-sm font-medium text-gray-500">Phone</div>
                <div className="mt-1 font-medium break-words">{participant.phoneNumber || "Not provided"}</div>
              </div>
              
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="text-sm font-medium text-gray-500">Status</div>
                <div className="mt-1">
                  <Badge variant={participant.isActive ? "default" : "destructive"} className={participant.isActive ? "bg-green-500" : ""}>
                    {participant.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>View Full Profile Details</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl">{participant.name}</DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium mb-3 text-gray-500">Participant Details</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {/* Adding break-words to all value fields */}
                        <div className="space-y-1 overflow-hidden">
                          <div className="text-xs text-gray-500">Name</div>
                          <div className="text-sm break-words">{participant.name}</div>
                        </div>
                        
                        <div className="space-y-1 overflow-hidden">
                          <div className="text-xs text-gray-500">Email</div>
                          <div className="text-sm break-words">{participant.email}</div>
                        </div>
                        
                        <div className="space-y-1 overflow-hidden">
                          <div className="text-xs text-gray-500">Username</div>
                          <div className="text-sm break-words">{participant.username}</div>
                        </div>
                        
                        <div className="space-y-1 overflow-hidden">
                          <div className="text-xs text-gray-500">Phone</div>
                          <div className="text-sm break-words">{participant.phoneNumber || "Not provided"}</div>
                        </div>
                        
                        <div className="space-y-1 overflow-hidden">
                          <div className="text-xs text-gray-500">IC Number</div>
                          <div className="text-sm break-words">{participant.ic || "Not provided"}</div>
                        </div>
                        
                        <div className="space-y-1 overflow-hidden">
                          <div className="text-xs text-gray-500">Gender</div>
                          <div className="text-sm break-words">{participant.gender || "Not provided"}</div>
                        </div>
                        
                        <div className="space-y-1 overflow-hidden">
                          <div className="text-xs text-gray-500">Birth Date</div>
                          <div className="text-sm break-words">
                            {participant.dateOfBirth
                              ? new Date(participant.dateOfBirth).toLocaleDateString()
                              : "Not provided"}
                          </div>
                        </div>
                        
                        <div className="space-y-1 overflow-hidden">
                          <div className="text-xs text-gray-500">School</div>
                          <div className="text-sm break-words">{participant.school?.name || "Not associated"}</div>
                        </div>
                        
                        <div className="space-y-1 overflow-hidden">
                          <div className="text-xs text-gray-500">Institution</div>
                          <div className="text-sm break-words">{participant.higherInstitution?.name || "Not associated"}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-3 text-gray-500">Account Information</h3>
                      <div className="space-y-3">
                        <div className="space-y-1 overflow-hidden">
                          <div className="text-xs text-gray-500">Status</div>
                          <div>
                            <Badge variant={participant.isActive ? "default" : "destructive"} className={participant.isActive ? "bg-green-500" : ""}>
                              {participant.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-1 overflow-hidden">
                          <div className="text-xs text-gray-500">Created</div>
                          <div className="text-sm break-words">{new Date(participant.createdAt).toLocaleDateString()}</div>
                        </div>
                        
                        <div className="space-y-1 overflow-hidden">
                          <div className="text-xs text-gray-500">Last Login</div>
                          <div className="text-sm break-words">
                            {participant.lastLogin
                              ? new Date(participant.lastLogin).toLocaleString()
                              : "Never"}
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="text-xs text-gray-500 mb-1">Managing Contingents</div>
                          {participant.contingents.length > 0 ? (
                            <ul className="text-sm list-disc pl-5 space-y-1">
                              {participant.contingents.map((contingent) => (
                                <li key={contingent.id} className="break-words">
                                  {contingent.name} ({contingent.school?.name || contingent.higherInstitution?.name || "Independent"})
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-xs italic text-gray-500 break-words">Not managing any contingents</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <DialogClose asChild>
                      <Button variant="outline">Close</Button>
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="graph">
        <TabsList>
          <TabsTrigger value="graph">Relationship Graph</TabsTrigger>
          <TabsTrigger value="data">Raw Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="graph" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Entity Relationships</h3>
              <div className="h-[600px] w-full bg-gray-50 rounded-md p-4 border">
                <RelationshipGraph data={relationships} participantId={participant.id} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="data" className="mt-6">
          <Card>
            <CardContent className="p-6 overflow-auto">
              <h3 className="text-lg font-semibold mb-4">Raw Relationship Data</h3>
              <pre className="text-xs bg-slate-100 p-4 rounded-md">
                {JSON.stringify(relationships, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

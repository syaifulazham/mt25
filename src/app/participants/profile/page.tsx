import { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, User, Users, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'My Profile | Techlympics 2025',
  description: 'Manage your profile and contestants',
};

// Define a combined user type to handle both regular users and participants
type CombinedUser = {
  id: number;
  name: string | null;
  email: string;
  username: string;
  role?: string;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  // Participant-specific fields
  isParticipant?: boolean;
  ic?: string | null;
  phoneNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | null;
  schoolId?: number | null;
  higherInstId?: number | null;
};

export default async function ProfilePage() {
  // Cast the user to our combined type
  const user = await getCurrentUser() as unknown as CombinedUser;
  
  // Fetch contingents for the current user
  const userContingents = await prisma.contingent.findMany({
    where: {
      participantId: user?.id,
    },
    select: {
      id: true,
    },
  });
  
  // Get contingent IDs managed by this user
  const contingentIds = userContingents.map(c => c.id);
  
  // Fetch contestants for the contingents managed by the current user
  const contestants = await prisma.contestant.findMany({
    where: {
      contingentId: {
        in: contingentIds.length > 0 ? contingentIds : [-1], // Use -1 as a fallback if no contingents found
      },
    },
    include: {
      contingent: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your personal information and contestants
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="profile">Personal Info</TabsTrigger>
          <TabsTrigger value="contestants">My Contestants</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Personal Information</CardTitle>
              <CardDescription>
                Your personal details and account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Name</h3>
                  <p className="text-base">{user?.name || 'Not provided'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Email</h3>
                  <p className="text-base break-all">{user?.email}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Username</h3>
                  <p className="text-base">{user?.username}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Role</h3>
                  <p className="text-base">{user?.role || 'PARTICIPANTS_MANAGER'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Account Created</h3>
                  <p className="text-base">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Last Login</h3>
                  <p className="text-base">{user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</p>
                </div>
                
                {/* Participant-specific fields */}
                {user?.isParticipant && (
                  <>
                    {user?.ic && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">IC Number</h3>
                        <p className="text-base">{user.ic}</p>
                      </div>
                    )}
                    {user?.phoneNumber && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">Phone Number</h3>
                        <p className="text-base">{user.phoneNumber}</p>
                      </div>
                    )}
                    {user?.gender && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">Gender</h3>
                        <p className="text-base">{user.gender}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="mt-6">
                <Button className="w-full sm:w-auto">Edit Profile</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contestants" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl">My Contestants</CardTitle>
                <CardDescription>
                  Manage your registered contestants
                </CardDescription>
              </div>
              <Button size="sm" className="w-full sm:w-auto">
                <Link href="/participants/contestants/new">Add Contestant</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {contestants.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You haven't registered any contestants yet.</p>
                  <Button asChild>
                    <Link href="/participants/contestants/new">Register Contestant</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {contestants.map((contestant) => (
                    <div key={contestant.id} className="p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h3 className="font-medium">{contestant.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {contestant.contingent?.name || 'No contingent'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/participants/contestants/${contestant.id}`}>View</Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/participants/contestants/${contestant.id}/edit`}>Edit</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="fixed bottom-4 right-4 md:hidden">
        <Button size="icon" className="rounded-full h-12 w-12 shadow-lg" asChild>
          <Link href="/participants/dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span className="sr-only">Dashboard</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

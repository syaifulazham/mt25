import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Pencil, Trash2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contestant Details | Techlympics 2025',
  description: 'View contestant details',
};

// Mark this page as dynamic to prevent static rendering errors with headers
export const dynamic = 'force-dynamic';

export default async function ContestantPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const id = Number(params.id);
  
  if (isNaN(id)) {
    return notFound();
  }
  
  // Get contingents managed by the current user
  const userContingents = await prisma.contingentManager.findMany({
    where: {
      participantId: user ? Number(user.id) : -1
    },
    select: {
      contingentId: true
    }
  });

  const contingentIds = userContingents.map(cm => cm.contingentId);

  // Fetch contestant details ensuring it belongs to one of the user's contingents
  const contestant = await prisma.contestant.findFirst({
    where: {
      id,
      contingentId: {
        in: contingentIds.length > 0 ? contingentIds : [-1] // Use -1 if no contingents (will find nothing)
      }
    },
    include: {
      contingent: {
        include: {
          school: true
        }
      }
    }
  });
  
  if (!contestant) {
    return notFound();
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{contestant.name}</h1>
          <p className="text-muted-foreground">
            Contestant details and information
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/participants/profile/contestants/${contestant.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the contestant
                  and remove their data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button 
                    variant="destructive"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/contestants/${contestant.id}`, {
                          method: 'DELETE'
                        });
                        
                        if (response.ok) {
                          window.location.href = '/participants/profile';
                        } else {
                          throw new Error('Failed to delete contestant');
                        }
                      } catch (error) {
                        console.error('Error deleting contestant:', error);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Contestant Information</CardTitle>
          <CardDescription>
            Personal details and registration information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Full Name</h3>
              <p>{contestant.name}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">IC Number</h3>
              <p>{contestant.ic}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Gender</h3>
              <p>{contestant.gender}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Age</h3>
              <p>{contestant.age}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Education Level</h3>
              <Badge variant="outline">{contestant.edu_level}</Badge>
            </div>
            {contestant.class_name && (
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Class</h3>
                <p>{contestant.class_name}</p>
              </div>
            )}
          </div>
          
          <div>
            <h3 className="font-medium text-sm text-muted-foreground mb-1">Unique Hashcode</h3>
            <div className="bg-muted p-2 rounded-md font-mono text-sm">
              {contestant.hashcode}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This unique code identifies the contestant in the Techlympics system.
            </p>
          </div>
          
          {contestant.contingent && (
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Team Assignment</h3>
              <div className="p-3 border rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{contestant.contingent.name}</p>
                    <p className="text-sm text-muted-foreground">
                      School: {contestant.contingent.school?.name || 'Not assigned'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/participants/contingents/${contestant.contingent.id}`}>
                      View Team
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline" asChild className="w-full">
            <Link href="/participants/profile">
              Back to Profile
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

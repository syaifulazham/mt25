import { notFound } from "next/navigation";
import { EmergencyPrimaryManagerForm } from "../../_components/emergency-primary-manager-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";

// This page is accessible without any authentication checks
export default async function EmergencyPrimaryManagerPage({ params }: { params: { id: string } }) {
  const contingentId = parseInt(params.id);
  
  if (isNaN(contingentId)) {
    notFound();
  }
  
  // Fetch contingent data without any auth checks
  const contingent = await prisma.contingent.findUnique({
    where: { id: contingentId },
    include: {
      managers: {
        include: {
          participant: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      }
    }
  });
  
  if (!contingent) {
    notFound();
  }
  
  return (
    <div className="container py-10">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href={`/organizer/contingents/${contingentId}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Contingent
            </Button>
          </Link>
        </div>
        
        <Card className="border-red-500 mb-6">
          <CardHeader className="bg-red-500 text-white">
            <CardTitle>EMERGENCY: Primary Manager Change</CardTitle>
            <CardDescription className="text-white text-opacity-90">
              This page bypasses all authentication checks
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{contingent.name}</h2>
              <p className="text-muted-foreground">Contingent ID: {contingent.id}</p>
            </div>
            
            {contingent.managers.length > 1 ? (
              <EmergencyPrimaryManagerForm 
                contingentId={contingent.id}
                managers={contingent.managers}
              />
            ) : (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
                This contingent only has one manager, so there is no need to change the primary manager.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

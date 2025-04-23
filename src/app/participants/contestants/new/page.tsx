"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Save, School, GraduationCap, User } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Contingent {
  id: number;
  name: string;
  school?: {
    name: string;
  };
  higherInstitution?: {
    name: string;
  };
  isManager: boolean;
  isOwner: boolean;
}

export default function NewContestantPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [contingents, setContingents] = useState<Contingent[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    ic: "",
    email: "",
    phoneNumber: "",
    gender: "Lelaki",
    age: "",
    edu_level: "sekolah rendah",
    class_name: "",
    class_grade: ""
  });
  
  // Track the user's contingent
  const [userContingent, setUserContingent] = useState<Contingent | null>(null);
  
  // Fetch the user's contingent with robust error handling and retries
  useEffect(() => {
    // Track if the component is mounted to prevent state updates after unmounting
    let isMounted = true;
    // Track retry attempts to prevent infinite loops
    let retryCount = 0;
    const MAX_RETRIES = 2;
    
    const fetchUserContingent = async () => {
      if (!session?.user?.email || retryCount >= MAX_RETRIES) return;
      
      try {
        setIsLoading(true);
        
        // Add cache control headers and timestamp to prevent caching issues
        const participantId = session.user.id;
        const response = await fetch(`/api/participants/contingents?participantId=${participantId}&t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch contingents");
        }
        
        const data = await response.json();
        console.log("Contingent data loaded:", data);
        
        // Find contingents where the user is a manager
        const managedContingents = data.filter((c: any) => c.isManager && c.status === 'ACTIVE');
        
        if (managedContingents.length > 0) {
          // Use the first managed contingent for contestant registration
          setUserContingent(managedContingents[0]);
          setContingents(managedContingents);
        } else {
          // Try fallback approach
          const fallbackResponse = await fetch(`/api/participants/contingents/fallback?participantId=${participantId}&t=${Date.now()}`);
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            console.log("Fallback contingent data loaded:", fallbackData);
            
            const fallbackManagedContingents = fallbackData.filter((c: any) => c.isManager && c.status === 'ACTIVE');
            
            if (fallbackManagedContingents.length > 0) {
              setUserContingent(fallbackManagedContingents[0]);
              setContingents(fallbackManagedContingents);
            } else {
              console.log("No managed contingents found in fallback data");
            }
          } else {
            console.log("Fallback request failed");
          }
        }
      } catch (error) {
        console.error("Error fetching user contingent:", error);
        
        // Don't show toast on initial load, only on final failure
        if (retryCount === MAX_RETRIES - 1) {
          toast.error("Failed to load your contingent information");
        }
        
        // Increment retry count for next attempt
        retryCount++;
        
        // Schedule a retry
        setTimeout(() => {
          if (isMounted) {
            console.log(`Retrying contingent fetch (attempt ${retryCount} of ${MAX_RETRIES})...`);
            fetchUserContingent();
          }
        }, 2000);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchUserContingent();
    
    return () => {
      isMounted = false;
    };
  }, [session, router]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user has a contingent
    if (!userContingent) {
      toast.error("You need to create or join a contingent before adding contestants");
      router.push('/participants/contingents');
      return;
    }
    
    // Basic validation
    if (!formData.name || !formData.ic || !formData.gender || !formData.age || !formData.edu_level) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Add the contingent ID to the form data
      const submissionData = {
        ...formData,
        contingentId: userContingent.id.toString()
      };
      
      const response = await fetch('/api/participants/contestants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create contestant");
      }
      
      toast.success("Contestant registered successfully");
      router.push('/participants/contestants');
    } catch (error: any) {
      console.error("Error creating contestant:", error);
      toast.error(error.message || "Failed to create contestant");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (status === "unauthenticated") {
    router.push("/participants/auth/login");
    return null;
  }
  
  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Add New Contestant</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Register a new contestant for Techlympics 2025
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/participants/contestants">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contestants
          </Link>
        </Button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Contestant Information</CardTitle>
            <CardDescription>
              Enter the contestant's personal details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contingent Information</h3>
              
              <div className="space-y-2">
                <Label>Your Contingent</Label>
                {userContingent ? (
                  <div className="p-3 border rounded-md bg-muted/30">
                    <div className="font-medium">{userContingent.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {userContingent.school?.name || userContingent.higherInstitution?.name || 'No institution'}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Contestants will be registered under this contingent
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border border-yellow-200 rounded-md bg-yellow-50">
                    <div className="font-medium text-yellow-800">No Contingent Found</div>
                    <div className="text-sm text-yellow-700">
                      You need to create or join a contingent before adding contestants
                    </div>
                    <Button asChild className="mt-2" size="sm">
                      <Link href="/participants/contingents">
                        Manage Contingents
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Full name as in IC"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ic">IC Number</Label>
                  <Input
                    id="ic"
                    name="ic"
                    placeholder="Without dashes"
                    value={formData.ic}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    placeholder="Phone number"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleSelectChange("gender", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Lelaki</SelectItem>
                    <SelectItem value="FEMALE">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    min="5"
                    max="25"
                    placeholder="Age in years"
                    value={formData.age}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edu_level">Education Level</Label>
                  <Select
                    value={formData.edu_level}
                    onValueChange={(value) => handleSelectChange("edu_level", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sekolah rendah">Sekolah Rendah</SelectItem>
                      <SelectItem value="sekolah menengah">Sekolah Menengah</SelectItem>
                      <SelectItem value="belia">Belia</SelectItem>
                      <SelectItem value="pendidikan khas">Pendidikan Khas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Class Information (Optional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class_grade">Class Grade</Label>
                  <Select
                    value={formData.class_grade}
                    onValueChange={(value) => handleSelectChange("class_grade", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="PPKI">PPKI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="class_name">Class Name</Label>
                  <Input
                    id="class_name"
                    name="class_name"
                    placeholder="e.g., Cerdik, 5A"
                    value={formData.class_name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.push('/participants/contestants')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center">
                  <Save className="mr-2 h-4 w-4" /> Save Contestant
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

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
import { useLanguage } from "@/lib/i18n/language-context";
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
  const { t } = useLanguage(); // Initialize language context
  
  const [isLoading, setIsLoading] = useState(false);
  const [contingents, setContingents] = useState<Contingent[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    ic: "",
    email: "",
    phoneNumber: "",
    gender: "MALE",
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
    
    // Special handling for IC number
    if (name === 'ic') {
      // Remove non-numeric characters
      const numericValue = value.replace(/\D/g, '');
      
      // Update the IC field with cleaned value
      setFormData(prev => ({ ...prev, [name]: numericValue }));
      
      // If we have 12 digits, auto-populate other fields
      if (numericValue.length === 12) {
        // Extract year, month, and day from IC
        const yearPrefix = parseInt(numericValue.substring(0, 2)) <= 25 ? '20' : '19';
        const yearOfBirth = parseInt(yearPrefix + numericValue.substring(0, 2));
        
        // Calculate age based on birth year (current year is 2025)
        const currentYear = 2025;
        const age = currentYear - yearOfBirth;
        
        // Determine gender based on last digit
        const lastDigit = parseInt(numericValue.charAt(11));
        const gender = lastDigit % 2 === 1 ? 'MALE' : 'FEMALE';
        
        // Determine education level based on age
        let eduLevel = 'belia';
        if (age >= 7 && age <= 12) {
          eduLevel = 'sekolah rendah';
        } else if (age >= 13 && age <= 17) {
          eduLevel = 'sekolah menengah';
        }
        
        // Determine class grade based on age
        let classGrade = '';
        if (age >= 7 && age <= 12) {
          classGrade = (age - 6).toString(); // Primary: ages 7-12 map to grades 1-6
        } else if (age >= 13 && age <= 17) {
          classGrade = (age - 12).toString(); // Secondary: ages 13-17 map to grades 1-5
        }
        
        // Update form with auto-calculated values
        setFormData(prev => ({
          ...prev,
          age: age.toString(),
          gender,
          edu_level: eduLevel,
          class_grade: classGrade
        }));
      }
    } else {
      // Standard handling for other fields
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
      toast.error(t('contestant.new.error_no_contingent'));
      router.push('/participants/contingents');
      return;
    }
    
    // Basic validation
    if (!formData.name || !formData.ic || !formData.gender || !formData.age || !formData.edu_level) {
      toast.error(t('contestant.new.error_required_fields'));
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
        throw new Error(data.error || t('contestant.new.error_create'));
      }
      
      toast.success(t('contestant.new.success_create'));
      router.push('/participants/contestants');
    } catch (error: any) {
      console.error("Error creating contestant:", error);
      toast.error(error.message || t('contestant.new.error_create'));
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('contestant.new.title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {t('contestant.new.description')}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/participants/contestants">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('contestant.new.back_button')}
          </Link>
        </Button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t('contestant.new.card_title')}</CardTitle>
            <CardDescription>
              {t('contestant.new.card_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('contestant.new.contingent_section')}</h3>
              
              <div className="space-y-2">
                <Label>{t('contestant.new.your_contingent')}</Label>
                {userContingent ? (
                  <div className="p-3 border rounded-md bg-muted/30">
                    <div className="font-medium">{userContingent.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {userContingent.school?.name || userContingent.higherInstitution?.name || t('contestant.new.no_institution')}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {t('contestant.new.will_register_under')}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border border-yellow-200 rounded-md bg-yellow-50">
                    <div className="font-medium text-yellow-800">{t('contestant.new.no_contingent')}</div>
                    <div className="text-sm text-yellow-700">
                      {t('contestant.new.need_contingent')}
                    </div>
                    <Button asChild className="mt-2" size="sm">
                      <Link href="/participants/contingents">
                        {t('contestant.new.manage_contingents')}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('contestant.new.personal_section')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('contestant.new.full_name')}</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder={t('contestant.new.name_placeholder')}
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ic">{t('contestant.new.ic_number')}</Label>
                  <Input
                    id="ic"
                    name="ic"
                    placeholder={t('contestant.new.ic_placeholder')}
                    value={formData.ic}
                    onChange={handleInputChange}
                    required
                  />
                  {formData.ic.length > 0 && formData.ic.length !== 12 && (
                    <p className="text-sm text-destructive mt-1">{t('contestant.new.ic_error')}</p>
                  )}
                  {formData.ic.length === 12 && (
                    <p className="text-sm text-muted-foreground mt-1">{t('contestant.new.ic_autofill')}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">{t('contestant.new.email')}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t('contestant.new.email_placeholder')}
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">{t('contestant.new.phone')}</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    placeholder={t('contestant.new.phone_placeholder')}
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t('contestant.new.gender')}</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleSelectChange("gender", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('contestant.new.gender_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{t('contestant.edit.gender_male')}</SelectItem>
                    <SelectItem value="FEMALE">{t('contestant.edit.gender_female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">{t('contestant.new.age')}</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    min="5"
                    max="25"
                    placeholder={t('contestant.new.age_placeholder')}
                    value={formData.age}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edu_level">{t('contestant.new.education_level')}</Label>
                  <Select
                    value={formData.edu_level}
                    onValueChange={(value) => handleSelectChange("edu_level", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('contestant.new.education_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sekolah rendah">{t('contestant.edit.edu_primary')}</SelectItem>
                      <SelectItem value="sekolah menengah">{t('contestant.edit.edu_secondary')}</SelectItem>
                      <SelectItem value="belia">{t('contestant.edit.edu_youth')}</SelectItem>
                      <SelectItem value="pendidikan khas">{t('contestant.new.edu_special')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('contestant.new.class_section')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class_grade">{t('contestant.new.class_grade')}</Label>
                  <Select
                    value={formData.class_grade}
                    onValueChange={(value) => handleSelectChange("class_grade", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('contestant.new.grade_placeholder')} />
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
                  <Label htmlFor="class_name">{t('contestant.new.class_name')}</Label>
                  <Input
                    id="class_name"
                    name="class_name"
                    placeholder={t('contestant.new.class_name_placeholder')}
                    value={formData.class_name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.push('/participants/contestants')}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('contestant.new.saving')}
                </span>
              ) : (
                <span className="flex items-center">
                  <Save className="mr-2 h-4 w-4" /> {t('contestant.new.save_button')}
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

"use client";

import { User } from "next-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, School, Building, Calendar, User as UserIcon } from "lucide-react";
import Link from "next/link";

interface ProfileSummaryProps {
  user: User & {
    username?: string;
    email?: string;
    name?: string;
    image?: string;
    phoneNumber?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    schoolId?: number | null;
    higherInstId?: number | null;
    school?: {
      name: string;
    } | null;
    higherInstitution?: {
      name: string;
    } | null;
  };
}

export default function ProfileSummary({ user }: ProfileSummaryProps) {
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Format date of birth
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not provided";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    const fields = [
      user.name,
      user.email,
      user.phoneNumber,
      user.gender,
      user.dateOfBirth,
      user.schoolId || user.higherInstId
    ];
    
    const filledFields = fields.filter(field => field !== null && field !== undefined).length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const profileCompletion = calculateProfileCompletion();
  
  return (
    <Card className="h-full gradient-card-blue">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg md:text-xl">My Profile</CardTitle>
        <CardDescription>
          Your personal information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.image || ""} alt={user.name || "User"} />
              <AvatarFallback>{user.name ? getInitials(user.name) : "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.name || "No name provided"}</p>
              <p className="text-sm text-muted-foreground">@{user.username || "username"}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Mail className="h-4 w-4 mr-2 accent-icon" />
              <span>{user.email || "No email provided"}</span>
            </div>
            
            {user.phoneNumber && (
              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 mr-2 accent-icon" />
                <span>{user.phoneNumber}</span>
              </div>
            )}
            
            {user.gender && (
              <div className="flex items-center text-sm">
                <UserIcon className="h-4 w-4 mr-2 accent-icon" />
                <span>{user.gender}</span>
              </div>
            )}
            
            {user.dateOfBirth && (
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 accent-icon" />
                <span>{formatDate(user.dateOfBirth)}</span>
              </div>
            )}
            
            {user.school && (
              <div className="flex items-center text-sm">
                <School className="h-4 w-4 mr-2 accent-icon" />
                <span>{user.school.name}</span>
              </div>
            )}
            
            {user.higherInstitution && (
              <div className="flex items-center text-sm">
                <Building className="h-4 w-4 mr-2 accent-icon" />
                <span>{user.higherInstitution.name}</span>
              </div>
            )}
          </div>
          
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Profile completion</span>
              <Badge variant={profileCompletion < 50 ? "outline" : profileCompletion < 80 ? "secondary" : "default"}>
                {profileCompletion}%
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  profileCompletion < 50 ? "bg-destructive/70" : 
                  profileCompletion < 80 ? "bg-amber-500" : 
                  "bg-green-500"
                }`} 
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>
          </div>
          
          <Button asChild className="w-full mt-2">
            <Link href="/participants/profile">Edit Profile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

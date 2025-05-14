"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, School } from "lucide-react";

interface ProfileSummaryClientProps {
  user: any;
}

export default function ProfileSummaryClient({ user }: ProfileSummaryClientProps) {
  const { t } = useLanguage();
  
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
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
  
  // Determine education institution
  const educationPlace = user.school?.name || user.higherInstitution?.name || "";
  
  return (
    <Card className="overflow-hidden border shadow-sm hover:shadow transition-shadow duration-200">
      <CardHeader className="p-4 pb-0 flex justify-between items-start">
        <div>
          <CardTitle className="text-sm font-medium">{t('profile.card_title') || t('profile.title')}</CardTitle>
          <Badge 
            variant={profileCompletion >= 80 ? "default" : profileCompletion >= 50 ? "outline" : "secondary"}
            className="mt-1 text-[10px] px-1.5 py-0 h-4"
          >
            {profileCompletion}% {t('profile.complete')}
          </Badge>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.image || ""} alt={user.name || t('profile.user')} />
          <AvatarFallback className="text-xs">{user.name ? getInitials(user.name) : "U"}</AvatarFallback>
        </Avatar>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <div className="text-xs grid grid-cols-1 gap-2">
          {/* Compact info with icons */}
          <div className="flex items-center gap-1.5 text-muted-foreground overflow-hidden text-ellipsis">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{user.email || t('profile.no_email')}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-muted-foreground overflow-hidden text-ellipsis">
            <Phone className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{user.phoneNumber || t('profile.no_phone')}</span>
          </div>
          
          {educationPlace && (
            <div className="flex items-center gap-1.5 text-muted-foreground overflow-hidden text-ellipsis">
              <School className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{educationPlace}</span>
            </div>
          )}
        </div>
        
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-3">
          <div 
            className={`h-full ${profileCompletion < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${profileCompletion}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

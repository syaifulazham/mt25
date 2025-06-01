"use client";

import { format } from 'date-fns';
import { MapPin, Users, CalendarIcon, School, Building2, UserRound, ShieldAlert, AlertCircle } from 'lucide-react';
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ContingentCardProps {
  contingent: any;
  type: 'school' | 'higher' | 'independent' | 'all' | 'empty';
}

export function ContingentCard({
  contingent,
  type
}: ContingentCardProps) {
  // Get appropriate icon and colors based on contingent type
  const getTypeStyles = () => {
    switch (type) {
      case 'school':
        return {
          Icon: School,
          iconColor: 'text-amber-500',
          badgeBg: 'bg-amber-50',
          badgeText: 'text-amber-700',
          badgeBorder: 'border-amber-200',
          avatarBg: 'bg-amber-100',
          avatarText: 'text-amber-800'
        };
      case 'higher':
        return {
          Icon: Building2,
          iconColor: 'text-purple-500',
          badgeBg: 'bg-purple-50',
          badgeText: 'text-purple-700',
          badgeBorder: 'border-purple-200',
          avatarBg: 'bg-purple-100',
          avatarText: 'text-purple-800'
        };
      case 'independent':
        return {
          Icon: UserRound,
          iconColor: 'text-indigo-500',
          badgeBg: 'bg-indigo-50',
          badgeText: 'text-indigo-700',
          badgeBorder: 'border-indigo-200',
          avatarBg: 'bg-indigo-100',
          avatarText: 'text-indigo-800'
        };
      case 'empty':
        return {
          Icon: ShieldAlert,
          iconColor: 'text-red-500',
          badgeBg: 'bg-red-50',
          badgeText: 'text-red-700',
          badgeBorder: 'border-red-200',
          avatarBg: 'bg-red-100',
          avatarText: 'text-red-800'
        };
      default:
        return {
          Icon: Users,
          iconColor: 'text-blue-500',
          badgeBg: 'bg-blue-50',
          badgeText: 'text-blue-700',
          badgeBorder: 'border-blue-200',
          avatarBg: 'bg-blue-100',
          avatarText: 'text-blue-800'
        };
    }
  };

  // Helper functions implemented directly in the component to avoid passing server functions to client components
  const getInstitutionName = () => {
    if (contingent.school?.name) return contingent.school.name;
    if (contingent.higherInstitution?.name) return contingent.higherInstitution.name;
    if (contingent.independent?.name) return contingent.independent.name;
    return 'No institution';
  };

  const hasStateInfo = (contingent: any) => {
    return !!(contingent.school?.state || contingent.higherInstitution?.state || contingent.independent?.state);
  };

  const getContingentState = (contingent: any) => {
    if (contingent.school?.state) return contingent.school.state;
    if (contingent.higherInstitution?.state) return contingent.higherInstitution.state;
    if (contingent.independent?.state) return contingent.independent.state;
    return null;
  };

  const formatStateName = (state: any) => {
    if (typeof state === 'string') return state;
    return state?.name || 'Unknown';
  };

  const styles = getTypeStyles();
  const { Icon } = styles;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Icon className={`h-4 w-4 ${styles.iconColor}`} />
              <CardTitle className="text-base">{contingent.name}</CardTitle>
            </div>
            <CardDescription>
              {getInstitutionName()}
            </CardDescription>
          </div>
          {type === 'empty' ? (
            <Badge variant="outline" className="flex items-center gap-1 text-red-600 bg-red-100 border-red-200">
              <AlertCircle className="h-3.5 w-3.5" /> No Contestants
            </Badge>
          ) : (
            <Badge className="flex items-center gap-1 bg-blue-100 text-blue-600 hover:bg-blue-200 border-blue-200">
              <Users className="h-3.5 w-3.5" /> {contingent._count.contestants}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* State Badge */}
        {hasStateInfo(contingent) && (
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={`flex items-center gap-1 px-2 py-0 ${styles.badgeBg} ${styles.badgeText} ${styles.badgeBorder}`}>
              <MapPin className="h-3 w-3" />
              {formatStateName(getContingentState(contingent))}
            </Badge>
          </div>
        )}

        {/* Contact Info */}
        {contingent.managers && contingent.managers[0] && (
          <div className="text-xs space-y-1 border-t pt-2">
            <div className="font-medium">{contingent.managers[0].participant.name}</div>
            <div className="text-muted-foreground">{contingent.managers[0].participant.email}</div>
            {contingent.managers[0].participant.phoneNumber && (
              <div>{contingent.managers[0].participant.phoneNumber}</div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-2">
          <div className="flex gap-0.5 -space-x-2">
            {type === 'empty' ? (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span>No participants</span>
              </div>
            ) : contingent.contestants?.slice(0, 5)?.map((contestant: any, i: number) => (
              <Avatar key={i} className="h-6 w-6 border-2 border-white">
                <AvatarFallback className={`${styles.avatarBg} ${styles.avatarText} text-xs`}>
                  {contestant?.participant?.name?.substring(0, 2) || contestant?.name?.substring(0, 2) || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
            {type !== 'empty' && contingent._count.contestants > 5 && (
              <Avatar className="h-6 w-6 border-2 border-white">
                <AvatarFallback className={`${styles.avatarBg} ${styles.avatarText} text-xs`}>
                  +{contingent._count.contestants - 5}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            <span>{format(new Date(contingent.createdAt), 'PPP')}</span>
          </div>
        </div>

        <div className="text-center">
          <Link 
            href={`/organizer/contingents/${contingent.id}`} 
            className="text-xs text-primary hover:underline"
          >
            View Details →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

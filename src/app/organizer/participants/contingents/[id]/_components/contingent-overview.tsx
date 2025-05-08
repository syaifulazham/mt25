"use client";

import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Skeleton
} from "@/components/ui/skeleton";
import { 
  School, 
  Users, 
  Calendar, 
  Building2, 
  MapPin,
  Trophy,
  UsersRound,
  UserCog
} from "lucide-react";
import { format } from 'date-fns';
import { useContingent } from './contingent-context';

const ContingentOverview = () => {
  const { contingent, contestants, teams, isLoading } = useContingent();

  if (isLoading) {
    return <LoadingState />;
  }

  if (!contingent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contingent Not Found</CardTitle>
          <CardDescription>
            This contingent may have been deleted or you do not have permission to view it.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      {/* Contingent Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{contingent.name}</h2>
                <Badge variant={contingent.type === 'SCHOOL' ? "default" : "secondary"}>
                  {contingent.type === 'SCHOOL' ? 'School' : 'Higher Institution'}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Code: {contingent.code}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm py-1">
                {contestants.length} Contestants
              </Badge>
              <Badge variant="outline" className="text-sm py-1">
                {teams.length} Teams
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contingent Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {contingent.type === 'SCHOOL' ? (
                  <School className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">Institution:</span>
                <span>
                  {contingent.type === 'SCHOOL' 
                    ? contingent.schoolName || 'Unknown School'
                    : contingent.higherInstName || 'Unknown Institution'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Location:</span>
                <span>Malaysia</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Contest:</span>
                <span>{contingent.contestName || 'General Contest'}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Managers:</span>
                <span>{contingent.managerCount || 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Created:</span>
                <span>{formatDate(contingent.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Updated:</span>
                <span>{formatDate(contingent.updatedAt)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contestants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold">{contestants.length}</div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold">{teams.length}</div>
              <UsersRound className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold">{teams.filter(team => team.status === 'ACTIVE').length}</div>
              <UsersRound className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Participation Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold">
                {contestants.length > 0 ? Math.round((teams.length / contestants.length) * 100) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const LoadingState = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div>
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default ContingentOverview;

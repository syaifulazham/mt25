"use client";

import { User } from "next-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProfileSummaryClient from "./profile-summary-client";
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
  // Use the client component with language support
  return <ProfileSummaryClient user={user} />;
}

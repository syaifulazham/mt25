'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type CategoryType = 'Kids' | 'Teens' | 'Youth';

type CompetitionData = {
  code: string;
  name: string;
  total: number;
};

type StateData = {
  state: string;
  total: number;
};

type EducationLevelDetail = {
  totalParticipation: number;
  kids: number;
  teens: number;
  youth: number;
  competitionsByCategory: {
    Kids: CompetitionData[];
    Teens: CompetitionData[];
    Youth: CompetitionData[];
  };
  statesByCategory: {
    Kids: StateData[];
    Teens: StateData[];
    Youth: StateData[];
  };
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

export default function EducationLevelDetailsPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<CategoryType>('Kids');
  const [data, setData] = useState<EducationLevelDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/dashboard/education-level-details');
        if (!response.ok) throw new Error('Failed to fetch data');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching education level details:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-destructive">Failed to load data</p>
      </div>
    );
  }

  const competitions = data.competitionsByCategory[activeCategory] || [];
  const states = data.statesByCategory[activeCategory] || [];
  
  const grandTotal = activeCategory === 'Kids' ? data.kids : 
                     activeCategory === 'Teens' ? data.teens : data.youth;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/organizer/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Education Level Details</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {/* Total Participation */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Participation</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-2xl font-bold text-blue-900">{formatNumber(data.totalParticipation)}</p>
          </CardContent>
        </Card>

        {/* Kids Toggle Card */}
        <Card 
          className={`cursor-pointer transition-all ${
            activeCategory === 'Kids' 
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg scale-105' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveCategory('Kids')}
        >
          <CardHeader className="p-3 pb-2">
            <CardTitle className={`text-sm font-medium ${activeCategory === 'Kids' ? 'text-white' : 'text-gray-600'}`}>
              Kids
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className={`text-2xl font-bold ${activeCategory === 'Kids' ? 'text-white' : 'text-gray-700'}`}>
              {formatNumber(data.kids)}
            </p>
          </CardContent>
        </Card>

        {/* Teens Toggle Card */}
        <Card 
          className={`cursor-pointer transition-all ${
            activeCategory === 'Teens' 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-105' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveCategory('Teens')}
        >
          <CardHeader className="p-3 pb-2">
            <CardTitle className={`text-sm font-medium ${activeCategory === 'Teens' ? 'text-white' : 'text-gray-600'}`}>
              Teens
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className={`text-2xl font-bold ${activeCategory === 'Teens' ? 'text-white' : 'text-gray-700'}`}>
              {formatNumber(data.teens)}
            </p>
          </CardContent>
        </Card>

        {/* Youth Toggle Card */}
        <Card 
          className={`cursor-pointer transition-all ${
            activeCategory === 'Youth' 
              ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg scale-105' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveCategory('Youth')}
        >
          <CardHeader className="p-3 pb-2">
            <CardTitle className={`text-sm font-medium ${activeCategory === 'Youth' ? 'text-white' : 'text-gray-600'}`}>
              Youth
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className={`text-2xl font-bold ${activeCategory === 'Youth' ? 'text-white' : 'text-gray-700'}`}>
              {formatNumber(data.youth)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables - 2 Column Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* By Competition */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-base">By Competition - {activeCategory}</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="max-h-[600px] overflow-y-auto">
              {competitions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No competitions found</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr>
                      <th className="text-left p-1.5 font-semibold">Competition</th>
                      <th className="text-right p-1.5 font-semibold w-20">Total</th>
                      <th className="p-1.5 w-32"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitions.map((comp, idx) => {
                      const percentage = grandTotal > 0 ? (comp.total / grandTotal) * 100 : 0;
                      return (
                        <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                          <td className="p-1.5 truncate max-w-0" title={`${comp.code} - ${comp.name}`}>
                            {comp.code} - {comp.name}
                          </td>
                          <td className="text-right p-1.5 font-medium">{formatNumber(comp.total)}</td>
                          <td className="p-1.5">
                            <div className="h-4 bg-gray-200 rounded overflow-hidden">
                              <div 
                                className={`h-full ${
                                  activeCategory === 'Kids' ? 'bg-emerald-500' :
                                  activeCategory === 'Teens' ? 'bg-blue-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* By State */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-base">By State - {activeCategory}</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="max-h-[600px] overflow-y-auto">
              {states.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No states found</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr>
                      <th className="text-left p-1.5 font-semibold">State</th>
                      <th className="text-right p-1.5 font-semibold w-20">Total</th>
                      <th className="p-1.5 w-32"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {states.map((state, idx) => {
                      const percentage = grandTotal > 0 ? (state.total / grandTotal) * 100 : 0;
                      return (
                        <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                          <td className="p-1.5">{state.state}</td>
                          <td className="text-right p-1.5 font-medium">{formatNumber(state.total)}</td>
                          <td className="p-1.5">
                            <div className="h-4 bg-gray-200 rounded overflow-hidden">
                              <div 
                                className={`h-full ${
                                  activeCategory === 'Kids' ? 'bg-emerald-500' :
                                  activeCategory === 'Teens' ? 'bg-blue-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

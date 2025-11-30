import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prismaExecute } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ExportButton from "./_components/ExportButton";

interface ManagerStats {
  total: number;
  school: number;
  independent: number;
}

interface TrainerStats {
  total: number;
  school: number;
  independent: number;
}

// Stats card with breakdown
const BreakdownCard = ({ 
  title, 
  icon: Icon, 
  total, 
  school, 
  independent
}: { 
  title: string; 
  icon: any; 
  total: number;
  school: number;
  independent: number;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
      <CardTitle className="text-xl font-bold">{title}</CardTitle>
      <Icon className="h-6 w-6 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {/* Total */}
      <div className="mb-6 pb-4 border-b">
        <p className="text-sm text-muted-foreground mb-2">Total</p>
        <div className="text-4xl font-bold">{formatNumber(total)}</div>
      </div>
      
      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">School</p>
          <div className="text-2xl font-bold">{formatNumber(school)}</div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Independent</p>
          <div className="text-2xl font-bold">{formatNumber(independent)}</div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default async function ManagersTrainersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/organizer/login");
  }

  // Fetch Managers (user_participant) statistics
  // user_participant links to contingent through contingentManager junction table
  const managerStats = await prismaExecute(async (prisma) => {
    const results = await prisma.$queryRaw<Array<{contingentType: string; count: bigint}>>`
      SELECT c.contingentType, COUNT(DISTINCT up.id) as count
      FROM user_participant up
      INNER JOIN contingentManager cm ON cm.participantId = up.id
      INNER JOIN contingent c ON c.id = cm.contingentId
      WHERE c.contingentType IS NOT NULL
      GROUP BY c.contingentType
    `;

    const stats: ManagerStats = {
      total: 0,
      school: 0,
      independent: 0
    };

    results.forEach(row => {
      const count = Number(row.count);
      stats.total += count;
      
      if (row.contingentType === 'SCHOOL') {
        stats.school = count;
      } else if (row.contingentType === 'INDEPENDENT') {
        stats.independent = count;
      }
    });

    return stats;
  });

  // Fetch Trainers (manager) statistics by contingent type
  // manager links to team through manager_team junction table, then team to contingent
  const trainerStats = await prismaExecute(async (prisma) => {
    const results = await prisma.$queryRaw<Array<{contingentType: string; count: bigint}>>`
      SELECT c.contingentType, COUNT(DISTINCT m.id) as count
      FROM manager m
      INNER JOIN manager_team mt ON mt.managerId = m.id
      INNER JOIN team t ON t.id = mt.teamId
      INNER JOIN contingent c ON c.id = t.contingentId
      WHERE c.contingentType IS NOT NULL
      GROUP BY c.contingentType
    `;

    const stats: TrainerStats = {
      total: 0,
      school: 0,
      independent: 0
    };

    results.forEach(row => {
      const count = Number(row.count);
      stats.total += count;
      
      if (row.contingentType === 'SCHOOL') {
        stats.school = count;
      } else if (row.contingentType === 'INDEPENDENT') {
        stats.independent = count;
      }
    });

    return stats;
  });

  // Fetch School Managers & Trainers by State
  const schoolByState = await prismaExecute(async (prisma) => {
    // Get managers by state for schools
    const managerResults = await prisma.$queryRaw<Array<{stateName: string | null; count: bigint}>>`
      SELECT 
        REPLACE(s.name, 'WILAYAH PERSEKUTUAN', 'WP') as stateName,
        COUNT(DISTINCT up.id) as count
      FROM user_participant up
      INNER JOIN contingentManager cm ON cm.participantId = up.id
      INNER JOIN contingent c ON c.id = cm.contingentId
      INNER JOIN school sc ON c.schoolId = sc.id
      INNER JOIN state s ON sc.stateId = s.id
      WHERE c.contingentType = 'SCHOOL'
      GROUP BY s.name
    `;

    // Get trainers by state for schools
    const trainerResults = await prisma.$queryRaw<Array<{stateName: string | null; count: bigint}>>`
      SELECT 
        REPLACE(s.name, 'WILAYAH PERSEKUTUAN', 'WP') as stateName,
        COUNT(DISTINCT m.id) as count
      FROM manager m
      INNER JOIN manager_team mt ON mt.managerId = m.id
      INNER JOIN team t ON t.id = mt.teamId
      INNER JOIN contingent c ON c.id = t.contingentId
      INNER JOIN school sc ON c.schoolId = sc.id
      INNER JOIN state s ON sc.stateId = s.id
      WHERE c.contingentType = 'SCHOOL'
      GROUP BY s.name
    `;

    // Combine results
    const stateMap = new Map<string, {managerCount: number; trainerCount: number}>();
    
    managerResults.forEach(row => {
      if (row.stateName) {
        stateMap.set(row.stateName, {
          managerCount: Number(row.count),
          trainerCount: 0
        });
      }
    });

    trainerResults.forEach(row => {
      if (row.stateName) {
        const existing = stateMap.get(row.stateName);
        if (existing) {
          existing.trainerCount = Number(row.count);
        } else {
          stateMap.set(row.stateName, {
            managerCount: 0,
            trainerCount: Number(row.count)
          });
        }
      }
    });

    return Array.from(stateMap.entries())
      .map(([stateName, counts]) => ({
        stateName,
        managerCount: counts.managerCount,
        trainerCount: counts.trainerCount
      }))
      .sort((a, b) => {
        const totalA = a.managerCount + a.trainerCount;
        const totalB = b.managerCount + b.trainerCount;
        return totalB - totalA || a.stateName.localeCompare(b.stateName);
      });
  });

  // Fetch Independent Managers & Trainers by State
  const independentByState = await prismaExecute(async (prisma) => {
    // Get managers by state for independents
    const managerResults = await prisma.$queryRaw<Array<{stateName: string | null; count: bigint}>>`
      SELECT 
        REPLACE(s.name, 'WILAYAH PERSEKUTUAN', 'WP') as stateName,
        COUNT(DISTINCT up.id) as count
      FROM user_participant up
      INNER JOIN contingentManager cm ON cm.participantId = up.id
      INNER JOIN contingent c ON c.id = cm.contingentId
      INNER JOIN independent i ON c.independentId = i.id
      INNER JOIN state s ON i.stateId = s.id
      WHERE c.contingentType = 'INDEPENDENT'
      GROUP BY s.name
    `;

    // Get trainers by state for independents
    const trainerResults = await prisma.$queryRaw<Array<{stateName: string | null; count: bigint}>>`
      SELECT 
        REPLACE(s.name, 'WILAYAH PERSEKUTUAN', 'WP') as stateName,
        COUNT(DISTINCT m.id) as count
      FROM manager m
      INNER JOIN manager_team mt ON mt.managerId = m.id
      INNER JOIN team t ON t.id = mt.teamId
      INNER JOIN contingent c ON c.id = t.contingentId
      INNER JOIN independent i ON c.independentId = i.id
      INNER JOIN state s ON i.stateId = s.id
      WHERE c.contingentType = 'INDEPENDENT'
      GROUP BY s.name
    `;

    // Combine results
    const stateMap = new Map<string, {managerCount: number; trainerCount: number}>();
    
    managerResults.forEach(row => {
      if (row.stateName) {
        stateMap.set(row.stateName, {
          managerCount: Number(row.count),
          trainerCount: 0
        });
      }
    });

    trainerResults.forEach(row => {
      if (row.stateName) {
        const existing = stateMap.get(row.stateName);
        if (existing) {
          existing.trainerCount = Number(row.count);
        } else {
          stateMap.set(row.stateName, {
            managerCount: 0,
            trainerCount: Number(row.count)
          });
        }
      }
    });

    return Array.from(stateMap.entries())
      .map(([stateName, counts]) => ({
        stateName,
        managerCount: counts.managerCount,
        trainerCount: counts.trainerCount
      }))
      .sort((a, b) => {
        const totalA = a.managerCount + a.trainerCount;
        const totalB = b.managerCount + b.trainerCount;
        return totalB - totalA || a.stateName.localeCompare(b.stateName);
      });
  });

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Managers & Trainers</h1>
          <p className="text-muted-foreground mt-1">
            Detailed statistics for contingent managers and trainers
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            managerStats={managerStats}
            trainerStats={trainerStats}
            schoolByState={schoolByState}
            independentByState={independentByState}
          />
          <Link href="/organizer/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <BreakdownCard
          title="Managers"
          icon={Users}
          total={managerStats.total}
          school={managerStats.school}
          independent={managerStats.independent}
        />
        
        <BreakdownCard
          title="Trainers"
          icon={Users}
          total={trainerStats.total}
          school={trainerStats.school}
          independent={trainerStats.independent}
        />
      </div>

      {/* Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Managers (user_participant table)</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">School contingents:</span>
                  <span className="font-medium">{formatNumber(managerStats.school)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Independent:</span>
                  <span className="font-medium">{formatNumber(managerStats.independent)}</span>
                </li>
                <li className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold">{formatNumber(managerStats.total)}</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Trainers (manager table)</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">School contingents:</span>
                  <span className="font-medium">{formatNumber(trainerStats.school)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Independent:</span>
                  <span className="font-medium">{formatNumber(trainerStats.independent)}</span>
                </li>
                <li className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold">{formatNumber(trainerStats.total)}</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Managers + Trainers Combined Section */}
      <Card>
        <CardHeader>
          <CardTitle>Managers + Trainers (Combined)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Total</p>
              <div className="text-4xl font-bold text-primary">
                {formatNumber(managerStats.total + trainerStats.total)}
              </div>
            </div>
            
            {/* Schools */}
            <div className="text-center border-l border-r">
              <p className="text-sm text-muted-foreground mb-2">Schools</p>
              <div className="text-4xl font-bold text-blue-600">
                {formatNumber(managerStats.school + trainerStats.school)}
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Managers: {formatNumber(managerStats.school)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Trainers: {formatNumber(trainerStats.school)}
                </p>
              </div>
            </div>
            
            {/* Independent */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Independent</p>
              <div className="text-4xl font-bold text-green-600">
                {formatNumber(managerStats.independent + trainerStats.independent)}
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Managers: {formatNumber(managerStats.independent)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Trainers: {formatNumber(trainerStats.independent)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* School Managers & Trainers by State Section */}
      <Card>
        <CardHeader>
          <CardTitle>School Managers & Trainers by State</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">State</th>
                  <th className="text-right py-3 px-4 font-semibold">Managers</th>
                  <th className="py-3 px-4" style={{ width: '25%' }}></th>
                  <th className="text-right py-3 px-4 font-semibold">Trainers</th>
                  <th className="py-3 px-4" style={{ width: '25%' }}></th>
                  <th className="text-right py-3 px-4 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {schoolByState.map((state, index) => {
                  const managerPercentage = managerStats.school > 0 
                    ? (state.managerCount / managerStats.school) * 100 
                    : 0;
                  const trainerPercentage = trainerStats.school > 0 
                    ? (state.trainerCount / trainerStats.school) * 100 
                    : 0;
                  const total = state.managerCount + state.trainerCount;
                  
                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{state.stateName}</td>
                      
                      {/* Managers Count */}
                      <td className="text-right py-3 px-4 font-medium">{formatNumber(state.managerCount)}</td>
                      
                      {/* Managers Distribution */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full flex items-center justify-end px-2 transition-all"
                              style={{ width: `${managerPercentage}%` }}
                            >
                              {managerPercentage >= 15 && (
                                <span className="text-xs text-white font-medium">
                                  {managerPercentage.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {managerPercentage < 15 && managerPercentage > 0 && (
                            <span className="text-xs text-muted-foreground min-w-[45px]">
                              {managerPercentage.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Trainers Count */}
                      <td className="text-right py-3 px-4 font-medium">{formatNumber(state.trainerCount)}</td>
                      
                      {/* Trainers Distribution */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                            <div 
                              className="bg-purple-500 h-full flex items-center justify-end px-2 transition-all"
                              style={{ width: `${trainerPercentage}%` }}
                            >
                              {trainerPercentage >= 15 && (
                                <span className="text-xs text-white font-medium">
                                  {trainerPercentage.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {trainerPercentage < 15 && trainerPercentage > 0 && (
                            <span className="text-xs text-muted-foreground min-w-[45px]">
                              {trainerPercentage.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Total */}
                      <td className="text-right py-3 px-4 font-bold">{formatNumber(total)}</td>
                    </tr>
                  );
                })}
                {schoolByState.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No state data available
                    </td>
                  </tr>
                )}
                {/* NATIONAL Grand Total */}
                {schoolByState.length > 0 && (
                  <tr className="border-t-2 bg-muted/30 font-bold">
                    <td className="py-3 px-4">NATIONAL</td>
                    <td className="text-right py-3 px-4">{formatNumber(managerStats.school)}</td>
                    <td className="py-3 px-4 text-center text-sm text-muted-foreground">100%</td>
                    <td className="text-right py-3 px-4">{formatNumber(trainerStats.school)}</td>
                    <td className="py-3 px-4 text-center text-sm text-muted-foreground">100%</td>
                    <td className="text-right py-3 px-4">{formatNumber(managerStats.school + trainerStats.school)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Independent Managers & Trainers by State Section */}
      <Card>
        <CardHeader>
          <CardTitle>Independent Managers & Trainers by State</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">State</th>
                  <th className="text-right py-3 px-4 font-semibold">Managers</th>
                  <th className="py-3 px-4" style={{ width: '25%' }}></th>
                  <th className="text-right py-3 px-4 font-semibold">Trainers</th>
                  <th className="py-3 px-4" style={{ width: '25%' }}></th>
                  <th className="text-right py-3 px-4 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {independentByState.map((state, index) => {
                  const managerPercentage = managerStats.independent > 0 
                    ? (state.managerCount / managerStats.independent) * 100 
                    : 0;
                  const trainerPercentage = trainerStats.independent > 0 
                    ? (state.trainerCount / trainerStats.independent) * 100 
                    : 0;
                  const total = state.managerCount + state.trainerCount;
                  
                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{state.stateName}</td>
                      
                      {/* Managers Count */}
                      <td className="text-right py-3 px-4 font-medium">{formatNumber(state.managerCount)}</td>
                      
                      {/* Managers Distribution */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                            <div 
                              className="bg-green-500 h-full flex items-center justify-end px-2 transition-all"
                              style={{ width: `${managerPercentage}%` }}
                            >
                              {managerPercentage >= 15 && (
                                <span className="text-xs text-white font-medium">
                                  {managerPercentage.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {managerPercentage < 15 && managerPercentage > 0 && (
                            <span className="text-xs text-muted-foreground min-w-[45px]">
                              {managerPercentage.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Trainers Count */}
                      <td className="text-right py-3 px-4 font-medium">{formatNumber(state.trainerCount)}</td>
                      
                      {/* Trainers Distribution */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                            <div 
                              className="bg-orange-500 h-full flex items-center justify-end px-2 transition-all"
                              style={{ width: `${trainerPercentage}%` }}
                            >
                              {trainerPercentage >= 15 && (
                                <span className="text-xs text-white font-medium">
                                  {trainerPercentage.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {trainerPercentage < 15 && trainerPercentage > 0 && (
                            <span className="text-xs text-muted-foreground min-w-[45px]">
                              {trainerPercentage.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* Total */}
                      <td className="text-right py-3 px-4 font-bold">{formatNumber(total)}</td>
                    </tr>
                  );
                })}
                {independentByState.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No state data available
                    </td>
                  </tr>
                )}
                {/* NATIONAL Grand Total */}
                {independentByState.length > 0 && (
                  <tr className="border-t-2 bg-muted/30 font-bold">
                    <td className="py-3 px-4">NATIONAL</td>
                    <td className="text-right py-3 px-4">{formatNumber(managerStats.independent)}</td>
                    <td className="py-3 px-4 text-center text-sm text-muted-foreground">100%</td>
                    <td className="text-right py-3 px-4">{formatNumber(trainerStats.independent)}</td>
                    <td className="py-3 px-4 text-center text-sm text-muted-foreground">100%</td>
                    <td className="text-right py-3 px-4">{formatNumber(managerStats.independent + trainerStats.independent)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

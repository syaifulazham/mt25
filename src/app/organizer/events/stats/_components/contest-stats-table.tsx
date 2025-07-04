"use client";

import React, { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Document, Paragraph, HeadingLevel, AlignmentType, WidthType, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, BorderStyle } from "docx";
import { saveAs } from "file-saver";

import { ContestItem, ContestLevelGroup, ContestStatsResult } from "../_utils/contest-statistics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FilterOption = { id: number; name: string };

type ZoneFilter = FilterOption;
type StateFilter = FilterOption & { zoneId?: number };

type ContestStatsTableProps = {
  groupedContests: ContestLevelGroup[];
  summary: {
    totalContests: number;
    totalTeams: number;
    totalContingents: number;
  };
  zoneFilters: FilterOption[];
  onFilterChange?: (filters: { zoneId?: number; stateId?: number }) => void;
  currentFilters?: { zoneId?: number; stateId?: number };
};

export function ContestStatsTable({ 
  groupedContests: rawGroupedContests, 
  summary: rawSummary, 
  zoneFilters,
  onFilterChange,
  currentFilters 
}: ContestStatsTableProps): JSX.Element {
  // Enhanced debugging for grouped contests
  console.log('[ContestStatsTable] Raw grouped contests received:', 
    rawGroupedContests?.map(g => ({
      contestLevel: g.contestLevel,
      contestsCount: g.contests.length
    })));
  
  console.log('[ContestStatsTable] Full raw data structure:', JSON.stringify({
    groupedContests: rawGroupedContests,
    summary: rawSummary,
    currentFilters
  }, null, 2));
  
  // Check if we actually have data with contests
  const hasRealData = rawGroupedContests && rawGroupedContests.some(group => 
    group.contests && group.contests.length > 0
  );
  
  console.log(`[ContestStatsTable] Has real data with contests: ${hasRealData}`);
  
  if (!rawGroupedContests) {
    console.warn('[ContestStatsTable] Warning: groupedContests is undefined');
  }

  // Keep all contests regardless of team count to show complete data
  console.log('[ContestStatsTable] Raw data before processing:', rawGroupedContests);
  
  // Avoid operations on undefined/null data
  const groupedContests = (rawGroupedContests || []).map(group => {
    if (!group || !group.contests) {
      console.log('[ContestStatsTable] Missing group or contests in:', group);
      return { contestLevel: group?.contestLevel || 'Unknown', contests: [], totals: { contingentCount: 0, teamCount: 0, contestantCount: 0 } };
    }
    
    console.log(`[ContestStatsTable] Processing group ${group.contestLevel} with ${group.contests.length} contests`);
    return {
      ...group,
      contests: group.contests // No filter applied - show all contests
    };
  }).filter(group => group.contests && group.contests.length > 0); // Still filter out empty groups
  
  console.log('[ContestStatsTable] Processed groupedContests:', groupedContests);

  // Recalculate summary based on filtered contests
  const summary = {
    totalContests: groupedContests.reduce((sum, group) => sum + group.contests.length, 0),
    totalTeams: groupedContests.reduce(
      (sum, group) => sum + group.contests.reduce((subSum, contest) => subSum + contest.teamCount, 0), 
      0
    ),
    totalContingents: rawSummary.totalContingents // Keep the original contingent count
  };
  
  // Check if group has data
  const groupHasData = (group: ContestLevelGroup) => {
    return group.contests.some(c => c.teamCount > 0);
  };
  
  // In the new structure, we don't use education levels anymore

  // Local state for filters, loading, and table visibility
  const [selectedZone, setSelectedZone] = useState<string>(currentFilters?.zoneId ? currentFilters.zoneId.toString() : "all");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showTable, setShowTable] = useState<boolean>(false);

  // Helper function to render the contest table with provided grouped contests
  const renderContestTable = (contestGroups: ContestLevelGroup[]) => {
    return (
      <div className="space-y-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Contest Level</TableHead>
                <TableHead className="min-w-[140px]">Contest</TableHead>
                <TableHead className="text-right">Contingents</TableHead>
                <TableHead className="text-right">Teams</TableHead>
                <TableHead className="text-right">Contestants</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contestGroups.map((group) => (
                <React.Fragment key={group.contestLevel}>
                  {/* Level header row */}
                  <TableRow className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-default">
                    <TableCell colSpan={2} className="font-semibold">
                      {group.contestLevel} Level
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {group.totals.contingentCount}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {group.totals.teamCount}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {group.totals.contestantCount}
                    </TableCell>
                  </TableRow>

                  {/* Contest rows */}
                  {group.contests.map((contest) => (
                    <TableRow key={contest.contestId} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <TableCell></TableCell>
                      <TableCell>{contest.contestName} ({contest.contestCode})</TableCell>
                      <TableCell className="text-right">{contest.contingentCount}</TableCell>
                      <TableCell className="text-right">{contest.teamCount}</TableCell>
                      <TableCell className="text-right">{contest.contestantCount}</TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}

              {/* Total row removed as per user request */}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // Generate DOCX report and trigger download
  const generateDocxReport = () => {
    // Create a function to safely get zone name
    const getZoneName = () => {
      if (!currentFilters?.zoneId) return 'All Zones';
      const zoneFilter = zoneFilters.find(z => z.id === currentFilters.zoneId);
      return zoneFilter ? zoneFilter.name : 'Unknown Zone';
    };

    try {
      // Get zone name and date information
      const zoneName = getZoneName();
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });

      // Helper functions for creating DOCX components
      const createTableHeader = (text: string) => {
        return new DocxTableCell({
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
          },
          shading: { fill: "DDDDDD" },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text,
                  bold: true,
                  font: "Calibri"
                })
              ]
            })
          ]
        });
      };

      const createTableCell = (text: string, isNumeric = false) => {
        return new DocxTableCell({
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
          children: [
            new Paragraph({
              alignment: isNumeric ? AlignmentType.CENTER : AlignmentType.LEFT,
              children: [
                new TextRun({
                  text,
                  font: "Calibri"
                })
              ]
            }),
          ],
        });
      };

      // Build all document content up front
      // Start with initial content
      const docContent = [
        // Title
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Competition Statistics Summary",
              font: "Calibri",
              size: 32
            })
          ]
        }),

        // Metadata
        new Paragraph({
          children: [
            new TextRun({ text: "Zone: ", bold: true, font: "Calibri" }),
            new TextRun({ text: zoneName, font: "Calibri" }),
          ],
          spacing: { after: 100 }
        }),

        new Paragraph({
          children: [
            new TextRun({ text: "Date: ", bold: true, font: "Calibri" }),
            new TextRun({ text: new Date().toLocaleString('ms-MY'), font: "Calibri" }),
          ],
          spacing: { after: 100 }
        }),

        // Summary section
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Summary",
              font: "Calibri",
              bold: true,
              size: 26
            })
          ]
        }),

        // Summary table
        new DocxTable({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  },
                  shading: { fill: "DDDDDD" },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "Level",
                          bold: true,
                          font: "Calibri"
                        })
                      ]
                    })
                  ],
                  width: { size: 60, type: WidthType.PERCENTAGE }
                }),
                createTableHeader("Contingents"),
                createTableHeader("Teams"),
                createTableHeader("Participants"),
              ],
            }),
            ...groupedContests.map(group => (
              new DocxTableRow({
                children: [
                  createTableCell(group.contestLevel),
                  createTableCell(group.totals.contingentCount.toString(), true),
                  createTableCell(group.totals.teamCount.toString(), true),
                  createTableCell(group.totals.contestantCount.toString(), true),
                ],
              })
            )),
          ],
        }),

        // Contests section header
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Competitions",
              font: "Calibri",
              bold: true,
              size: 26
            })
          ]
        })
      ];

      // Add contest level specific content
      for (const group of groupedContests) {
        // Add the level header
        docContent.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `${group.contestLevel} LEVEL`,
                font: "Calibri",
                bold: true,
                size: 24
              })
            ]
          })
        );
        
        // Add level summary
        docContent.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Contingents: ", bold: true, font: "Calibri" }),
              new TextRun({ text: group.totals.contingentCount.toString(), font: "Calibri" }),
              new TextRun({ text: " | Teams: ", bold: true, font: "Calibri" }),
              new TextRun({ text: group.totals.teamCount.toString(), font: "Calibri" }),
              new TextRun({ text: " | Participants: ", bold: true, font: "Calibri" }),
              new TextRun({ text: group.totals.contestantCount.toString(), font: "Calibri" }),
            ],
            spacing: { after: 100 }
          })
        );

        // Add the contest table
        docContent.push(
          new DocxTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Table headers with column widths
              new DocxTableRow({
                children: [
                  createTableHeader("No"),
                  new DocxTableCell({
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                    },
                    shading: { fill: "DDDDDD" },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "Competition",
                            bold: true,
                            font: "Calibri"
                          })
                        ]
                      })
                    ],
                    width: { size: 50, type: WidthType.PERCENTAGE }
                  }),
                  createTableHeader("Contingents"),
                  createTableHeader("Teams"),
                  createTableHeader("Participants"),
                ],
              }),
              // Table rows for each contest
              ...group.contests.map((contest, index) => (
                new DocxTableRow({
                  children: [
                    createTableCell(`${index + 1}`, true),
                    createTableCell(`${contest.contestCode} ${contest.contestName}`, false),
                    createTableCell(contest.contingentCount.toString(), true),
                    createTableCell(contest.teamCount.toString(), true),
                    createTableCell(contest.contestantCount.toString(), true),
                  ],
                })
              )),
            ],
          })
        );
        
        // Add some spacing after each contest level
        docContent.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      }
      
      // Create the document with all content in a single section
      const doc = new Document({
        sections: [{
          properties: {},
          children: docContent
        }]
      });

      // Generate filename based on zone and date
      const fileName = `competition-statistics-${zoneName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toLocaleDateString('ms-MY').replace(/\//g, '-')}.docx`;
      
      // Generate blob and download
      const Packer = require('docx').Packer;
      
      Packer.toBlob(doc).then((blob: Blob) => {
        saveAs(blob, fileName);
      });
    } catch (error) {
      console.error('Error generating DOCX report:', error);
      alert('An error occurred while generating the report. Please try again later.');
    }
  }; // Close the generateDocxReport function

  // Handle zone filter change
  const handleZoneChange = (value: string) => {
    console.log(`[ContestStatsTable] Zone tab changed to: ${value}`);
    setSelectedZone(value);
    setIsLoading(true); // Show loading state when changing tabs
    
    // If the onFilterChange callback exists, call it with the new filter
    if (onFilterChange) {
      const zoneIdFilter = value !== 'all' ? parseInt(value, 10) : undefined;
      onFilterChange({ zoneId: zoneIdFilter, stateId: currentFilters?.stateId });
      
      // Simulate end of loading after a brief delay
      setTimeout(() => setIsLoading(false), 500);
    } else {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Contest Statistics by Zone</CardTitle>
          <CardDescription>View contest statistics grouped by zone</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={selectedZone || 'all'} className="w-full" onValueChange={handleZoneChange}>
            <TabsList className="mb-4 flex flex-wrap max-w-full overflow-x-auto gap-1">
              <TabsTrigger value="all">All Zones</TabsTrigger>
              {zoneFilters.map((zone) => (
                <TabsTrigger key={zone.id} value={zone.id.toString()}>
                  {zone.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* Empty TabsContent to preserve the tab functionality but not render anything inside them */}
            <TabsContent value="all" />
            {zoneFilters.map((zone) => (
              <TabsContent key={zone.id} value={zone.id.toString()} />
            ))}
          </Tabs>
          
          {/* Controls: Contest count, Download button, and Toggle button */}
          <div className="flex justify-between items-center mt-4 mb-2">
            <div>
              {!isLoading && groupedContests.length > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {groupedContests.reduce((sum, group) => sum + group.contests.length, 0)} contests found
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateDocxReport}
                className="flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                disabled={isLoading || groupedContests.length === 0}
              >
                <Download className="h-4 w-4" />
                <span>Download Summary</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowTable(!showTable)}
                className="flex items-center gap-1"
              >
                {showTable ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    <span>Hide Details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    <span>Show Details</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Contest table - conditionally displayed based on showTable state */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center space-x-2">
                <Skeleton className="h-8 w-8 rounded-full animate-pulse" />
              </div>
              <p className="mt-2 text-gray-500">Loading contest statistics...</p>
            </div>
          ) : groupedContests.length > 0 ? (
            showTable && (
              <div className="mt-2">
                {renderContestTable(groupedContests)}
              </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              No contest data available for the selected filter.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Summary card */}
      <Card className="mb-6">
        <CardHeader className="py-3">
          <CardTitle>Statistics Summary</CardTitle>
          <CardDescription>
            {currentFilters?.zoneId ? (
              <>Filtered by zone: <span className="font-medium">{zoneFilters.find(z => z.id === currentFilters.zoneId)?.name}</span></>
            ) : (
              "All zones"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
              <span>Total Contests:</span>
              <span className="font-bold">{summary.totalContests}</span>
            </div>
            <div className="flex justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
              <span>Total Contingents:</span>
              <span className="font-bold">{summary.totalContingents}</span>
            </div>
            <div className="flex justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
              <span>Total Teams:</span>
              <span className="font-bold">{summary.totalTeams}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Contest tables - grouped by level */}
      {groupedContests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No contest data available
          </CardContent>
        </Card>
      ) : (
        groupedContests.map((group) => 
          groupHasData(group) && (
            <Card key={group.contestLevel} className={cn(
              "mb-6",
              // Apply conditional styling based on level
              group.contestLevel.toLowerCase().includes('kids') ? "bg-green-50 dark:bg-green-900/20" :
              group.contestLevel.toLowerCase().includes('teens') ? "bg-blue-50 dark:bg-blue-900/20" :
              group.contestLevel.toLowerCase().includes('youth') ? "bg-purple-50 dark:bg-purple-900/20" :
              "bg-slate-50 dark:bg-slate-900/20"
            )}>
              <CardHeader className="py-4">
                <CardTitle className="text-xl">
                  {group.contestLevel}
                </CardTitle>
                <CardDescription>
                  {group.contests.length} contest{group.contests.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contest</TableHead>
                      <TableHead className="text-right">Contingents</TableHead>
                      <TableHead className="text-right">Teams</TableHead>
                      <TableHead className="text-right">Contestants</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.contests.map((contestItem) => (
                      <TableRow key={contestItem.contestCode}>
                        <TableCell className="font-medium">
                          <span className="font-bold text-muted-foreground mr-2">{contestItem.contestCode}</span>
                          {contestItem.contestName}
                        </TableCell>
                        <TableCell className="text-right">{contestItem.contingentCount}</TableCell>
                        <TableCell className="text-right">{contestItem.teamCount}</TableCell>
                        <TableCell className="text-right">{contestItem.contestantCount}</TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Group summary row */}
                    {group.contests.length > 0 && (
                      <TableRow className="bg-slate-100 dark:bg-slate-800 font-medium">
                        <TableCell>GROUP TOTAL</TableCell>
                        <TableCell className="text-right">{group.totals.contingentCount}</TableCell>
                        <TableCell className="text-right">{group.totals.teamCount}</TableCell>
                        <TableCell className="text-right">{group.totals.contestantCount}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        )
      )}
      
      {/* Overall Summary row */}
      {groupedContests.length > 0 && (
        <Card className="bg-slate-50 dark:bg-slate-900">
          <CardHeader className="py-3">
            <CardTitle>OVERALL TOTALS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex justify-between p-3 rounded-md bg-white dark:bg-slate-800">
                <span>Total Contests:</span>
                <span className="font-bold">{summary.totalContests}</span>
              </div>
              <div className="flex justify-between p-3 rounded-md bg-white dark:bg-slate-800">
                <span>Total Contingents:</span>
                <span className="font-bold">{summary.totalContingents}</span>
              </div>
              <div className="flex justify-between p-3 rounded-md bg-white dark:bg-slate-800">
                <span>Total Teams:</span>
                <span className="font-bold">{summary.totalTeams}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { 
  AlignmentType,
  BorderStyle,
  Document, 
  Footer,
  HeadingLevel, 
  NumberFormat,
  PageNumber,
  Packer,
  Paragraph, 
  SectionType, 
  Table, 
  TableCell, 
  TableRow, 
  TextRun,
  WidthType
} from "docx";
import { prisma } from "@/lib/prisma";
import * as fs from 'fs';

// Define a helper function to convert buffer to base64
const bufferToBase64 = (buffer: Buffer): string => {
  return buffer.toString('base64');
};

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { search = '', stateFilter = '', tab = 'all' } = body;
    
    // Generate a title based on filters
    let title = `Contingent Report`;
    let subtitleParts: string[] = [];
    
    if (stateFilter) {
      const stateInfo = await prisma.$transaction(async (prismaClient) => {
        return await prismaClient.state.findUnique({
          where: { id: parseInt(stateFilter, 10) },
          select: { name: true }
        });
      });
      if (stateInfo?.name) {
        title = `Contingent Report: ${stateInfo.name}`;
      }
    }
    
    // Add search keyword to subtitle if present
    if (search) {
      subtitleParts.push(`Search: "${search}"`);
    }
    
    // Add selected tab to subtitle
    let tabDisplay = '';
    switch (tab) {
      case 'schools':
        tabDisplay = 'Schools';
        break;
      case 'independent':
        tabDisplay = 'Independent';
        break;
      case 'no-contestants':
        tabDisplay = 'No Contestants';
        break;
      case 'all':
      default:
        tabDisplay = 'All Contingents';
        break;
    }
    subtitleParts.push(`Tab: ${tabDisplay}`);
    
    // Join subtitle components
    const subtitleText = subtitleParts.join(', ');
    
    // Fetch data based on filters
    const { 
      contingents, 
      stats,
      educationLevelStats,
      genderStats 
    } = await fetchContingentData(tab, search, stateFilter);
    
    // Generate the document
    const doc = await generateDocxReport(
      contingents, 
      stats, 
      educationLevelStats,
      genderStats,
      title, 
      subtitleText
    );
    
    // Create response with buffer
    const buffer = await Packer.toBuffer(doc);
    const base64 = bufferToBase64(buffer);
    
    // Create a filename
    let filename = "contingent_report";
    if (stateFilter) filename += `_${title.toLowerCase().replace(/\s+/g, '_')}`;
    if (search) filename += `_search-${search.toLowerCase().replace(/\s+/g, '_')}`;
    if (tab !== 'all') filename += `_${tab}`;
    filename += ".docx";
    
    return NextResponse.json({ 
      success: true, 
      docx: base64,
      filename
    });
  } catch (error) {
    console.error("Error generating DOCX report:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to generate report" 
    }, { status: 500 });
  }
}

// Define types for better TypeScript support
interface Contestant {
  id: number;
  name: string;
  gender?: string;
  edu_level?: string;
}

interface ContingentManager {
  participant: {
    name: string;
    email?: string;
    phoneNumber?: string;
  }
}

interface Contingent {
  id: number;
  name: string;
  schoolId: number | null;
  higherInstId: number | null;
  independentId: number | null;
  school?: {
    name: string;
    ppd?: string;
  };
  higherInstitution?: {
    name: string;
  };
  independent?: {
    name: string;
  };
  managers: ContingentManager[];
  contestants: Contestant[];
}

async function fetchContingentData(tab: string, search: string, stateFilter: string) {
  return await prisma.$transaction(async (prismaClient) => {
    // Build where clause for filtering
    let whereClause: any = {};
    
    // Apply state filter if provided
    if (stateFilter) {
      const stateId = parseInt(stateFilter, 10);
      if (!isNaN(stateId)) {
        if (search) {
          whereClause = {
            OR: [
              {
                name: { contains: search },
                OR: [
                  { school: { stateId } },
                  { higherInstitution: { stateId } },
                  { independent: { stateId } }
                ]
              },
              {
                school: { 
                  name: { contains: search },
                  stateId 
                }
              },
              {
                higherInstitution: { 
                  name: { contains: search },
                  stateId 
                }
              },
              {
                independent: {
                  name: { contains: search },
                  stateId
                }
              }
            ]
          };
        } else {
          whereClause = {
            OR: [
              { school: { stateId } },
              { higherInstitution: { stateId } },
              { independent: { stateId } }
            ]
          };
        }
      }
    } else if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Apply tab-specific filters
    switch (tab) {
      case "schools":
        whereClause.schoolId = { not: null };
        break;
      case "independent":
        whereClause.schoolId = null;
        whereClause.higherInstId = null;
        whereClause.independentId = { not: null };
        break;
      case "no-contestants":
        whereClause.contestants = { none: {} };
        break;
    }

    // Get contingents with details
    const contingents = await prisma.contingent.findMany({
      where: whereClause,
      include: {
        school: true,
        higherInstitution: {
          select: {
            name: true,
            state: true
          }
        },
        independent: {
          select: {
            name: true,
            state: true
          }
        },
        managers: {
          include: {
            participant: {
              select: {
                name: true,
                email: true,
                phoneNumber: true
              }
            }
          },
          take: 1 // Get the primary contact
        },
        contestants: {
          select: {
            id: true,
            name: true,
            gender: true,
            edu_level: true
          }
        },
        _count: {
          select: {
            contestants: true
          }
        }
      },
      orderBy: [
        { school: { ppd: 'asc' } },
        { name: 'asc' }
      ]
    });

    // Calculate statistics
    const totalContingents = contingents.length;
    
    // Count schools, independents, and total contestants
    const schoolCount = await prisma.contingent.count({
      where: {
        ...whereClause,
        schoolId: { not: null }
      }
    });
    
    const independentCount = await prisma.contingent.count({
      where: {
        ...whereClause,
        schoolId: null,
        higherInstId: null,
        independentId: { not: null }
      }
    });

    // Total contestants across all contingents
    let totalContestants = 0;
    
    // Education level counts
    let sekolahRendahCount = 0;
    let sekolahMenengahCount = 0;
    let beliaCount = 0;
    
    // Gender counts
    let maleCount = 0;
    let femaleCount = 0;
    
    // Process each contingent to compile statistics
    contingents.forEach(contingent => {
      totalContestants += contingent.contestants.length;
      
      contingent.contestants.forEach(contestant => {
        // Count by education level
        if (contestant.edu_level === 'sekolah rendah') {
          sekolahRendahCount++;
        } else if (contestant.edu_level === 'sekolah menengah') {
          sekolahMenengahCount++;
        } else if (contestant.edu_level === 'belia') {
          beliaCount++;
        }
        
        // Count by gender
        if (contestant.gender === 'MALE') {
          maleCount++;
        } else if (contestant.gender === 'FEMALE') {
          femaleCount++;
        }
      });
    });
    
    return {
      contingents,
      stats: {
        totalContingents,
        schoolCount,
        independentCount,
        totalContestants
      },
      educationLevelStats: {
        sekolahRendahCount,
        sekolahMenengahCount,
        beliaCount
      },
      genderStats: {
        maleCount,
        femaleCount
      }
    };
  });
}

async function generateDocxReport(
  contingents: any[], 
  stats: any,
  educationLevelStats: any,
  genderStats: any,
  title: string, 
  subtitleText: string
) {
  // Get current date and time for the footer
  const now = new Date();
  const dateTimeString = now.toLocaleString('en-MY', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  // Create a new document with Calibri as default font
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
          }
        }
      },
    },
    sections: [
      {
        properties: {
          page: {
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Page `,
                    size: 18,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                  }),
                  new TextRun({
                    text: ` of `,
                    size: 18,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                  }),
                  new TextRun({
                    text: ` | Generated on: ${dateTimeString}`,
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Title
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          
          // Subtitle if present
          new Paragraph({
            text: subtitleText,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          
          // Statistics Row 1
          new Paragraph({
            text: "Summary Statistics",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          
          // Stats Row 1 - use a table for layout with balanced columns
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  createStatsTableCell("Number of Contingents", stats.totalContingents),
                  createStatsTableCell("Number of Schools", stats.schoolCount),
                  createStatsTableCell("Number of Independents", stats.independentCount)
                ],
              }),
            ],
          }),
          
          // Stats Row 2
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  createStatsTableCell("Total Contestants", stats.totalContestants),
                  createStatsTableCell("Sekolah Rendah", educationLevelStats.sekolahRendahCount),
                  createStatsTableCell("Sekolah Menengah", educationLevelStats.sekolahMenengahCount),
                  createStatsTableCell("Belia", educationLevelStats.beliaCount)
                ],
              }),
            ],
          }),
          
          // Main table title
          new Paragraph({
            text: "Contingent Details",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          
          // Create main table
          createMainTable(contingents),
        ],
      },
    ],
  });
  
  return doc;
}

// Helper function to format numbers with thousands separators
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

// Helper function to create a stats table cell
function createStatsTableCell(label: string, value: number | string) {
  // Format the value if it's a number
  const formattedValue = typeof value === 'number' ? formatNumber(value) : value;
  
  return new TableCell({
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
    shading: {
      fill: "F9F9F9",
    },
    children: [
      new Paragraph({
        children: [
          // Label
          new TextRun({
            text: label,
            size: 20,
            break: 1
          }),
          // Value - make it bold and bigger
          new TextRun({
            text: formattedValue,
            bold: true,
            size: 28,
            break: 1
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 100 },
      }),
    ],
    width: {
      size: 25, // Equal width for all cells (4 columns max)
      type: WidthType.PERCENTAGE,
    },
  });
}

// Helper function to create the main contingent table
function createMainTable(contingents: any[]) {
  // Table header row
  const headerRow = new TableRow({
    tableHeader: true,
    height: {
      value: 500,
      rule: "exact",
    },
    children: [
      createTableHeader("#"),
      createTableHeader("Contingent"),
      createTableHeader("Contact"),
      createTableHeader("Kids"),
      createTableHeader("Teen"),
      createTableHeader("Youth"),
      createTableHeader("Total"),
    ],
  });
  
  // Group contingents by type
  const schoolContingents = contingents.filter(c => c.schoolId !== null);
  const independentContingents = contingents.filter(c => c.independentId !== null);
  const higherInstContingents = contingents.filter(c => c.higherInstId !== null);
  const otherContingents = contingents.filter(c => 
    c.schoolId === null && c.independentId === null && c.higherInstId === null
  );
  
  let allRows: TableRow[] = [];
  let recordIndex = 1;
  
  // Helper function to add a section header
  const addSectionHeader = (title: string) => {
    return new TableRow({
      children: [
        new TableCell({
          columnSpan: 7,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
          shading: {
            fill: "DDDDDD",
          },
          children: [
            new Paragraph({
              children: [new TextRun({ text: title, bold: true })],
              spacing: { before: 50, after: 50 },
            }),
          ],
        }),
      ],
    });
  };
  
  // Helper function to create rows for a group of contingents
  const createContingentRows = (contingentGroup: any[]) => {
    return contingentGroup.map((contingent) => {
      // Get institution name
      const institution = 
        contingent.school?.name || 
        contingent.higherInstitution?.name || 
        contingent.independent?.name || 
        "No institution";
      
      // Get PPD name if this is a school contingent
      const ppdInfo = contingent.school?.ppd ? `PPD: ${contingent.school.ppd}` : null;
      
      // Get manager info
      const manager = contingent.managers && contingent.managers.length > 0 ? contingent.managers[0].participant : null;
      
      // Calculate education level counts
      const kidsCount = contingent.contestants.filter((c: any) => c.edu_level === "sekolah rendah").length;
      const teenCount = contingent.contestants.filter((c: any) => c.edu_level === "sekolah menengah").length;
      const youthCount = contingent.contestants.filter((c: any) => c.edu_level === "belia").length;
      
      // Helper function to display count (empty string if zero)
      const formatCount = (count: number): string => count === 0 ? '' : count.toString();
      
      // Helper function to format total count (dash if zero)
      const formatTotal = (count: number): string => count === 0 ? '-' : count.toString();
      
      // Create the row
      const row = new TableRow({
        children: [
          createTableCell((recordIndex++).toString()),
          createTableCellWithMultipleLines([
            { text: contingent.name, bold: true },
            { text: institution, size: 18, color: "666666" }, // Smaller and gray text for institution
            ...(ppdInfo ? [{ text: ppdInfo, size: 18, color: "666666" }] : []) // Smaller and gray text for PPD
          ]),
          manager ? 
            createTableCellWithMultipleLines([
              { text: manager.name, bold: true },
              { text: manager.email || "-", color: "666666" },
              { text: manager.phoneNumber || "-", color: "666666" }
            ]) : 
            createTableCell("No manager assigned"),
          createTableCell(formatCount(kidsCount)),
          createTableCell(formatCount(teenCount)),
          createTableCell(formatCount(youthCount)),
          createTableCell(formatTotal(contingent.contestants.length)),
        ],
      });
      return row;
    });
  };
  
  // Add school contingents with section header
  if (schoolContingents.length > 0) {
    allRows.push(addSectionHeader("School Contingents"));
    allRows = [...allRows, ...createContingentRows(schoolContingents)];
  }
  
  // Add independent contingents with section header
  if (independentContingents.length > 0) {
    allRows.push(addSectionHeader("Independent Contingents"));
    allRows = [...allRows, ...createContingentRows(independentContingents)];
  }
  
  // Add higher institution contingents with section header
  if (higherInstContingents.length > 0) {
    allRows.push(addSectionHeader("Higher Institution Contingents"));
    allRows = [...allRows, ...createContingentRows(higherInstContingents)];
  }
  
  // Add other contingents if any
  if (otherContingents.length > 0) {
    allRows.push(addSectionHeader("Other Contingents"));
    allRows = [...allRows, ...createContingentRows(otherContingents)];
  }
  
  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
    rows: [headerRow, ...allRows],
  });
}

// Helper function to create table header cell
function createTableHeader(text: string) {
  return new TableCell({
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
    shading: {
      fill: "EEEEEE",
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 50, after: 50 },
        children: [
          new TextRun({
            text,
            bold: true,
          }),
        ],
      }),
    ],
  });
}

// Helper function to create table cell
function createTableCell(text: string) {
  return new TableCell({
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
    children: [
      new Paragraph({
        text,
        alignment: AlignmentType.CENTER,
      }),
    ],
  });
}

// Define interface for text line properties
interface TextLine {
  text: string;
  bold?: boolean;
  size?: number;
  color?: string;
}

// Helper function to create table cell with multiple lines of text
function createTableCellWithMultipleLines(lines: TextLine[]) {
  return new TableCell({
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    },
    children: [
      new Paragraph({
        children: lines.map((line, index) => {
          return new TextRun({
            text: line.text,
            bold: line.bold || false,
            size: line.size,
            color: line.color,
            break: index > 0 ? 1 : 0, // Add line break between lines
          });
        }),
      }),
    ],
  });
}

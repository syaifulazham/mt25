import { NextRequest, NextResponse } from "next/server";
import * as ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

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
    
    // Fetch data based on filters (reusing from DOCX route)
    const { 
      contingents, 
      stats,
      educationLevelStats
    } = await fetchContingentData(tab, search, stateFilter);
    
    // Generate the Excel workbook
    const workbook = await generateExcelReport(
      contingents as any[], 
      stats, 
      educationLevelStats,
      title, 
      subtitleText
    );
    
    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = bufferToBase64(Buffer.from(buffer));
    
    // Create a filename
    let filename = "contingent_report";
    if (stateFilter) filename += `_${title.toLowerCase().replace(/\s+/g, '_')}`;
    if (search) filename += `_search_${search.toLowerCase().replace(/\s+/g, '_')}`;
    filename += ".xlsx";
    
    return NextResponse.json({ 
      success: true, 
      xlsx: base64, 
      filename
    });
    
  } catch (error) {
    console.error('Error generating XLSX:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate XLSX report' 
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
  };
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
    
    // Calculate total contestants and breakdown by education level
    let totalContestants = 0;
    let kidsCount = 0; // sekolah rendah
    let teenCount = 0; // sekolah menengah
    let youthCount = 0; // belia
    
    contingents.forEach(contingent => {
      totalContestants += contingent.contestants.length;
      
      contingent.contestants.forEach(contestant => {
        if (contestant.edu_level === 'sekolah rendah') {
          kidsCount++;
        } else if (contestant.edu_level === 'sekolah menengah') {
          teenCount++;
        } else if (contestant.edu_level === 'belia') {
          youthCount++;
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
        kidsCount,
        teenCount,
        youthCount
      }
    };
  });
}

// Helper function to format numbers with thousands separators
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function generateExcelReport(
  contingents: Contingent[], 
  stats: any,
  educationLevelStats: any,
  title: string, 
  subtitleText: string
): Promise<ExcelJS.Workbook> {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Techlympics 2025';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // Set default font (using creator property as ExcelJS doesn't directly support font options)
  workbook.creator = 'Techlympics 2025';
  workbook.lastModifiedBy = 'Techlympics 2025';
  
  // Create Summary worksheet
  const summarySheet = workbook.addWorksheet('Summary');
  
  // Add title
  const titleRow = summarySheet.addRow([title]);
  titleRow.font = { bold: true, size: 16 };
  summarySheet.addRow([subtitleText]);
  summarySheet.addRow([]);
  
  // Add summary statistics
  const statsHeaderRow = summarySheet.addRow(['SUMMARY STATISTICS']);
  statsHeaderRow.font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  
  // Add first row of statistics
  const stats1Row = summarySheet.addRow([
    'Contingents', formatNumber(stats.totalContingents), 
    'Schools', formatNumber(stats.schoolCount), 
    'Independent', formatNumber(stats.independentCount)
  ]);
  
  // Add second row of statistics
  const stats2Row = summarySheet.addRow([
    'Total Participants', formatNumber(stats.totalContestants), 
    'Sekolah Rendah', formatNumber(educationLevelStats.kidsCount), 
    'Sekolah Menengah', formatNumber(educationLevelStats.teenCount),
    'Belia', formatNumber(educationLevelStats.youthCount)
  ]);
  
  // Format statistics cells
  [0, 2, 4].forEach(cellIndex => {
    if (stats1Row.getCell(cellIndex + 1).value) {
      stats1Row.getCell(cellIndex + 1).font = { bold: false };
    }
    if (stats1Row.getCell(cellIndex + 2).value) {
      stats1Row.getCell(cellIndex + 2).font = { bold: true, size: 14 };
    }
  });
  
  [0, 2, 4, 6].forEach(cellIndex => {
    if (stats2Row.getCell(cellIndex + 1).value) {
      stats2Row.getCell(cellIndex + 1).font = { bold: false };
    }
    if (stats2Row.getCell(cellIndex + 2).value) {
      stats2Row.getCell(cellIndex + 2).font = { bold: true, size: 14 };
    }
  });
  
  // Adjust column widths
  summarySheet.columns.forEach(column => {
    column.width = 20;
  });
  
  // Add space before contingent details
  summarySheet.addRow([]);
  summarySheet.addRow([]);
  
  // Create Contingents worksheet
  const contingentsSheet = workbook.addWorksheet('Contingents');
  
  // Add headers to contingents sheet
  const headers = [
    'No.', 'Contingent', 'Contact', 'Kids', 'Teen', 'Youth', 'Total'
  ];
  const headerRow = contingentsSheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Add borders to header cells
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // Group contingents by type
  const schoolContingents = contingents.filter(c => c.schoolId !== null);
  const independentContingents = contingents.filter(c => c.independentId !== null);
  const otherContingents = contingents.filter(c => !c.schoolId && !c.independentId);
  
  // Helper function to format zero values
  const formatZeroCount = (count: number): string => count === 0 ? '' : count.toString();
  const formatTotalCount = (count: number): string => count === 0 ? '-' : count.toString();
  
  // Add school contingents with header
  if (schoolContingents.length > 0) {
    const schoolHeader = contingentsSheet.addRow(['School Contingents']);
    schoolHeader.font = { bold: true, size: 14 };
    schoolHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' }
    };
    contingentsSheet.mergeCells(`A${schoolHeader.number}:G${schoolHeader.number}`);
    
    // Add school contingent data
    let recordIndex = 1;
    schoolContingents.forEach(contingent => {
      // Calculate education level counts
      const kidsCount = contingent.contestants.filter(c => c.edu_level === 'sekolah rendah').length;
      const teenCount = contingent.contestants.filter(c => c.edu_level === 'sekolah menengah').length;
      const youthCount = contingent.contestants.filter(c => c.edu_level === 'belia').length;
      
      // Get school and PPD info
      const schoolName = contingent.school?.name || '-';
      const ppdInfo = contingent.school?.ppd || '-';
      
      // Get manager info
      const manager = contingent.managers[0]?.participant;
      
      // Add row
      const row = contingentsSheet.addRow([
        recordIndex.toString(),
        `${contingent.name}\n${schoolName}\n${ppdInfo}`,
        manager ? `${manager.name}\n${manager.email || '-'}\n${manager.phoneNumber || '-'}` : 'No manager assigned',
        formatZeroCount(kidsCount),
        formatZeroCount(teenCount),
        formatZeroCount(youthCount),
        formatTotalCount(contingent.contestants.length)
      ]);
      
      recordIndex++;
      
      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Format the contingent name and contact info
      const contingentCell = row.getCell(2);
      contingentCell.alignment = { wrapText: true };
      
      const contactCell = row.getCell(3);
      contactCell.alignment = { wrapText: true };
    });
  }
  
  // Add independent contingents with header
  if (independentContingents.length > 0) {
    const independentHeader = contingentsSheet.addRow(['Independent Contingents']);
    independentHeader.font = { bold: true, size: 14 };
    independentHeader.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' }
    };
    contingentsSheet.mergeCells(`A${independentHeader.number}:G${independentHeader.number}`);
    
    // Add independent contingent data
    let recordIndex = schoolContingents.length + 1;
    independentContingents.forEach(contingent => {
      // Calculate education level counts
      const kidsCount = contingent.contestants.filter(c => c.edu_level === 'sekolah rendah').length;
      const teenCount = contingent.contestants.filter(c => c.edu_level === 'sekolah menengah').length;
      const youthCount = contingent.contestants.filter(c => c.edu_level === 'belia').length;
      
      // Get independent info
      const independentName = contingent.independent?.name || '-';
      
      // Get manager info
      const manager = contingent.managers[0]?.participant;
      
      // Add row
      const row = contingentsSheet.addRow([
        recordIndex.toString(),
        `${contingent.name}\n${independentName}`,
        manager ? `${manager.name}\n${manager.email || '-'}\n${manager.phoneNumber || '-'}` : 'No manager assigned',
        formatZeroCount(kidsCount),
        formatZeroCount(teenCount),
        formatZeroCount(youthCount),
        formatTotalCount(contingent.contestants.length)
      ]);
      
      recordIndex++;
      
      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Format the contingent name and contact info
      const contingentCell = row.getCell(2);
      contingentCell.alignment = { wrapText: true };
      
      const contactCell = row.getCell(3);
      contactCell.alignment = { wrapText: true };
    });
  }
  
  // Set column widths
  contingentsSheet.columns = [
    { width: 5 },  // No.
    { width: 30 }, // Contingent
    { width: 30 }, // Contact
    { width: 10 }, // Kids
    { width: 10 }, // Teen
    { width: 10 }, // Youth
    { width: 10 }  // Total
  ];
  
  // Add generation timestamp in footer
  const now = new Date();
  const timestamp = `Generated on ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
  
  // Add timestamp to both worksheets
  summarySheet.headerFooter = {
    oddFooter: `&L&A&C${timestamp}&R&P of &N`
  };
  
  contingentsSheet.headerFooter = {
    oddFooter: `&L&A&C${timestamp}&R&P of &N`
  };
  
  return workbook;
}

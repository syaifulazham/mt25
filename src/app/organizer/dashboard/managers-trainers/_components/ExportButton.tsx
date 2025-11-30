"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from 'xlsx';

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

interface StateData {
  stateName: string;
  managerCount: number;
  trainerCount: number;
}

interface ExportButtonProps {
  managerStats: ManagerStats;
  trainerStats: TrainerStats;
  schoolByState: StateData[];
  independentByState: StateData[];
}

export default function ExportButton({
  managerStats,
  trainerStats,
  schoolByState,
  independentByState
}: ExportButtonProps) {
  
  const handleExport = () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary Statistics
    const summaryData: any[][] = [
      ['Managers & Trainers Statistics'],
      [''],
      ['Category', 'Total', 'School', 'Independent'],
      ['Managers', managerStats.total, managerStats.school, managerStats.independent],
      ['Trainers', trainerStats.total, trainerStats.school, trainerStats.independent],
      [''],
      ['Combined Totals'],
      ['', 'Total', 'School', 'Independent'],
      ['All Staff', managerStats.total + trainerStats.total, managerStats.school + trainerStats.school, managerStats.independent + trainerStats.independent],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    summarySheet['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sheet 2: School Managers & Trainers by State
    const schoolData: any[][] = [
      ['School Managers & Trainers by State'],
      [''],
      ['State', 'Managers', 'Managers %', 'Trainers', 'Trainers %', 'Total'],
    ];
    
    schoolByState.forEach(state => {
      const managerPct = managerStats.school > 0 ? ((state.managerCount / managerStats.school) * 100).toFixed(1) + '%' : '0%';
      const trainerPct = trainerStats.school > 0 ? ((state.trainerCount / trainerStats.school) * 100).toFixed(1) + '%' : '0%';
      const total = state.managerCount + state.trainerCount;
      
      schoolData.push([
        state.stateName,
        state.managerCount,
        managerPct,
        state.trainerCount,
        trainerPct,
        total
      ]);
    });
    
    // Add NATIONAL total
    schoolData.push(
      [''],
      ['NATIONAL', managerStats.school, '100%', trainerStats.school, '100%', managerStats.school + trainerStats.school]
    );
    
    const schoolSheet = XLSX.utils.aoa_to_sheet(schoolData);
    schoolSheet['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, schoolSheet, 'School by State');

    // Sheet 3: Independent Managers & Trainers by State
    const independentData: any[][] = [
      ['Independent Managers & Trainers by State'],
      [''],
      ['State', 'Managers', 'Managers %', 'Trainers', 'Trainers %', 'Total'],
    ];
    
    independentByState.forEach(state => {
      const managerPct = managerStats.independent > 0 ? ((state.managerCount / managerStats.independent) * 100).toFixed(1) + '%' : '0%';
      const trainerPct = trainerStats.independent > 0 ? ((state.trainerCount / trainerStats.independent) * 100).toFixed(1) + '%' : '0%';
      const total = state.managerCount + state.trainerCount;
      
      independentData.push([
        state.stateName,
        state.managerCount,
        managerPct,
        state.trainerCount,
        trainerPct,
        total
      ]);
    });
    
    // Add NATIONAL total
    independentData.push(
      [''],
      ['NATIONAL', managerStats.independent, '100%', trainerStats.independent, '100%', managerStats.independent + trainerStats.independent]
    );
    
    const independentSheet = XLSX.utils.aoa_to_sheet(independentData);
    independentSheet['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, independentSheet, 'Independent by State');

    // Generate and download file
    const fileName = `Managers_Trainers_Statistics_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Button onClick={handleExport} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
      <Download className="h-4 w-4" />
      Download Excel
    </Button>
  );
}

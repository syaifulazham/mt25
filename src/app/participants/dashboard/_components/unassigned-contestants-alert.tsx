"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AlertCircle, Award, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

// Translations for the unassigned contestants alert
const translations = {
  en: {
    title: "Action Required",
    description: "You have {count} contestants not assigned to any contests. Contestants must be assigned to contests to participate.",
    action: "Assign Contests to Contestants",
    bulk_action: "Bulk Assign Contests",
    loading: "Checking contestants status...",
    bulk_assign_title: "Bulk Assign Contests",
    bulk_assign_description: "Automatically assign contests to all contestants based on their education level and age.",
    bulk_assign_results: "Results",
    bulk_assign_cancel: "Cancel",
    bulk_assign_confirm: "Assign"
  },
  my: {
    title: "Tindakan Diperlukan",
    description: "Anda mempunyai {count} peserta yang belum ditugaskan ke mana-mana pertandingan. Peserta mesti ditugaskan ke pertandingan untuk menyertai.",
    action: "Tugaskan Pertandingan kepada Peserta",
    bulk_action: "Tugasan Pertandingan Secara Pukal",
    loading: "Memeriksa status peserta...",
    bulk_assign_title: "Tugasan Pertandingan Secara Pukal",
    bulk_assign_description: "Tugaskan pertandingan secara automatik kepada semua peserta berdasarkan tahap pendidikan dan umur mereka.",
    bulk_assign_results: "Keputusan",
    bulk_assign_cancel: "Batal",
    bulk_assign_confirm: "Tugaskan"
  },
  zh: {
    title: "需要采取行动",
    description: "您有 {count} 名参赛者尚未分配到任何比赛。参赛者必须分配到比赛才能参加。",
    action: "为参赛者分配比赛",
    bulk_action: "批量分配比赛",
    loading: "正在检查参赛者状态...",
    bulk_assign_title: "批量分配比赛",
    bulk_assign_description: "根据参赛者的教育水平和年龄自动为所有参赛者分配比赛。",
    bulk_assign_results: "结果",
    bulk_assign_cancel: "取消",
    bulk_assign_confirm: "分配"
  },
  fil: {
    title: "Kinakailangan ang Aksyon",
    description: "Mayroon kang {count} na kalahok na hindi pa naitalaga sa anumang paligsahan. Ang mga kalahok ay dapat naitalaga sa mga paligsahan upang makalahok.",
    action: "Italaga ang mga Paligsahan sa mga Kalahok",
    bulk_action: "Maramihang Italaga ang mga Paligsahan",
    loading: "Sinusuri ang kalagayan ng mga kalahok...",
    bulk_assign_title: "Maramihang Italaga ang mga Paligsahan",
    bulk_assign_description: "Awtomatikong italaga ang mga paligsahan sa lahat ng kalahok batay sa kanilang antas ng edukasyon at edad.",
    bulk_assign_results: "Mga Resulta",
    bulk_assign_cancel: "Kanselahin",
    bulk_assign_confirm: "Italaga"
  },
  th: {
    title: "จำเป็นต้องดำเนินการ",
    description: "คุณมีผู้เข้าแข่งขัน {count} คนที่ยังไม่ได้รับมอบหมายให้เข้าร่วมการแข่งขันใดๆ ผู้เข้าแข่งขันต้องได้รับมอบหมายให้เข้าร่วมการแข่งขันเพื่อเข้าร่วม",
    action: "มอบหมายการแข่งขันให้กับผู้เข้าแข่งขัน",
    bulk_action: "มอบหมายการแข่งขันเป็นกลุ่ม",
    loading: "กำลังตรวจสอบสถานะผู้เข้าแข่งขัน...",
    bulk_assign_title: "มอบหมายการแข่งขันเป็นกลุ่ม",
    bulk_assign_description: "มอบหมายการแข่งขันให้กับผู้เข้าแข่งขันทั้งหมดโดยอัตโนมัติตามระดับการศึกษาและอายุ",
    bulk_assign_results: "ผลลัพธ์",
    bulk_assign_cancel: "ยกเลิก",
    bulk_assign_confirm: "มอบหมาย"
  },
  ib: {
    title: "Gawa Diperlukan",
    description: "Nuan bisi {count} peserta ti bedau ditugaska ke pertandingan. Peserta mesti ditugaska ke pertandingan untuk bekunsi.",
    action: "Tugaska Pertandingan Ngagai Peserta",
    bulk_action: "Tugaska Pertandingan Bekumpul",
    loading: "Meriksa status peserta...",
    bulk_assign_title: "Tugaska Pertandingan Bekumpul",
    bulk_assign_description: "Otomatik tugaska pertandingan ngagai semua peserta bedaska pengawa belajar enggau umur sida.",
    bulk_assign_results: "Keputusan",
    bulk_assign_cancel: "Enda Jadi",
    bulk_assign_confirm: "Tugaska"
  }
};

export default function UnassignedContestantsAlert() {
  const { language } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [unassignedData, setUnassignedData] = useState<{
    totalContestants: number;
    unassignedContestants: number;
    hasUnassignedContestants: boolean;
  } | null>(null);
  
  // States for bulk assign dialog
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);
  const [bulkAssignResult, setBulkAssignResult] = useState<{
    success?: boolean;
    assignmentsCreated?: number;
    errors?: any[];
  } | null>(null);

  // Function to check for unassigned contestants
  const checkUnassignedContestants = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching unassigned contestants data...');
      const response = await fetch('/api/participants/contestants/unassigned?t=' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch unassigned contestants data");
      }

      const data = await response.json();
      console.log('Unassigned contestants data:', data);
      setUnassignedData(data);
    } catch (error) {
      console.error("Error checking unassigned contestants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Run the check when component mounts
  useEffect(() => {
    checkUnassignedContestants();
  }, []);

  // Only show loading state initially, then either show the alert or nothing
  if (isLoading) {
    return (
      <div className="mb-4 text-sm text-muted-foreground text-center animate-pulse">
        {translations[language]?.loading || translations['en'].loading}
      </div>
    );
  }

  // Don't show anything if there's no data or no unassigned contestants
  if (!unassignedData) {
    console.log('No unassigned data available');
    return null;
  }
  
  console.log('Unassigned data check:', {
    totalContestants: unassignedData.totalContestants,
    unassignedContestants: unassignedData.unassignedContestants,
    hasUnassignedContestants: unassignedData.hasUnassignedContestants
  });
  
  // Show the alert if either:
  // 1. hasUnassignedContestants is true (API says there are unassigned contestants)
  // 2. OR we have some contestants and some/all of them are unassigned
  const shouldShowAlert = unassignedData.hasUnassignedContestants || 
    (unassignedData.totalContestants > 0 && unassignedData.unassignedContestants > 0);
  
  if (!shouldShowAlert) {
    console.log('Alert should not show based on data');
    return null;
  }

  // Get translations for current language or fall back to English
  const t = translations[language] || translations['en'];
  
  // Handle bulk assignment of contests
  const handleBulkAssign = async () => {
    try {
      setBulkAssignLoading(true);
      setBulkAssignResult(null);
      
      const response = await fetch("/api/participants/contests/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to assign contests");
      }
      
      setBulkAssignResult(data);
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Successfully assigned contests to ${data.assignmentsCreated} contestants`,
          variant: "default",
        });
        
        // Refresh the unassigned data after successful bulk assignment
        checkUnassignedContestants();
      }
    } catch (error) {
      console.error("Error assigning contests:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to assign contests",
        variant: "destructive",
      });
    } finally {
      setBulkAssignLoading(false);
    }
  };
  // Replace {count} placeholder with actual count
  const description = t.description.replace('{count}', String(unassignedData.unassignedContestants));

  return (
    <>
      <div className="mb-6 animate-fadeIn rounded-md overflow-hidden border border-amber-300">
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 p-4 shadow-sm">
          <div className="flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-900 dark:text-amber-300">{t.title}</h4>
              <div className="mt-2 text-amber-800 dark:text-amber-200">
                <p className="mb-3">{description}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => router.push('/participants/contestants')}
                    className="whitespace-nowrap w-full sm:w-auto bg-amber-600 hover:bg-amber-700 border-amber-700"
                  >
                    {t.action}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setBulkAssignOpen(true)}
                    className="whitespace-nowrap w-full sm:w-auto bg-blue-600 hover:bg-blue-700 border-blue-700"
                    variant="default"
                  >
                    <Award className="mr-1 h-3.5 w-3.5" />
                    {t.bulk_action}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.bulk_assign_title}</DialogTitle>
            <DialogDescription>
              {t.bulk_assign_description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              {language === 'en' ? 'This will:' : ''}
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {language === 'en' && (
                <>
                  <li>Find all contestants without contest assignments</li>
                  <li>Match contests suitable for their education level and age</li>
                  <li>Create contest participation entries automatically</li>
                  <li>Skip contestants already assigned to contests</li>
                </>
              )}
              {language === 'my' && (
                <>
                  <li>Cari semua peserta tanpa tugasan pertandingan</li>
                  <li>Padankan pertandingan yang sesuai dengan tahap pendidikan dan umur mereka</li>
                  <li>Cipta penyertaan pertandingan secara automatik</li>
                  <li>Langkau peserta yang sudah ditugaskan ke pertandingan</li>
                </>
              )}
              {language === 'zh' && (
                <>
                  <li>查找所有没有分配比赛的参赛者</li>
                  <li>匹配适合其教育水平和年龄的比赛</li>
                  <li>自动创建比赛参与条目</li>
                  <li>跳过已分配到比赛的参赛者</li>
                </>
              )}
              {language === 'fil' && (
                <>
                  <li>Hanapin ang lahat ng kalahok na walang nakatalagang paligsahan</li>
                  <li>Itugma ang mga paligsahan na angkop sa kanilang antas ng edukasyon at edad</li>
                  <li>Lumikha ng mga entry sa pakikilahok sa paligsahan nang awtomatiko</li>
                  <li>Laktawan ang mga kalahok na nakatalaga na sa mga paligsahan</li>
                </>
              )}
              {language === 'th' && (
                <>
                  <li>ค้นหาผู้เข้าแข่งขันทั้งหมดที่ไม่ได้รับมอบหมายการแข่งขัน</li>
                  <li>จับคู่การแข่งขันที่เหมาะสมกับระดับการศึกษาและอายุของพวกเขา</li>
                  <li>สร้างรายการเข้าร่วมการแข่งขันโดยอัตโนมัติ</li>
                  <li>ข้ามผู้เข้าแข่งขันที่ได้รับมอบหมายการแข่งขันแล้ว</li>
                </>
              )}
            </ul>
            
            {bulkAssignResult && (
              <div className="mt-4 p-3 rounded-md bg-muted">
                <p className="font-medium">{t.bulk_assign_results}:</p>
                <p className="text-sm">
                  {bulkAssignResult.assignmentsCreated} contestants assigned
                </p>
                {bulkAssignResult.errors && bulkAssignResult.errors.length > 0 && (
                  <p className="text-sm text-destructive">
                    {bulkAssignResult.errors.length} errors occurred
                  </p>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setBulkAssignOpen(false)}
              disabled={bulkAssignLoading}
            >
              {t.bulk_assign_cancel}
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={bulkAssignLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {bulkAssignLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === 'en' ? 'Processing...' : 
                   language === 'my' ? 'Memproses...' : 
                   language === 'zh' ? '处理中...' :
                   language === 'fil' ? 'Pinoproseso...' :
                   'กำลังประมวลผล...'}
                </>
              ) : (
                t.bulk_assign_confirm
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

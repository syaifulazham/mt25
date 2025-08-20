import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from 'lucide-react';

interface Contestant {
  attendanceContestantId: number;
  contestantId: number;
  attendanceState: string;
  contestantName: string;
  contestantIc: string;
  contestantGender: string;
  contestantAge: number;
  teamId: number;
  teamName: string;
  contestId: number;
  contestName: string;
}

interface ContestantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contingentName: string;
  contestants: Contestant[];
  loading: boolean;
}

export default function ContestantsModal({
  isOpen,
  onClose,
  contingentName,
  contestants,
  loading
}: ContestantsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Contestants - {contingentName}
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-gray-500">Loading contestants...</p>
          </div>
        ) : contestants.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-lg font-medium text-gray-600">No contestants found</p>
            <p className="text-sm text-gray-500">This contingent has no contestants with attendance records.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-500">
              Showing {contestants.length} contestants
            </div>
            
            <div className="border rounded-md overflow-auto max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contestants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contestants.map((contestant, index) => (
                    <TableRow key={contestant.attendanceContestantId}>
                      <TableCell>
                        <div className="font-medium">
                          <span className="inline-flex items-center justify-center text-xs bg-gray-200 text-gray-800 rounded-full h-5 w-5 mr-2">#{index + 1}</span>
                          {contestant.contestantName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 ml-7">{contestant.teamName}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

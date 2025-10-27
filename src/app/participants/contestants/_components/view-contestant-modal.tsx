'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/language-context';
import { Contestant } from '@/types/contestant';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ViewContestantModalProps {
  contestant: Contestant;
}

export default function ViewContestantModal({ contestant }: ViewContestantModalProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="View Details">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contestant Details</DialogTitle>
          <DialogDescription>
            View detailed information about this contestant
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-sm font-medium">{contestant.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">IC Number</p>
                <p className="text-sm font-medium">{contestant.ic || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Gender</p>
                <p className="text-sm font-medium">
                  {contestant.gender === 'M' ? 'Male' : contestant.gender === 'F' ? 'Female' : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Age</p>
                <p className="text-sm font-medium">{contestant.age || '-'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Education Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Education</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Education Level</p>
                <p className="text-sm font-medium">
                  {contestant.edu_level === 'primary' ? 'Primary School' :
                   contestant.edu_level === 'secondary' ? 'Secondary School' :
                   contestant.edu_level === 'tertiary' ? 'Tertiary' :
                   contestant.edu_level === 'vocational' ? 'Vocational' : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">PPKI</p>
                <div className="mt-1">
                  <Badge variant={contestant.is_ppki ? "default" : "secondary"}>
                    {contestant.is_ppki ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Class/Grade</p>
                <p className="text-sm font-medium">{contestant.class_grade || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Class Name</p>
                <p className="text-sm font-medium">{contestant.class_name || '-'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact & Status */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact & Status</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium break-all">{contestant.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium">{contestant.phoneNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Hashcode</p>
                <p className="text-sm font-mono">{contestant.hashcode || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <div className="mt-1">
                  <Badge variant={contestant.status === 'active' ? "default" : "secondary"}>
                    {contestant.status || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Contingent Info */}
          <Separator />
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Contingent</h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Contingent Name</p>
                <p className="text-sm font-medium">{contestant.contingent?.name || '-'}</p>
              </div>
              {contestant.contingent?.school && (
                <div>
                  <p className="text-xs text-gray-500">School</p>
                  <p className="text-sm font-medium">{contestant.contingent.school.name}</p>
                </div>
              )}
              {contestant.contingent?.higherInstitution && (
                <div>
                  <p className="text-xs text-gray-500">Higher Institution</p>
                  <p className="text-sm font-medium">{contestant.contingent.higherInstitution.name}</p>
                </div>
              )}
              {contestant.contingentId && (
                <a 
                  href={`/participants/contingents/${contestant.contingentId}`}
                  className="text-xs text-blue-600 hover:underline inline-block"
                >
                  View Contingent Details →
                </a>
              )}
            </div>
          </div>

          {/* Timestamps */}
          {(contestant.createdAt || contestant.updatedAt) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Record Info</h3>
                <div className="grid grid-cols-2 gap-3">
                  {contestant.createdAt && (
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-xs font-medium">{new Date(contestant.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                  {contestant.updatedAt && (
                    <div>
                      <p className="text-xs text-gray-500">Last Updated</p>
                      <p className="text-xs font-medium">{new Date(contestant.updatedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

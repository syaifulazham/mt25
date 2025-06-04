"use client";

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Input 
} from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  MoreHorizontal, 
  Search, 
  UserPlus, 
  Users,
  Trash,
  FileEdit,
  UserCog,
  Download,
  Upload,
  Filter,
  RefreshCw,
  FilePlus2
} from "lucide-react";
import { useContingent } from './contingent-context';
import ContestantForm from './contestant-form';

export interface ContestantsListProps {
  contingentId: number;
}

const ContestantsList: React.FC<ContestantsListProps> = ({ contingentId }) => {
  const { contingent, contestants, isLoading, refreshContestants } = useContingent();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContestant, setSelectedContestant] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [contestantMenuStates, setContestantMenuStates] = useState<Record<number, boolean>>({});
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Filter contestants by search term
  const filteredContestants = contestants.filter((contestant) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contestant.name.toLowerCase().includes(searchLower) ||
      contestant.ic.toLowerCase().includes(searchLower) ||
      (contestant.email && contestant.email.toLowerCase().includes(searchLower)) ||
      (contestant.edu_level && contestant.edu_level.toLowerCase().includes(searchLower)) ||
      (contestant.class_grade && contestant.class_grade.toLowerCase().includes(searchLower)) ||
      (contestant.class_name && contestant.class_name.toLowerCase().includes(searchLower))
    );
  });

  // Handle edit contestant
  const handleEditContestant = (contestant: any) => {
    setSelectedContestant(contestant);
    setIsEditing(true);
  };

  // Handle delete contestant
  const handleDeleteContestant = (contestant: any) => {
    setSelectedContestant(contestant);
    setIsDeleting(true);
  };

  // Handle adding a new contestant
  const handleAddContestant = () => {
    setSelectedContestant(null);
    setIsAddingNew(true);
  };

  // Handle form completion
  const handleFormComplete = () => {
    setIsEditing(false);
    setIsAddingNew(false);
    refreshContestants();
    toast.success(isEditing ? "Contestant updated successfully" : "Contestant added successfully");
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedContestant) return;
    
    try {
      const response = await fetch(`/api/organizer/contestants/${selectedContestant.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete contestant: ${response.status}`);
      }
      
      toast.success("Contestant deleted successfully");
      refreshContestants();
    } catch (err) {
      console.error("Error deleting contestant:", err);
      toast.error("Failed to delete contestant");
    } finally {
      setIsDeleting(false);
      setSelectedContestant(null);
    }
  };

  // Handle CSV import
  const handleImportCSV = () => {
    toast.info("CSV Import feature will be available soon");
  };

  // Handle CSV export
  const handleExportCSV = () => {
    toast.info("CSV Export feature will be available soon");
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Contestants</CardTitle>
              <CardDescription>
                Manage contestants for {contingent?.name || 'this contingent'}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleImportCSV}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleAddContestant}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Contestant
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contestants..."
                className="pl-8"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshContestants}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Contestants Table */}
          {filteredContestants.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>IC Number</TableHead>
                    <TableHead>Education Level</TableHead>
                    <TableHead>Class Grade</TableHead>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContestants.map((contestant) => (
                    <TableRow key={contestant.id}>
                      <TableCell className="font-medium">{contestant.name}</TableCell>
                      <TableCell>{contestant.ic}</TableCell>
                      <TableCell>{contestant.edu_level || 'N/A'}</TableCell>
                      <TableCell>{contestant.class_grade || 'N/A'}</TableCell>
                      <TableCell>{contestant.class_name || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {contestant.email && <div>{contestant.email}</div>}
                          {contestant.phone && <div>{contestant.phone}</div>}
                          {!contestant.email && !contestant.phone && 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="relative inline-block text-left">
                          <div>
                            <div 
                              onClick={() => {
                                const newContestantMenuStates = {...contestantMenuStates};
                                newContestantMenuStates[contestant.id] = !contestantMenuStates[contestant.id];
                                setContestantMenuStates(newContestantMenuStates);
                              }}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-secondary cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </div>
                          </div>
                          {contestantMenuStates[contestant.id] && (
                            <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                                 role="menu"
                                 aria-orientation="vertical"
                                 aria-labelledby="menu-button">
                              <div className="py-1" role="none">
                                <div className="px-3 py-2 text-xs font-medium text-gray-500">Actions</div>
                                <div className="h-px bg-gray-200 my-1"></div>
                                
                                <div 
                                  onClick={() => {
                                    handleEditContestant(contestant);
                                    const newContestantMenuStates = {...contestantMenuStates};
                                    newContestantMenuStates[contestant.id] = false;
                                    setContestantMenuStates(newContestantMenuStates);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                  <FileEdit className="h-4 w-4 mr-2" />
                                  Edit Contestant
                                </div>
                                
                                <div 
                                  onClick={() => {
                                    handleDeleteContestant(contestant);
                                    const newContestantMenuStates = {...contestantMenuStates};
                                    newContestantMenuStates[contestant.id] = false;
                                    setContestantMenuStates(newContestantMenuStates);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete Contestant
                                </div>
                                
                                <div className="h-px bg-gray-200 my-1"></div>
                                
                                <div 
                                  onClick={() => {
                                    // Handle manage teams action here
                                    const newContestantMenuStates = {...contestantMenuStates};
                                    newContestantMenuStates[contestant.id] = false;
                                    setContestantMenuStates(newContestantMenuStates);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Manage Teams
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 border rounded-md">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No contestants found</h3>
              <p className="mt-2 text-center text-muted-foreground max-w-xs">
                {searchTerm ? 'No contestants match your search criteria.' : 'This contingent has no contestants yet.'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={handleAddContestant}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add a contestant
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add Contestant Dialog */}
      <Dialog open={isEditing || isAddingNew} onOpenChange={(open) => {
        if (!open) {
          setIsEditing(false);
          setIsAddingNew(false);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Contestant' : 'Add New Contestant'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? `Update details for ${selectedContestant?.name}`
                : `Add a new contestant to ${contingent?.name || 'this contingent'}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <ContestantForm 
            contestant={selectedContestant}
            contingentId={contingentId}
            onComplete={handleFormComplete}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the contestant
              &quot;{selectedContestant?.name}&quot; and remove their records from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleting(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const LoadingState = () => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-6 w-36 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex justify-between mb-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="border rounded-md">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex justify-between items-center py-4">
              {[1, 2, 3, 4, 5, 6].map(j => (
                <Skeleton key={j} className="h-4 w-20" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ContestantsList;

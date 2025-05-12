"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Clock,
  EyeIcon,
  MoreHorizontal,
  FileText,
  Mail,
  Phone,
} from "lucide-react";
import Link from "next/link";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Manager {
  id: number;
  name: string;
  ic: string;
  email: string | null;
  phoneNumber: string | null;
  hashcode: string;
  teamId: number;
  teamName?: string;
  createdAt: string;
}

export default function ManagersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [managerToDelete, setManagerToDelete] = useState<Manager | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch managers
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        // Add timestamp to force cache refresh and avoid stale data
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/participants/managers?_=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch managers");
        }
        
        const data = await response.json();
        console.log('Managers data received from API:', data);
        
        // Enhanced debugging information
        if (data.length > 0) {
          console.log('Sample manager fields:', Object.keys(data[0]));
          console.log('First manager data:', JSON.stringify(data[0]));
        }
        
        // Force data transformation to ensure email and phoneNumber are ALWAYS defined
        const processedData = data.map((manager: any) => {
          console.log('Processing manager:', manager.name, 'Email:', manager.email, 'Phone:', manager.phoneNumber);
          
          return {
            id: manager.id,
            name: manager.name,
            ic: manager.ic,
            // Explicitly ensure email and phoneNumber are strings, never undefined
            email: manager.email || '', 
            phoneNumber: manager.phoneNumber || '',
            hashcode: manager.hashcode,
            teamId: manager.teamId,
            teamName: manager.teamName,
            createdAt: manager.createdAt
          };
        });
        
        setManagers(processedData);
        setFilteredManagers(processedData);
      } catch (error) {
        console.error("Error fetching managers:", error);
        toast.error("Failed to load managers");
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchManagers();
    }
  }, [status]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredManagers(managers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredManagers(
        managers.filter(
          (manager) =>
            manager.name.toLowerCase().includes(query) ||
            manager.hashcode.toLowerCase().includes(query) ||
            manager.ic.includes(query) ||
            (manager.teamName && manager.teamName.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, managers]);

  // Format IC number for display (masked for privacy)
  const formatIC = (ic: string) => {
    if (ic.length === 12) {
      return `${ic.substring(0, 6)}-XX-${ic.substring(10, 12)}`;
    }
    return ic;
  };

  // Handle delete manager
  const handleDeleteManager = async () => {
    if (!managerToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/participants/managers/${managerToDelete.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete manager");
      }
      
      // Update the local state
      setManagers(managers.filter((manager) => manager.id !== managerToDelete.id));
      setFilteredManagers(filteredManagers.filter((manager) => manager.id !== managerToDelete.id));
      
      toast.success(t('manager.delete_success'));
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting manager:", error);
      toast.error(t('manager.delete_error'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === "unauthenticated") {
    router.push('/participants/auth/login');
    return null;
  }

  return (
    <div className="container px-4 py-8 mx-auto space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold">{t('manager.title')}</h1>
          <p className="text-muted-foreground">
            {t('manager.description')}
          </p>
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('manager.search')}
              className="pl-8 w-full sm:w-[260px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button asChild>
            <Link href="/participants/managers/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('manager.add')}
            </Link>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t('manager.listing')}</CardTitle>
          <CardDescription>
            {t('manager.description')}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : filteredManagers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">{t('manager.none_found')}</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                {managers.length === 0
                  ? t('manager.none_added')
                  : t('manager.no_search_results')}
              </p>
              {managers.length === 0 && (
                <Button asChild>
                  <Link href="/participants/managers/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('manager.add_first')}
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[500px] rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('manager.table.name')}</TableHead>
                    <TableHead>{t('manager.table.ic')}</TableHead>
                    <TableHead>{t('manager.table.contact')}</TableHead>
                    <TableHead>{t('manager.table.hashcode')}</TableHead>
                    <TableHead>{t('manager.table.team')}</TableHead>
                    <TableHead className="text-right">{t('manager.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredManagers.map((manager) => (
                    <TableRow key={manager.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{manager.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{formatIC(manager.ic)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {/* Simplified and robust contact info display */}
                          {(manager.email || manager.phoneNumber) ? (
                            <>
                              {manager.email && (
                                <div className="flex items-center gap-1" title={manager.email}>
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="truncate max-w-[150px]">{manager.email}</span>
                                </div>
                              )}
                              {manager.phoneNumber && (
                                <div className="flex items-center gap-1" title={manager.phoneNumber}>
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>{manager.phoneNumber}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">{t('manager.no_contact')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {manager.hashcode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {manager.teamName ? (
                          <Link 
                            href={`/participants/teams/${manager.teamId}`}
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Users className="h-3 w-3" />
                            <span>{manager.teamName}</span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm">{t('manager.not_assigned')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" asChild title={t('manager.view')}>
                            <Link href={`/participants/managers/${manager.id}`}>
                              <EyeIcon className="h-4 w-4" />
                            </Link>
                          </Button>
                          
                          <Button variant="outline" size="sm" asChild title={t('manager.edit')}>
                            <Link href={`/participants/managers/${manager.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:bg-red-100 hover:text-red-700" 
                            title={t('manager.delete')}
                            onClick={() => {
                              setManagerToDelete(manager);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('manager.delete')}</DialogTitle>
            <DialogDescription>
              {t('manager.delete_confirm', { name: managerToDelete?.name || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('manager.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteManager}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('manager.deleting')}
                </>
              ) : (
                <>{t('manager.delete')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

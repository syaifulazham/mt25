'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Plus, 
  Users, 
  Search,
  Gamepad2,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import { toast } from 'sonner';

interface ContestantData {
  id: number;
  name: string;
  ic: string;
  email: string;
  gender: string;
  age: number;
  edu_level: string;
  class_grade: string;
  class_name: string;
  contingentName: string;
  institutionName: string;
  hasMicrosite: boolean;
  micrositeId?: number;
  passcode?: string;
  loginCounter?: number;
}

export default function MicrositesClient() {
  const [contestants, setContestants] = useState<ContestantData[]>([]);
  const [filteredContestants, setFilteredContestants] = useState<ContestantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContestants, setSelectedContestants] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showPasscodes, setShowPasscodes] = useState(false);
  const { t, language } = useLanguage();

  // Fetch contestants data
  useEffect(() => {
    const fetchContestants = async () => {
      try {
        const response = await fetch('/api/participants/microsites/contestants');
        const result = await response.json();

        if (response.ok && result.success) {
          setContestants(result.contestants);
          setFilteredContestants(result.contestants);
        } else {
          toast.error(result.message || 'Failed to load contestants');
        }
      } catch (error) {
        console.error('Error fetching contestants:', error);
        toast.error('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContestants();
  }, []);

  // Filter contestants based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredContestants(contestants);
    } else {
      const filtered = contestants.filter(contestant =>
        contestant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contestant.ic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contestant.contingentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contestant.institutionName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredContestants(filtered);
    }
  }, [searchTerm, contestants]);

  // Handle individual contestant selection
  const handleContestantSelect = (contestantId: number, checked: boolean) => {
    if (checked) {
      setSelectedContestants(prev => [...prev, contestantId]);
    } else {
      setSelectedContestants(prev => prev.filter(id => id !== contestantId));
    }
  };

  // Handle select all toggle
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const availableIds = filteredContestants
        .filter(c => !c.hasMicrosite)
        .map(c => c.id);
      setSelectedContestants(availableIds);
    } else {
      setSelectedContestants([]);
    }
  };

  // Create microsite for individual contestant
  const handleCreateIndividual = async (contestantId: number) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/participants/microsites/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contestantIds: [contestantId] }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`Microsite created for contestant`);
        // Refresh the data
        window.location.reload();
      } else {
        toast.error(result.message || 'Failed to create microsite');
      }
    } catch (error) {
      console.error('Error creating microsite:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  // Create microsites for selected contestants (batch)
  const handleCreateBatch = async () => {
    if (selectedContestants.length === 0) {
      toast.error('Please select contestants first');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/participants/microsites/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contestantIds: selectedContestants }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`${result.created} microsites created successfully`);
        setSelectedContestants([]);
        // Refresh the data
        window.location.reload();
      } else {
        toast.error(result.message || 'Failed to create microsites');
      }
    } catch (error) {
      console.error('Error creating microsites:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const stats = {
    total: contestants.length,
    withMicrosite: contestants.filter(c => c.hasMicrosite).length,
    withoutMicrosite: contestants.filter(c => !c.hasMicrosite).length,
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading contestants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-primary" />
            {language === 'my' ? 'Pengurusan Laman Mikro' : 'Microsites Management'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'my' 
              ? 'Urus akses arena untuk peserta kontinjen anda' 
              : 'Manage arena access for your contingent contestants'
            }
          </p>
        </div>
        <Button 
          onClick={() => setShowPasscodes(!showPasscodes)}
          variant="outline"
          size="sm"
        >
          {showPasscodes ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showPasscodes ? 'Hide Passcodes' : 'Show Passcodes'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'my' ? 'Jumlah Peserta' : 'Total Contestants'}
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'my' ? 'Dengan Laman Mikro' : 'With Microsite'}
                </p>
                <p className="text-2xl font-bold text-green-600">{stats.withMicrosite}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'my' ? 'Tanpa Laman Mikro' : 'Without Microsite'}
                </p>
                <p className="text-2xl font-bold text-orange-600">{stats.withoutMicrosite}</p>
              </div>
              <XCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={language === 'my' ? 'Cari peserta...' : 'Search contestants...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCreateBatch}
            disabled={selectedContestants.length === 0 || isCreating}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {language === 'my' 
              ? `Cipta Berkelompok (${selectedContestants.length})` 
              : `Create Batch (${selectedContestants.length})`
            }
          </Button>
        </div>
      </div>

      {/* Contestants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{language === 'my' ? 'Senarai Peserta' : 'Contestants List'}</span>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  filteredContestants.filter(c => !c.hasMicrosite).length > 0 &&
                  selectedContestants.length === filteredContestants.filter(c => !c.hasMicrosite).length
                }
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm">
                {language === 'my' ? 'Pilih Semua' : 'Select All'}
              </Label>
            </div>
          </CardTitle>
          <CardDescription>
            {language === 'my' 
              ? 'Peserta dengan tanda hijau sudah mempunyai akses arena'
              : 'Contestants with green checkmark have arena access'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>{language === 'my' ? 'Status' : 'Status'}</TableHead>
                  <TableHead>{language === 'my' ? 'Nama' : 'Name'}</TableHead>
                  <TableHead>{language === 'my' ? 'Pendidikan' : 'Education'}</TableHead>
                  {showPasscodes && <TableHead>{language === 'my' ? 'Kod Laluan' : 'Passcode'}</TableHead>}
                  <TableHead>{language === 'my' ? 'Tindakan' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContestants.map((contestant) => (
                  <TableRow key={contestant.id}>
                    <TableCell>
                      {!contestant.hasMicrosite && (
                        <Checkbox
                          checked={selectedContestants.includes(contestant.id)}
                          onCheckedChange={(checked) => 
                            handleContestantSelect(contestant.id, checked as boolean)
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {contestant.hasMicrosite ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {language === 'my' ? 'Aktif' : 'Active'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          {language === 'my' ? 'Tiada' : 'None'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <div>{contestant.name}</div>
                        {contestant.ic && (
                          <div className="text-sm text-muted-foreground">{contestant.ic}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{contestant.edu_level}</div>
                        {contestant.class_grade && (
                          <div className="text-muted-foreground">
                            {contestant.class_grade} {contestant.class_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {showPasscodes && (
                      <TableCell>
                        {contestant.hasMicrosite && contestant.passcode ? (
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                              {contestant.passcode}
                            </code>
                            {contestant.loginCounter && contestant.loginCounter > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {contestant.loginCounter} logins
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {!contestant.hasMicrosite ? (
                        <Button
                          size="sm"
                          onClick={() => handleCreateIndividual(contestant.id)}
                          disabled={isCreating}
                          className="flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          {language === 'my' ? 'Cipta' : 'Create'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a 
                            href={`/arena/${contestant.ic}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <Gamepad2 className="w-3 h-3" />
                            {language === 'my' ? 'Arena' : 'Arena'}
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredContestants.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {language === 'my' ? 'Tiada peserta dijumpai' : 'No contestants found'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { referenceDataApi } from "@/lib/api-client";
import { ReferenceDataForm } from "./reference-data-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GeneralReferenceTab() {
  const [referenceData, setReferenceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddFormVisible, setIsAddFormVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>("all_types");
  const [statusFilter, setStatusFilter] = useState<string | null>("all_status");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  const fetchReferenceData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (typeFilter && typeFilter !== "all_types") params.type = typeFilter;
      if (statusFilter && statusFilter !== "all_status") {
        params.isActive = statusFilter === "active";
      }

      const data = await referenceDataApi.getReferenceData(params);
      setReferenceData(data);
      
      // Extract unique types for the type filter
      const types = Array.from(new Set(data.map((item: any) => item.type)));
      setAvailableTypes(types);
    } catch (err: any) {
      setError(err.message || "Failed to fetch reference data");
      toast.error("Failed to fetch reference data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferenceData();
  }, [searchQuery, typeFilter, statusFilter]);

  const handleAddItem = async (data: any) => {
    try {
      await referenceDataApi.createReferenceData(data);
      setIsAddFormVisible(false);
      toast.success("Reference data item created successfully");
      fetchReferenceData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create reference data item");
    }
  };

  const handleUpdateItem = async (data: any) => {
    try {
      await referenceDataApi.updateReferenceData(selectedItem.id.toString(), data);
      setIsEditDialogOpen(false);
      toast.success("Reference data item updated successfully");
      fetchReferenceData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update reference data item");
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (confirm("Are you sure you want to delete this reference data item?")) {
      try {
        await referenceDataApi.deleteReferenceData(id.toString());
        toast.success("Reference data item deleted successfully");
        fetchReferenceData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete reference data item");
      }
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all_types");
    setStatusFilter("all_status");
  };

  const filteredData = referenceData;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-semibold">General Reference Data</h2>
        <Button onClick={() => setIsAddFormVisible(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reference data..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                className="absolute right-0 top-0 h-9 w-9 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="w-[180px]">
          <Select
            value={typeFilter || "all_types"}
            onValueChange={(value) => setTypeFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_types">All Types</SelectItem>
              {availableTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[180px]">
          <Select
            value={statusFilter || "all_status"}
            onValueChange={(value) => setStatusFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_status">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(searchQuery || typeFilter !== "all_types" || statusFilter !== "all_status") && (
          <Button variant="outline" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Add Form Dialog */}
      {isAddFormVisible && (
        <Dialog open={isAddFormVisible} onOpenChange={setIsAddFormVisible}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Reference Data</DialogTitle>
              <DialogDescription>
                Create a new reference data item for the system.
              </DialogDescription>
            </DialogHeader>
            <ReferenceDataForm
              onSubmit={handleAddItem}
              onCancel={() => setIsAddFormVisible(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {isEditDialogOpen && selectedItem && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Reference Data</DialogTitle>
              <DialogDescription>
                Update the reference data item details.
              </DialogDescription>
            </DialogHeader>
            <ReferenceDataForm
              item={selectedItem}
              onSubmit={handleUpdateItem}
              onCancel={() => setIsEditDialogOpen(false)}
              isEdit
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Reference Data Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end space-x-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  Error: {error}
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  No reference data found
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">{item.type}</Badge>
                  </TableCell>
                  <TableCell>{item.code}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {item.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={item.isActive ? "outline" : "secondary"}
                      className={
                        item.isActive
                          ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600"
                          : "bg-gray-200 text-gray-500"
                      }
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedItem(item);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

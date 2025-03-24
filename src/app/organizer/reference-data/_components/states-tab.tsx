"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { stateApi, zoneApi } from "@/lib/api-client";
import { Loader2, Plus, Search, Pencil, Trash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function StatesTab() {
  const [states, setStates] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newStateName, setNewStateName] = useState("");
  const [newStateZone, setNewStateZone] = useState("");
  const [editState, setEditState] = useState<any | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [stateToDelete, setStateToDelete] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchZones = async () => {
    try {
      const data = await zoneApi.getZones();
      setZones(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch zones");
    }
  };

  const fetchStates = async () => {
    setIsLoading(true);
    try {
      const data = await stateApi.getStates({ search: searchTerm });
      setStates(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch states");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
    fetchStates();
  }, [searchTerm]);

  const handleAddState = async () => {
    if (!newStateName.trim()) {
      toast.error("State name is required");
      return;
    }

    if (!newStateZone) {
      toast.error("Please select a zone");
      return;
    }

    setIsSubmitting(true);
    try {
      await stateApi.createState({
        name: newStateName.trim(),
        zoneId: parseInt(newStateZone),
      });

      toast.success("State added successfully");
      setNewStateName("");
      setNewStateZone("");
      setIsAddDialogOpen(false);
      fetchStates();
    } catch (error: any) {
      toast.error(error.message || "Failed to add state");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditState = async () => {
    if (!editState || !editState.name.trim()) {
      toast.error("State name is required");
      return;
    }

    if (!editState.zoneId) {
      toast.error("Please select a zone");
      return;
    }

    setIsSubmitting(true);
    try {
      await stateApi.updateState(editState.id.toString(), {
        name: editState.name.trim(),
        zoneId: parseInt(editState.zoneId.toString()),
      });

      toast.success("State updated successfully");
      setIsEditDialogOpen(false);
      fetchStates();
    } catch (error: any) {
      toast.error(error.message || "Failed to update state");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteState = async () => {
    if (!stateToDelete) return;

    setIsSubmitting(true);
    try {
      await stateApi.deleteState(stateToDelete.toString());

      toast.success("State deleted successfully");
      setIsDeleteDialogOpen(false);
      fetchStates();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete state");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search states..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add State
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="w-full h-12" />
          ))}
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {states.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No states found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                states.map((state) => (
                  <TableRow key={state.id}>
                    <TableCell>{state.id}</TableCell>
                    <TableCell>{state.name}</TableCell>
                    <TableCell>{state.zone?.name || "Unknown"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditState({
                            ...state,
                            zoneId: state.zoneId,
                          });
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setStateToDelete(state.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add State Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New State</DialogTitle>
            <DialogDescription>
              Enter the details for the new state.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">State Name</Label>
              <Input
                id="name"
                value={newStateName}
                onChange={(e) => setNewStateName(e.target.value)}
                placeholder="Enter state name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone">Zone</Label>
              <Select value={newStateZone} onValueChange={setNewStateZone}>
                <SelectTrigger id="zone">
                  <SelectValue placeholder="Select a zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id.toString()}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddState} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add State
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit State Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit State</DialogTitle>
            <DialogDescription>
              Update the state details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">State Name</Label>
              <Input
                id="edit-name"
                value={editState?.name || ""}
                onChange={(e) =>
                  setEditState({ ...editState, name: e.target.value })
                }
                placeholder="Enter state name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-zone">Zone</Label>
              <Select 
                value={editState?.zoneId?.toString() || ""} 
                onValueChange={(value) => 
                  setEditState({ ...editState, zoneId: value })
                }
              >
                <SelectTrigger id="edit-zone">
                  <SelectValue placeholder="Select a zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id.toString()}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEditState} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete State Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete State</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this state? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteState}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

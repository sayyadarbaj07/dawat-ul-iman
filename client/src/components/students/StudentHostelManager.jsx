import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { hostelApi } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapPin, Plus, Edit, RefreshCw, LogOut, CheckCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatLocalizedDate } from "@/utils/localizationUtils";

export function StudentHostelManager({ student, studentId }) {
  const { user } = useAuth();
  const { tr, language } = useLanguage();
  
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [vacateDialogOpen, setVacateDialogOpen] = useState(false);

  const [selectedAllocation, setSelectedAllocation] = useState(null);
  
  const [formData, setFormData] = useState({
    hostelName: "",
    room: "",
    bed: "",
    warden: "",
    joiningDate: "",
    inventory: "",
    remarks: ""
  });

  const loadAllocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await hostelApi.getAllocations(studentId);
      setAllocations(res?.data || []);
    } catch (err) {
      if (err.status === 403) {
        setError(tr("hostel", "unauthorized") || "You are not authorized to view hostel information.");
      } else {
        setError(tr("hostel", "loadError") || "Unable to load hostel information.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      loadAllocations();
    }
  }, [studentId]);

  const isAdmin = user?.role === "admin";
  const isResidential = student?.residential === true;
  
  const activeAllocation = allocations.find(a => a.status === "active");
  const historicalAllocations = allocations.filter(a => a.status !== "active");

  const resetForm = () => {
    setFormData({
      hostelName: "",
      room: "",
      bed: "",
      warden: "",
      joiningDate: new Date().toISOString().split('T')[0],
      inventory: "",
      remarks: ""
    });
  };

  const openAssign = () => {
    resetForm();
    setAssignDialogOpen(true);
  };

  const openUpdate = (allocation) => {
    setSelectedAllocation(allocation);
    setFormData({
      ...formData,
      inventory: allocation.inventory ? allocation.inventory.join(", ") : "",
      remarks: allocation.remarks || ""
    });
    setUpdateDialogOpen(true);
  };

  const openTransfer = (allocation) => {
    setSelectedAllocation(allocation);
    resetForm();
    setTransferDialogOpen(true);
  };

  const openVacate = (allocation) => {
    setSelectedAllocation(allocation);
    setFormData({ ...formData, remarks: "" });
    setVacateDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!formData.hostelName || !formData.room || !formData.bed) {
      toast.error(tr("common", "error") + ": Required fields missing");
      return;
    }
    
    try {
      const payload = {
        ...formData,
        inventory: formData.inventory ? formData.inventory.split(",").map(i => i.trim()) : []
      };
      await hostelApi.assignHostel(studentId, payload);
      toast.success(tr("hostel", "assignmentSuccessful") || "Assignment successful");
      setAssignDialogOpen(false);
      loadAllocations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign hostel");
    }
  };

  const handleUpdate = async () => {
    try {
      const payload = {
        inventory: formData.inventory ? formData.inventory.split(",").map(i => i.trim()) : [],
        remarks: formData.remarks
      };
      await hostelApi.updateAllocation(selectedAllocation._id, payload);
      toast.success(tr("hostel", "updateSuccessful") || "Update successful");
      setUpdateDialogOpen(false);
      loadAllocations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update allocation");
    }
  };

  const handleTransfer = async () => {
    if (!formData.hostelName || !formData.room || !formData.bed) {
      toast.error(tr("common", "error") + ": Required fields missing");
      return;
    }
    
    try {
      const payload = {
        ...formData,
        inventory: formData.inventory ? formData.inventory.split(",").map(i => i.trim()) : []
      };
      await hostelApi.transferHostel(selectedAllocation._id, payload);
      toast.success(tr("hostel", "transferSuccessful") || "Transfer successful");
      setTransferDialogOpen(false);
      loadAllocations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to transfer hostel");
    }
  };

  const handleVacate = async () => {
    try {
      await hostelApi.vacateHostel(selectedAllocation._id, { remarks: formData.remarks });
      toast.success(tr("hostel", "vacateSuccessful") || "Vacate successful");
      setVacateDialogOpen(false);
      loadAllocations();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to vacate hostel");
    }
  };

  if (error) {
    return <EmptyState icon={MapPin} title={error} />;
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">{tr("common", "loading")}</div>;
  }

  if (!isResidential) {
    return <EmptyState icon={MapPin} title={tr("hostel", "nonResidential") || "Student is Non-Residential"} />;
  }

  const renderStatus = (status) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500 hover:bg-green-600">{tr("hostel", "active") || "Active"}</Badge>;
      case "transferred": return <Badge variant="outline" className="text-orange-500 border-orange-200">{tr("hostel", "transferred") || "Transferred"}</Badge>;
      case "left": return <Badge variant="secondary">{tr("hostel", "left") || "Left"}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const renderValue = (val) => val || "—";

  return (
    <div className="space-y-6">
      
      {!activeAllocation ? (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{tr("hostel", "noActiveAllocation") || "No active hostel allocation"}</h3>
            {isAdmin && (
              <Button onClick={openAssign} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                {tr("hostel", "assignHostel") || "Assign Hostel"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="bg-primary/5 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {tr("hostel", "hostelInformation") || "Hostel Information"}
                </CardTitle>
                <CardDescription className="mt-1">
                  {renderStatus(activeAllocation.status)}
                </CardDescription>
              </div>
              {isAdmin && (
                <div className="flex gap-2 flex-wrap justify-end">
                  <Button variant="outline" size="sm" onClick={() => openUpdate(activeAllocation)}>
                    <Edit className="h-4 w-4 mr-1" /> {tr("hostel", "updateAllocation") || "Update"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openTransfer(activeAllocation)}>
                    <RefreshCw className="h-4 w-4 mr-1" /> {tr("hostel", "transferHostel") || "Transfer"}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => openVacate(activeAllocation)}>
                    <LogOut className="h-4 w-4 mr-1" /> {tr("hostel", "vacateHostel") || "Vacate"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">{tr("hostel", "hostelName") || "Hostel Name"}</p>
              <p className="font-medium text-lg">{renderValue(activeAllocation.hostelName)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tr("hostel", "room") || "Room"}</p>
              <p className="font-medium text-lg" dir="ltr">{renderValue(activeAllocation.room)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tr("hostel", "bed") || "Bed"}</p>
              <p className="font-medium text-lg" dir="ltr">{renderValue(activeAllocation.bed)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tr("hostel", "warden") || "Warden"}</p>
              <p className="font-medium">{renderValue(activeAllocation.warden)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tr("hostel", "joiningDate") || "Joining Date"}</p>
              <p className="font-medium" dir="ltr">{activeAllocation.joiningDate ? formatLocalizedDate(activeAllocation.joiningDate, language) : "—"}</p>
            </div>
            <div className="md:col-span-3">
              <p className="text-sm text-muted-foreground">{tr("hostel", "inventory") || "Inventory"}</p>
              <p className="font-medium">{activeAllocation.inventory && activeAllocation.inventory.length > 0 ? activeAllocation.inventory.join(", ") : "—"}</p>
            </div>
            <div className="md:col-span-4">
              <p className="text-sm text-muted-foreground">{tr("hostel", "remarks") || "Remarks"}</p>
              <p className="font-medium">{renderValue(activeAllocation.remarks)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {historicalAllocations.length > 0 && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            {tr("hostel", "hostelHistory") || "Hostel History"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historicalAllocations.map(alloc => (
              <Card key={alloc._id} className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-base">{alloc.hostelName} - Room {alloc.room} (Bed {alloc.bed})</div>
                    {renderStatus(alloc.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">{tr("hostel", "joiningDate") || "Joining"}:</span>
                      <div dir="ltr">{alloc.joiningDate ? formatLocalizedDate(alloc.joiningDate, language) : "—"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{tr("hostel", "leavingDate") || "Leaving"}:</span>
                      <div dir="ltr">{alloc.leavingDate ? formatLocalizedDate(alloc.leavingDate, language) : "—"}</div>
                    </div>
                  </div>
                  {alloc.remarks && (
                    <div className="text-sm mt-2 text-muted-foreground italic border-t pt-2 border-border/50">
                      "{alloc.remarks}"
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* DIALOGS */}
      
      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("hostel", "assignHostel") || "Assign Hostel"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{tr("hostel", "hostelName") || "Hostel Name"} *</Label>
              <Input value={formData.hostelName} onChange={(e) => setFormData({...formData, hostelName: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{tr("hostel", "room") || "Room"} *</Label>
                <Input value={formData.room} onChange={(e) => setFormData({...formData, room: e.target.value})} dir="ltr" />
              </div>
              <div className="grid gap-2">
                <Label>{tr("hostel", "bed") || "Bed"} *</Label>
                <Input value={formData.bed} onChange={(e) => setFormData({...formData, bed: e.target.value})} dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{tr("hostel", "warden") || "Warden"}</Label>
                <Input value={formData.warden} onChange={(e) => setFormData({...formData, warden: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label>{tr("hostel", "joiningDate") || "Joining Date"} *</Label>
                <Input type="date" value={formData.joiningDate} onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} dir="ltr" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{tr("hostel", "inventory") || "Inventory"} (comma separated)</Label>
              <Input value={formData.inventory} onChange={(e) => setFormData({...formData, inventory: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>{tr("hostel", "remarks") || "Remarks"}</Label>
              <Input value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>{tr("common", "cancel") || "Cancel"}</Button>
            <Button onClick={handleAssign}>{tr("common", "save") || "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("hostel", "updateAllocation") || "Update Allocation"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{tr("hostel", "inventory") || "Inventory"} (comma separated)</Label>
              <Input value={formData.inventory} onChange={(e) => setFormData({...formData, inventory: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>{tr("hostel", "remarks") || "Remarks"}</Label>
              <Input value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>{tr("common", "cancel") || "Cancel"}</Button>
            <Button onClick={handleUpdate}>{tr("common", "update") || "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("hostel", "transferHostel") || "Transfer Hostel"}</DialogTitle>
            <DialogDescription className="text-orange-600">
              {tr("hostel", "transferNotice") || "The current allocation will be marked as transferred and a new active allocation will be created."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>New {tr("hostel", "hostelName") || "Hostel Name"} *</Label>
              <Input value={formData.hostelName} onChange={(e) => setFormData({...formData, hostelName: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>New {tr("hostel", "room") || "Room"} *</Label>
                <Input value={formData.room} onChange={(e) => setFormData({...formData, room: e.target.value})} dir="ltr" />
              </div>
              <div className="grid gap-2">
                <Label>New {tr("hostel", "bed") || "Bed"} *</Label>
                <Input value={formData.bed} onChange={(e) => setFormData({...formData, bed: e.target.value})} dir="ltr" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{tr("hostel", "joiningDate") || "Joining Date"} *</Label>
              <Input type="date" value={formData.joiningDate} onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} dir="ltr" />
            </div>
            <div className="grid gap-2">
              <Label>{tr("hostel", "remarks") || "Remarks"}</Label>
              <Input value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>{tr("common", "cancel") || "Cancel"}</Button>
            <Button onClick={handleTransfer}>{tr("common", "confirm") || "Confirm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vacate Dialog */}
      <Dialog open={vacateDialogOpen} onOpenChange={setVacateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("hostel", "vacateConfirmTitle") || "Vacate Hostel?"}</DialogTitle>
            <DialogDescription>
              {tr("hostel", "vacateConfirmDesc") || "The student's active hostel allocation will be marked as left. This action preserves the history."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{tr("hostel", "remarks") || "Remarks"}</Label>
              <Input value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVacateDialogOpen(false)}>{tr("common", "cancel") || "Cancel"}</Button>
            <Button variant="destructive" onClick={handleVacate}>{tr("common", "confirm") || "Confirm"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

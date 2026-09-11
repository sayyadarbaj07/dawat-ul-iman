import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { classApi } from "@/lib/api";

export function EventFormModal({ open, onOpenChange, onSubmit, formData, setFormData }) {
  const { user } = useAuth();

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await classApi.getClasses();
      return Array.isArray(res) ? res : (res.data || []);
    },
    enabled: open && (user?.role === "admin" || user?.role === "teacher")
  });

  const safeClasses = Array.isArray(classesData) ? classesData : [];
  const availableClasses = user?.role === "teacher"
    ? safeClasses.filter(c => user.assignedClassIds?.includes(c._id))
    : safeClasses;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Schedule Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Meeting Title</Label>
            <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Parent Teacher Meeting" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={formData.classId || "none"} onValueChange={v => setFormData({ ...formData, classId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select class (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Institutional (No Class)</SelectItem>
                  {availableClasses.map(c => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" required value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" required value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional agenda or details" />
          </div>

          <DialogFooter className="pt-4 border-t border-border/40">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

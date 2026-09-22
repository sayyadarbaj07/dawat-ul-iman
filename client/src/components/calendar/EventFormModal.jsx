import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { classApi } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

export function EventFormModal({ open, onOpenChange, onSubmit, formData, setFormData }) {
  const { user } = useAuth();
  const { tr } = useLanguage();

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
          <DialogTitle className="text-xl">{formData.type === "meeting" ? tr("calendar", "scheduleMeeting") : tr("calendar", "addEvent")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tr("calendar", "type") || "Entry Category"}</Label>
              <Select value={formData.entryCategory} onValueChange={v => setFormData({ ...formData, entryCategory: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">{tr("calendar", "meeting")}</SelectItem>
                  <SelectItem value="event">{tr("calendar", "event")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.entryCategory === "event" && (
              <div className="space-y-2">
                <Label>{tr("calendar", "type") || "Event Type"}</Label>
                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Event Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bazm">Bazm</SelectItem>
                    {user?.role === "admin" && <SelectItem value="holiday">{tr("calendar", "holiday")}</SelectItem>}
                    <SelectItem value="other">{tr("calendar", "other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{tr("common", "name")}</Label>
            <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Parent Teacher Meeting" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {formData.type === "holiday" ? (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" required value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{tr("common", "date")}</Label>
                  <Input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{tr("common", "class")}</Label>
                  <Select 
                    value={formData.classId || "none"} 
                    onValueChange={v => setFormData({ ...formData, classId: v === "none" ? "" : v })}
                    required={user?.role === "teacher"}
                  >
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {user?.role === "admin" && (
                        <SelectItem value="none">{tr("calendar", "institutional")}</SelectItem>
                      )}
                      {availableClasses.map(c => (
                        <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {formData.type !== "holiday" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tr("calendar", "startTime")}</Label>
                <Input type="time" required value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{tr("calendar", "endTime")}</Label>
                <Input type="time" required value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{tr("common", "description")}</Label>
            <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional agenda or details" />
          </div>

          <DialogFooter className="pt-4 border-t border-border/40">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tr("common", "cancel")}</Button>
            <Button type="submit">{formData.id ? tr("common", "update") : tr("calendar", "schedule")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

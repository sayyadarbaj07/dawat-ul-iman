import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { teacherTimetableApi, classApi } from "@/lib/api";
import { 
  Plus, Edit, Trash2, Calendar, MapPin, BookOpen, Clock, AlertCircle, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function TeacherTimetableTab({ teacher }) {
  const { tr, language } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const teacherId = teacher?._id || teacher?.id;

  const [timetable, setTimetable] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const [formData, setFormData] = useState({
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    classId: "",
    subject: "",
    room: "",
    period: "",
    remarks: ""
  });
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await teacherTimetableApi.list(teacherId);
      setTimetable(Array.isArray(res) ? res : (res.data || []));
    } catch (err) {
      setError(err.status === 403 ? "Unauthorized" : "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!isAdmin) return;
    try {
      const res = await classApi.getClasses();
      setClasses(res.data || []);
    } catch (err) {
      console.error("Failed to load classes", err);
    }
  };

  useEffect(() => {
    if (teacherId) {
      fetchTimetable();
      fetchClasses();
    }
  }, [teacherId]);

  const handleOpenForm = (entry = null) => {
    if (entry) {
      setSelectedEntry(entry);
      setFormData({
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        classId: entry.classId?._id || entry.classId,
        subject: entry.subject,
        room: entry.room || "",
        period: entry.period || "",
        remarks: entry.remarks || ""
      });
    } else {
      setSelectedEntry(null);
      setFormData({
        dayOfWeek: "Monday",
        startTime: "09:00",
        endTime: "10:00",
        classId: "",
        subject: "",
        room: "",
        period: "",
        remarks: ""
      });
    }
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dayOfWeek || !formData.startTime || !formData.endTime || !formData.classId || !formData.subject) {
      setFormError("Please fill all required fields");
      return;
    }
    if (formData.startTime >= formData.endTime) {
      setFormError("End time must be after start time");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      const payload = { ...formData, teacherId };
      if (selectedEntry) {
        await teacherTimetableApi.update(selectedEntry._id, payload);
      } else {
        await teacherTimetableApi.create(payload);
      }
      setFormOpen(false);
      fetchTimetable();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save timetable entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    try {
      setIsSubmitting(true);
      await teacherTimetableApi.delete(selectedEntry._id);
      setDeleteOpen(false);
      fetchTimetable();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center flex flex-col items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="py-8">
        <EmptyState icon={AlertCircle} title="Error" description={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{tr("teacherProfile", "timetable") || "Timetable"}</h3>
        {isAdmin && (
          <Button onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4 mr-2" />
            {tr("common", "add") || "Add Entry"}
          </Button>
        )}
      </div>

      {timetable.length === 0 ? (
        <EmptyState icon={Calendar} title={tr("teacherProfile", "noTimetable") || "No timetable entries"} description="No teaching schedule has been configured yet." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS_OF_WEEK.map(day => {
            const entries = timetable.filter(t => t.dayOfWeek === day);
            if (entries.length === 0) return null;
            return (
              <Card key={day} className="h-full border-primary/20 shadow-sm">
                <CardHeader className="py-3 px-4 bg-muted/50 border-b">
                  <CardTitle className="text-base font-semibold">{tr("days", day.toLowerCase()) || day}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {entries.map(entry => (
                      <div key={entry._id} className="p-4 hover:bg-muted/10 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded" dir="ltr">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {entry.startTime} - {entry.endTime}
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenForm(entry)}>
                                <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10" onClick={() => { setSelectedEntry(entry); setDeleteOpen(true); }}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1 mt-3">
                          <div className="font-semibold text-sm flex items-center gap-1.5" dir="auto">
                            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                            {entry.subject}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 inline-block bg-muted-foreground rounded-sm opacity-50" />
                            {entry.classId?.fullName || entry.classId?.name}
                          </div>
                          {(entry.room || entry.period) && (
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {entry.room && (
                                <span className="flex items-center gap-1" dir="auto">
                                  <MapPin className="w-3 h-3" /> {entry.room}
                                </span>
                              )}
                              {entry.period && (
                                <span className="bg-muted px-1.5 py-0.5 rounded">P: {entry.period}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedEntry ? "Edit Entry" : "Add Entry"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {formError && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Day *</Label>
                <Select value={formData.dayOfWeek} onValueChange={(val) => setFormData({...formData, dayOfWeek: val})}>
                  <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select value={formData.classId} onValueChange={(val) => setFormData({...formData, classId: val})}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c._id} value={c._id}>{c.fullName || c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} dir="auto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room (Optional)</Label>
                <Input value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} dir="auto" />
              </div>
              <div className="space-y-2">
                <Label>Period (Optional)</Label>
                <Input value={formData.period} onChange={e => setFormData({...formData, period: e.target.value})} dir="auto" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks (Optional)</Label>
              <Textarea value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} dir="auto" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Entry</DialogTitle>
            <DialogDescription>Are you sure you want to remove this timetable entry?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, Users, Plus, FileText, Trash2, Edit, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLanguage } from "@/context/LanguageContext";
import { meetingApi, classApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export default function Meetings() {
    const { tr } = useLanguage();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [meetings, setMeetings] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState(null);
    
    const initialFormData = {
      title: "",
      type: "General",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      attendees: 0,
      status: "Scheduled",
      notes: "",
      classId: "general"
    };

    const [formData, setFormData] = useState(initialFormData);

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [meetingsRes, classesRes] = await Promise.all([
            meetingApi.list(),
            classApi.getClasses()
        ]);
        setMeetings(meetingsRes.data?.data || meetingsRes.data || []);
        setClasses(classesRes.data?.data || classesRes.data || []);
      } catch (err) {
        setError(err.message || tr("meetings", "unableToLoadDesc"));
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadData();
    }, []);

    const groupedClasses = classes.reduce((acc, cls) => {
        const dept = cls.department || "Other";
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(cls);
        return acc;
    }, {});

    const handleOpenEdit = (meeting) => {
        setFormData({
            title: meeting.title || "",
            type: meeting.type || "General",
            date: meeting.date || "",
            startTime: meeting.startTime || "",
            endTime: meeting.endTime || "",
            location: meeting.location || "",
            attendees: meeting.attendees || 0,
            status: meeting.status || "Scheduled",
            notes: meeting.notes || "",
            classId: meeting.classId?._id || meeting.classId || "general"
        });
        setEditingMeeting(meeting);
        setIsAddModalOpen(true);
    };

    const handleOpenAdd = () => {
        setFormData(initialFormData);
        setEditingMeeting(null);
        setIsAddModalOpen(true);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        setIsSaving(true);
        const submitData = { ...formData };
        if (submitData.classId === "general") {
            delete submitData.classId;
        }
        
        if (editingMeeting) {
            await meetingApi.update(editingMeeting._id, submitData);
            toast({ title: tr("common", "saveChanges") || "Success", description: tr("meetings", "meetingUpdated") });
        } else {
            await meetingApi.create(submitData);
            toast({ title: tr("common", "saveChanges") || "Success", description: tr("meetings", "meetingScheduled") });
        }
        
        setIsAddModalOpen(false);
        setFormData(initialFormData);
        setEditingMeeting(null);
        loadData();
      } catch (err) {
        toast({ title: "Error", description: err.message || tr("meetings", "failedToSave"), variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    };

    const handleDelete = async (id) => {
      if (!window.confirm(tr("meetings", "deleteConfirm"))) return;
      try {
        await meetingApi.delete(id);
        toast({ title: "Success", description: tr("meetings", "meetingDeleted") });
        loadData();
      } catch (err) {
        toast({ title: "Error", description: err.message || tr("meetings", "failedToDelete"), variant: "destructive" });
      }
    };

    const canManage = user?.role === "admin" || user?.role === "teacher";

    return (
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader 
        title={tr("meetings", "pageTitle")}
        description={tr("meetings", "pageSubtitle")}
        showBack={true}
        backLabel={tr("navigation", "dashboard")}
        actions={
          canManage && (
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenAdd}>
                  <Plus className="me-2 h-4 w-4"/> {tr("meetings", "scheduleMeeting")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingMeeting ? tr("meetings", "editMeeting") : tr("meetings", "scheduleMeeting")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{tr("meetings", "title")} *</Label>
                    <Input dir="auto" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder={tr("meetings", "titlePlaceholder")} />
                  </div>

                  <div className="space-y-2">
                    <Label>{tr("meetings", "relatedClass")}</Label>
                    <Select value={formData.classId} onValueChange={v => setFormData({...formData, classId: v})}>
                      <SelectTrigger><SelectValue placeholder={tr("meetings", "generalInstitutional")}/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{tr("meetings", "generalInstitutional")}</SelectItem>
                        {Object.entries(groupedClasses).map(([dept, clsList]) => (
                            <SelectGroup key={dept}>
                                <SelectLabel className="capitalize">{dept}</SelectLabel>
                                {clsList.map(cls => (
                                    <SelectItem key={cls._id} value={cls._id}>{cls.fullName}</SelectItem>
                                ))}
                            </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{tr("meetings", "type")} *</Label>
                      <Select required value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General">{tr("meetings", "general")}</SelectItem>
                          <SelectItem value="Academic">{tr("meetings", "academic")}</SelectItem>
                          <SelectItem value="Admin">{tr("meetings", "admin")}</SelectItem>
                          <SelectItem value="Review">{tr("meetings", "review")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{tr("meetings", "status")} *</Label>
                      <Select required value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Scheduled">{tr("meetings", "scheduled")}</SelectItem>
                          <SelectItem value="Upcoming">{tr("meetings", "upcoming")}</SelectItem>
                          <SelectItem value="Completed">{tr("meetings", "completed")}</SelectItem>
                          <SelectItem value="Cancelled">{tr("meetings", "cancelled")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{tr("meetings", "date")} *</Label>
                      <Input type="date" dir="ltr" className="text-start" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>{tr("meetings", "startTime")} *</Label>
                      <Input type="time" dir="ltr" className="text-start" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>{tr("meetings", "endTime")}</Label>
                      <Input type="time" dir="ltr" className="text-start" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{tr("meetings", "locationLink")} *</Label>
                      <Input dir="auto" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder={tr("meetings", "locationPlaceholder")} />
                    </div>
                    <div className="space-y-2">
                      <Label>{tr("meetings", "expectedAttendees")} *</Label>
                      <Input type="number" dir="ltr" className="text-start" required min="0" value={formData.attendees} onChange={e => setFormData({...formData, attendees: e.target.value ? parseInt(e.target.value, 10) : ""})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{tr("meetings", "agendaNotes")}</Label>
                    <Textarea dir="auto" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder={tr("meetings", "agendaPlaceholder")} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSaving}>{tr("common", "cancel")}</Button>
                    <Button type="submit" disabled={isSaving}>{isSaving ? tr("common", "saving") || "Saving..." : (editingMeeting ? tr("meetings", "updateMeeting") : tr("meetings", "scheduleMeeting"))}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {loading ? (
          <div className="col-span-3 text-center py-10 text-muted-foreground">{tr("meetings", "loading")}</div>
        ) : error ? (
          <div className="col-span-3">
             <EmptyState 
               icon={AlertCircle}
               title={tr("meetings", "unableToLoad")}
               description={tr("meetings", "unableToLoadDesc")}
               actionLabel={tr("meetings", "retry")}
               onAction={loadData}
             />
          </div>
        ) : meetings.length === 0 ? (
          <div className="col-span-3">
            <EmptyState 
              title={tr("meetings", "noMeetings")}
              description={tr("meetings", "noMeetingsDesc")}
              icon={Users}
              actionLabel={canManage ? tr("meetings", "addMeeting") : undefined}
              onAction={canManage ? handleOpenAdd : undefined}
            />
          </div>
        ) : meetings.map((meeting) => (
          <Card key={meeting._id} className={`relative overflow-hidden ${meeting.status === 'Completed' ? 'bg-muted/30 opacity-80' : ''}`}>
            {meeting.status === 'Upcoming' && (<div className="absolute top-0 start-0 w-1 h-full bg-primary"/>)}
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm mb-2 inline-block 
                    ${meeting.type === 'Academic' ? 'bg-blue-100 text-blue-700' :
                      meeting.type === 'Admin' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'}`}>
                    {tr("meetings", meeting.type.toLowerCase()) || meeting.type}
                  </span>
                  <CardTitle className="text-lg" dir="auto">{meeting.title}</CardTitle>
                  {meeting.classId && (
                      <p className="text-xs text-muted-foreground mt-1 font-medium" dir="auto">{meeting.classId.fullName || tr("meetings", "generalInstitutional")}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full 
                  ${meeting.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    meeting.status === 'Upcoming' ? 'bg-amber-100 text-amber-700' :
                    meeting.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'}`}>
                  {tr("meetings", meeting.status.toLowerCase()) || meeting.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4 text-sm">
                <div className="flex items-center text-muted-foreground" dir="ltr">
                  <Calendar className="h-4 w-4 me-2"/> <span className="text-start flex-1">{meeting.date}</span>
                </div>
                <div className="flex items-center text-muted-foreground" dir="ltr">
                  <Clock className="h-4 w-4 me-2"/> <span className="text-start flex-1">{meeting.startTime} {meeting.endTime && `- ${meeting.endTime}`}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 me-2"/> <span dir="auto">{meeting.location}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Users className="h-4 w-4 me-2"/> <span>{tr("meetings", "attendees", { count: meeting.attendees })}</span>
                </div>
              </div>
              {meeting.notes && (
                <div className="bg-muted p-3 rounded-md text-sm border">
                  <p className="text-muted-foreground italic" dir="auto">"{meeting.notes}"</p>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                {canManage && (
                    <>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenEdit(meeting)}>
                            <Edit className="me-2 h-4 w-4"/> {tr("meetings", "editMeeting") || "Edit"}
                        </Button>
                        {user?.role === 'admin' && (
                            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(meeting._id)}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        )}
                    </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

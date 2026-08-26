import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, Users, Plus, FileText, Trash2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { meetingApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export default function Meetings() {
    const { tr } = useLanguage();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    const [formData, setFormData] = useState({
      title: "",
      type: "General",
      date: "",
      time: "",
      location: "",
      attendees: 0,
      status: "Scheduled",
      notes: ""
    });

    const loadMeetings = async () => {
      try {
        const response = await meetingApi.list();
        setMeetings(response.data || []);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load meetings", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadMeetings();
    }, []);

    const handleCreate = async (e) => {
      e.preventDefault();
      try {
        await meetingApi.create(formData);
        toast({ title: "Success", description: "Meeting created successfully" });
        setIsAddModalOpen(false);
        setFormData({
          title: "", type: "General", date: "", time: "", location: "", attendees: 0, status: "Scheduled", notes: ""
        });
        loadMeetings();
      } catch (error) {
        toast({ title: "Error", description: error.message || "Failed to create meeting", variant: "destructive" });
      }
    };

    const handleDelete = async (id) => {
      if (!window.confirm("Are you sure you want to delete this meeting?")) return;
      try {
        await meetingApi.delete(id);
        toast({ title: "Success", description: "Meeting deleted successfully" });
        loadMeetings();
      } catch (error) {
        toast({ title: "Error", description: error.message || "Failed to delete meeting", variant: "destructive" });
      }
    };

    const canManage = user?.role === "admin" || user?.role === "teacher";

    return (
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{tr("meetings", "pageTitle")}</h2>
          <p className="text-muted-foreground mt-1">{tr("meetings", "pageSubtitle")}</p>
        </div>
        
        {canManage && (
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4"/> {tr("meetings", "scheduleMeeting")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Schedule Meeting</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Academic">Academic</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Review">Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Upcoming">Upcoming</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location / Link</Label>
                    <Input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Attendees</Label>
                    <Input type="number" required min="0" value={formData.attendees} onChange={e => setFormData({...formData, attendees: e.target.value ? parseInt(e.target.value, 10) : ""})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Agenda / Notes</Label>
                  <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Schedule</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {loading ? (
          <div className="col-span-3 text-center py-10 text-muted-foreground">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <div className="col-span-3 text-center py-10 text-muted-foreground bg-white rounded-lg border">No meetings found.</div>
        ) : meetings.map((meeting) => (
          <Card key={meeting._id} className={`relative overflow-hidden ${meeting.status === 'Completed' ? 'bg-muted/30 opacity-80' : ''}`}>
            {meeting.status === 'Upcoming' && (<div className="absolute top-0 left-0 w-1 h-full bg-primary"/>)}
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm mb-2 inline-block 
                    ${meeting.type === 'Academic' ? 'bg-blue-100 text-blue-700' :
                      meeting.type === 'Admin' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'}`}>
                    {meeting.type}
                  </span>
                  <CardTitle className="text-lg">{meeting.title}</CardTitle>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full 
                  ${meeting.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    meeting.status === 'Upcoming' ? 'bg-amber-100 text-amber-700' :
                    meeting.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'}`}>
                  {meeting.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2"/> {meeting.date}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2"/> {meeting.time}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2"/> {meeting.location}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Users className="h-4 w-4 mr-2"/> {tr("meetings", "attendees", { count: meeting.attendees })}
                </div>
              </div>
              {meeting.notes && (
                <div className="bg-muted p-3 rounded-md text-sm border">
                  <p className="text-muted-foreground italic">"{meeting.notes}"</p>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="mr-2 h-4 w-4"/> View
                </Button>
                {canManage && user?.role === 'admin' && (
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(meeting._id)}>
                    <Trash2 className="h-4 w-4"/>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

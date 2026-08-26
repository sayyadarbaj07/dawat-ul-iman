import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { eventApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export default function CalendarPage() {
    const { tr } = useLanguage();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [date, setDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    const [formData, setFormData] = useState({
      title: "",
      date: "",
      type: "meeting",
      description: ""
    });

    const loadEvents = async () => {
      try {
        const response = await eventApi.list();
        setEvents(response.data || []);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load events", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadEvents();
    }, []);

    const handleCreate = async (e) => {
      e.preventDefault();
      try {
        await eventApi.create(formData);
        toast({ title: "Success", description: "Event created successfully" });
        setIsAddModalOpen(false);
        setFormData({ title: "", date: "", type: "meeting", description: "" });
        loadEvents();
      } catch (error) {
        toast({ title: "Error", description: error.message || "Failed to create event", variant: "destructive" });
      }
    };

    const handleDelete = async (id) => {
      if (!window.confirm("Delete this event?")) return;
      try {
        await eventApi.delete(id);
        toast({ title: "Success", description: "Event deleted successfully" });
        loadEvents();
      } catch (error) {
        toast({ title: "Error", description: error.message || "Failed to delete event", variant: "destructive" });
      }
    };

    const canManage = user?.role === "admin" || user?.role === "teacher";

    // Format events for display
    const formattedEvents = events.map(e => ({
      ...e,
      displayDate: new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }));

    return (
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{tr("calendar", "pageTitle")}</h2>
          <p className="text-muted-foreground mt-1">{tr("calendar", "pageSubtitle")}</p>
        </div>
        
        {canManage && (
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4"/> {tr("calendar", "addEvent")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exam">Exam</SelectItem>
                        <SelectItem value="holiday">Holiday</SelectItem>
                        <SelectItem value="bazm">Bazm</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Add Event</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Calendar View</CardTitle>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-400 inline-block"></span> Exams</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-500 inline-block"></span> Holidays</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-blue-500 inline-block"></span> Other</span>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <CalendarComponent mode="single" selected={date} onSelect={setDate} className="rounded-md border shadow p-4"/>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground">Loading events...</div>
            ) : formattedEvents.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No events found.</div>
            ) : (
              <div className="divide-y max-h-[400px] overflow-auto">
                {formattedEvents.map((event) => (
                  <div key={event._id} className="p-4 flex justify-between items-start hover:bg-muted/50 transition-colors group">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 h-3 w-3 rounded-full shrink-0 
                        ${event.type === 'exam' ? 'bg-amber-400' :
                        event.type === 'holiday' ? 'bg-green-500' : 
                        event.type === 'bazm' ? 'bg-blue-500' : 'bg-gray-500'}`}/>
                      <div>
                        <h4 className="font-semibold text-sm">{event.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{event.displayDate}</p>
                      </div>
                    </div>
                    {canManage && (
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 h-8 w-8 p-0" onClick={() => handleDelete(event._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

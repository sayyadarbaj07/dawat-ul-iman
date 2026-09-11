import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { eventApi, meetingApi } from "@/lib/api";
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";

import { normalizeEvents } from "@/components/calendar/utils";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { AgendaView } from "@/components/calendar/AgendaView";
import { EventDetailsDrawer } from "@/components/calendar/EventDetailsDrawer";
import { EventFormModal } from "@/components/calendar/EventFormModal";

export default function CalendarPage() {
  const { tr } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month"); // month, week, day, agenda
  const [filter, setFilter] = useState("all");
  
  const [rawMeetings, setRawMeetings] = useState([]);
  const [rawEvents, setRawEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    description: "",
    classId: ""
  });

  const loadData = async () => {
    try {
      const [eventsRes, meetingsRes] = await Promise.allSettled([
        eventApi.list(),
        meetingApi.list()
      ]);
      if (eventsRes.status === "fulfilled") setRawEvents(eventsRes.value.data || []);
      if (meetingsRes.status === "fulfilled") setRawMeetings(meetingsRes.value.data || []);
    } catch (error) {
      toast({ title: tr("common", "error"), description: tr("calendar", "failedToLoad"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const allEvents = useMemo(() => {
    return normalizeEvents(rawMeetings, rawEvents);
  }, [rawMeetings, rawEvents]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return allEvents;
    return allEvents.filter(e => e.type === filter);
  }, [allEvents, filter]);

  const handleNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handlePrev = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  const handleDayClick = (date) => {
    setCurrentDate(date);
    setView("day");
  };

  const handleCreateMeeting = async () => {
    try {
      await meetingApi.create({
        title: formData.title,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        description: formData.description,
        classId: formData.classId || undefined
      });
      toast({ title: tr("common", "success"), description: tr("calendar", "meetingScheduledSuccess") });
      setIsAddModalOpen(false);
      setFormData({ title: "", date: "", startTime: "09:00", endTime: "10:00", description: "", classId: "" });
      loadData();
    } catch (error) {
      toast({ title: tr("common", "error"), description: error.message || tr("calendar", "failedToSchedule"), variant: "destructive" });
    }
  };

  const handleDeleteMeeting = async (event) => {
    if (!window.confirm(tr("calendar", "deleteMeetingConfirm"))) return;
    try {
      await meetingApi.delete(event.id);
      toast({ title: tr("common", "success"), description: tr("calendar", "meetingDeletedSuccess") });
      setIsDetailsOpen(false);
      loadData();
    } catch (error) {
      toast({ title: tr("common", "error"), description: error.message || tr("calendar", "failedToDelete"), variant: "destructive" });
    }
  };

  const canManage = user?.role === "admin" || user?.role === "teacher";

  return (
    <motion.div className="flex flex-col h-[calc(100vh-140px)] gap-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader 
        title={tr("calendar", "pageTitle")}
        description={tr("calendar", "pageSubtitle")}
        showBack={true}
        backLabel={tr("navigation", "dashboard")}
        action={
          canManage && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4"/> {tr("calendar", "scheduleMeeting")}
            </Button>
          )
        }
      />

      <div className="flex flex-col flex-1 bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <CalendarHeader 
          currentDate={currentDate}
          view={view}
          setView={setView}
          onNext={handleNext}
          onPrev={handlePrev}
          onToday={handleToday}
          filter={filter}
          setFilter={setFilter}
        />

        <div className="flex-1 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 z-50 bg-card/50 backdrop-blur-sm flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {view === "month" && <MonthView currentDate={currentDate} events={filteredEvents} onEventClick={handleEventClick} onDayClick={handleDayClick} />}
          {view === "week" && <WeekView currentDate={currentDate} events={filteredEvents} onEventClick={handleEventClick} onDayClick={handleDayClick} />}
          {view === "day" && <DayView currentDate={currentDate} events={filteredEvents} onEventClick={handleEventClick} />}
          {view === "agenda" && <AgendaView events={filteredEvents} onEventClick={handleEventClick} />}
        </div>
      </div>

      <EventDetailsDrawer 
        event={selectedEvent} 
        open={isDetailsOpen} 
        onOpenChange={setIsDetailsOpen} 
        canManage={canManage}
        onDelete={handleDeleteMeeting}
      />

      <EventFormModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        onSubmit={handleCreateMeeting} 
        formData={formData} 
        setFormData={setFormData} 
      />
    </motion.div>
  );
}

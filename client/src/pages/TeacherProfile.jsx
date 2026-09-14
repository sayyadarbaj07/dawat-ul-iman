import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/BackButton";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/lib/api";
import { TeacherDutiesTab } from "@/components/teacher/TeacherDutiesTab";
import { TeacherQualificationTab } from "@/components/teacher/TeacherQualificationTab";
import { TeacherTeachingTab } from "@/components/teacher/TeacherTeachingTab";
import { TeacherAttendanceTab } from "@/components/teacher/TeacherAttendanceTab";
import { TeacherSalaryTab } from "@/components/teacher/TeacherSalaryTab";
import { TeacherOverviewTab } from "@/components/teacher/TeacherOverviewTab";
import { TeacherPersonalInfoTab } from "@/components/teacher/TeacherPersonalInfoTab";
import { TeacherTimetableTab } from "@/components/teacher/TeacherTimetableTab";
import { TeacherDocumentsTab } from "@/components/teacher/TeacherDocumentsTab";
import { TeacherTimelineTab } from "@/components/teacher/TeacherTimelineTab";
import { FileText, Phone, Mail, Calendar, BookOpen } from "lucide-react";
export default function TeacherProfile() {
  const { teacherId } = useParams();
  const [, setLocation] = useLocation();
  const { tr, language } = useLanguage();
  const { user } = useAuth();
  
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        setLoading(true);
        // Assuming teacherApi has getById or list. Let's use getById or fallback to filtering list
        try {
          const res = await teacherApi.getById(teacherId);
          setTeacher(res.data);
        } catch (apiError) {
          // If getById doesn't exist or fails, try list
          const resList = await teacherApi.list();
          const found = resList.data?.find(t => t._id === teacherId || t.id === teacherId);
          if (!found) throw new Error("Teacher not found");
          setTeacher(found);
        }
      } catch (err) {
        console.error(err);
        setError(err?.response?.status === 403 ? "Forbidden" : "Not Found");
      } finally {
        setLoading(false);
      }
    };
    if (teacherId) fetchTeacher();
  }, [teacherId]);

  if (loading) {
    return <div className="p-8 text-center">{tr("common", "loading") || "Loading..."}</div>;
  }

  if (error || !teacher) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-semibold text-red-600">
          {error === "Forbidden" ? "403 - Not Authorized" : "404 - Teacher Not Found"}
        </h2>
        <Button onClick={() => setLocation("/teachers")}>Back to Directory</Button>
      </div>
    );
  }

  const renderPlaceholder = () => (
    <Card className="mt-6 border-dashed bg-muted/20">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <BookOpen className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{tr("teacherProfile", "placeholderText")}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Development for this tab is scheduled for a future phase. Please check back later.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <PageHeader 
        title={teacher.name}
        description={tr("teachers", "pageSubtitle") || "Teacher Profile"}
        showBack={true}
      />

      {/* HEADER CARD */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20 overflow-hidden">
        <div className="h-24 bg-primary/10 w-full" />
        <CardContent className="pt-0 relative px-6 pb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-12 relative z-10">
            {teacher.photo ? (
              <img src={`http://localhost:5000${teacher.photo}`} alt={teacher.name} className="h-24 w-24 rounded-xl border-4 border-background object-cover shadow-sm bg-background" />
            ) : (
              <div className="h-24 w-24 rounded-xl border-4 border-background shadow-sm bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                {teacher.name?.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div className="flex-1 space-y-1 mt-4 md:mt-0 pb-1">
              <h1 className="text-2xl font-bold">{teacher.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 font-mono bg-muted px-2 py-0.5 rounded-md">
                  ID: {(teacher._id || teacher.id).slice(-6).toUpperCase()}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {teacher.subject}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span dir="ltr">{teacher.mobile}</span>
                </span>
                {teacher.joiningDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined: <span dir="ltr">{new Date(teacher.joiningDate).toLocaleDateString()}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABS */}
      <Tabs defaultValue="overview" className="w-full" dir={language === "ur" ? "rtl" : "ltr"}>
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max sm:w-full justify-start h-auto flex-wrap">
            <TabsTrigger value="overview">{tr("teacherProfile", "overview")}</TabsTrigger>
            <TabsTrigger value="personal">{tr("teacherProfile", "personalInfo")}</TabsTrigger>
            <TabsTrigger value="qualification">{tr("teacherProfile", "qualification")}</TabsTrigger>
            <TabsTrigger value="teaching">{tr("teacherProfile", "teaching")}</TabsTrigger>
            <TabsTrigger value="timetable">{tr("teacherProfile", "timetable")}</TabsTrigger>
            <TabsTrigger value="attendance">{tr("teacherProfile", "attendance")}</TabsTrigger>
            <TabsTrigger value="salary">{tr("teacherProfile", "salary")}</TabsTrigger>
            <TabsTrigger value="duties">{tr("teacherProfile", "duties")}</TabsTrigger>
            <TabsTrigger value="documents">{tr("teacherProfile", "documents")}</TabsTrigger>
            <TabsTrigger value="timeline">{tr("teacherProfile", "timeline")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          <TeacherOverviewTab teacher={teacher} />
        </TabsContent>
        <TabsContent value="personal" className="mt-6">
          <TeacherPersonalInfoTab teacher={teacher} />
        </TabsContent>
        <TabsContent value="qualification" className="mt-6">
          <TeacherQualificationTab teacher={teacher} onTeacherUpdated={setTeacher} />
        </TabsContent>
        <TabsContent value="teaching" className="mt-6">
          <TeacherTeachingTab teacher={teacher} onTeacherUpdated={setTeacher} />
        </TabsContent>
        <TabsContent value="timetable" className="mt-6">
          <TeacherTimetableTab teacher={teacher} />
        </TabsContent>
        <TabsContent value="attendance" className="mt-6">
          <TeacherAttendanceTab teacher={teacher} />
        </TabsContent>
        <TabsContent value="salary" className="mt-6">
          <TeacherSalaryTab teacher={teacher} />
        </TabsContent>
        <TabsContent value="duties" className="mt-6">
          <TeacherDutiesTab teacherId={teacher._id || teacher.id} />
        </TabsContent>
        
        <TabsContent value="documents" className="mt-6">
          <TeacherDocumentsTab teacherId={teacher._id || teacher.id} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-6">
          <TeacherTimelineTab teacherId={teacher._id || teacher.id} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

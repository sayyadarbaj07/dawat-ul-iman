import React, { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { studentApi, attendanceApi, classApi } from "@/lib/api";
import { CalendarIcon, Search, ArrowLeft, AlertCircle, Users } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { 
  formatLocalizedNumber, 
  formatLocalizedPercent, 
  getLocalizedStudentName,
  formatLocalizedDate
} from "@/utils/localizationUtils";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ClassAttendanceDetail() {
  const [match, params] = useRoute("/class-attendance/:classId");
  const [, setLocation] = useLocation();
  const classId = params?.classId;
  
  const { tr, language } = useLanguage();
  
  // Extract date from query params if available, else default to today
  const getInitialDate = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const queryDate = searchParams.get('date');
    if (queryDate && !isNaN(new Date(queryDate).getTime())) {
      return queryDate;
    }
    return new Date().toISOString().split("T")[0];
  };

  const [date, setDate] = useState(getInitialDate());
  const [searchTerm, setSearchTerm] = useState("");
  
  const [classDetails, setClassDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (classId) {
      loadData();
    }
  }, [classId, date]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [classRes, studentRes, attendanceRes] = await Promise.allSettled([
        classApi.getClassById(classId),
        studentApi.list({ classId, limit: 1000 }), // Pass classId if API supports, otherwise filter locally
        attendanceApi.getByDate(date, "Student")
      ]);
      
      if (classRes.status === "fulfilled") {
        setClassDetails(classRes.value?.data?.data || classRes.value?.data);
      } else {
        throw new Error("Class not found or access denied.");
      }
      
      let classStudents = [];
      if (studentRes.status === "fulfilled") {
        const studentData = studentRes.value?.data?.data || studentRes.value?.data || [];
        // Strictly filter by canonical classId, fallback to className only if legacy is strictly needed
        // Assuming backend RBAC already secures the list, but double check frontend filter:
        classStudents = studentData.filter(s => 
          s.status !== "inactive" && 
          ((s.classId === classId) || 
           (!s.classId && classDetails && (s.className === classDetails.fullName || s.className === classDetails.name)))
        );
        setStudents(classStudents);
      }
      
      if (attendanceRes.status === "fulfilled") {
        const allAttendance = attendanceRes.value?.data?.data || attendanceRes.value?.data || [];
        const classAttendance = allAttendance.filter(a => 
          (a.classId === classId) || 
          (!a.classId && classDetails && (a.className === classDetails.fullName || a.className === classDetails.name))
        );
        setAttendance(classAttendance);
      }
      
    } catch (err) {
      console.error("Failed to load class details", err);
      setError(err.message || "Failed to load class details");
    } finally {
      setLoading(false);
    }
  };

  const getStudentStatus = (studentId) => {
    const record = attendance.find(a => String(a.userId) === String(studentId));
    if (!record) return "Not Marked";
    
    // Map backend statuses properly
    if (["Present", "Late"].includes(record.status)) return "Present";
    if (["Absent"].includes(record.status)) return "Absent";
    // If it's something else like "Leave", we might group it, but standard is mapped to Absent/Not Marked based on rules.
    // For simplicity with requirements:
    return record.status; 
  };

  const getSummary = () => {
    let present = 0;
    let absent = 0;
    
    students.forEach(student => {
      const status = getStudentStatus(student._id);
      if (status === "Present" || status === "Late") present++;
      else if (status === "Absent") absent++;
    });
    
    const totalStudents = students.length;
    const notMarked = Math.max(totalStudents - present - absent, 0);
    const percent = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0;
    
    return { totalStudents, present, absent, notMarked, percent };
  };

  const summary = getSummary();
  
  const filteredStudents = students.filter(s => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const nameEn = (s.fullName || s.name || "").toLowerCase();
    const nameUr = (s.nameUrdu || "").toLowerCase();
    const admNo = (s.admissionNumber || "").toLowerCase();
    return nameEn.includes(q) || nameUr.includes(q) || admNo.includes(q);
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case "Present":
      case "Late":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50">{tr("attendance", "present") || "Present"}</span>;
      case "Absent":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/50">{tr("attendance", "absent") || "Absent"}</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/50">{tr("attendance", "notMarked") || "Not Marked"}</span>;
    }
  };

  const handleBack = () => {
    setLocation(`/class-attendance`);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">{tr("common", "error") || "Error"}</h2>
        <p className="text-muted-foreground">{error}</p>
        <div className="flex gap-4 mt-4">
          <Button variant="outline" onClick={handleBack}>
            {tr("common", "back") || "Back"}
          </Button>
          <Button onClick={loadData}>
            {tr("common", "retry") || "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" onClick={handleBack} className="gap-2">
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {tr("classAttendance", "backToClasses") || "Back to Classes"}
        </Button>
      </div>

      <PageHeader 
        title={classDetails ? (classDetails.fullName || classDetails.name) : (tr("common", "loading") || "Loading...")}
        description={classDetails ? classDetails.department : ""}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 text-center">{tr("attendance", "totalStudents") || "Total Students"}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatLocalizedNumber(summary.totalStudents, language)}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-1 text-center">{tr("attendance", "present") || "Present"}</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatLocalizedNumber(summary.present, language)}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-500 mb-1 text-center">{tr("attendance", "absent") || "Absent"}</p>
          <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{formatLocalizedNumber(summary.absent, language)}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-1 text-center">{tr("attendance", "notMarked") || "Not Marked"}</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{formatLocalizedNumber(summary.notMarked, language)}</p>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center bg-primary/5 border-primary/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1 text-center">{tr("attendance", "attendancePercent") || "Attendance %"}</p>
          <p className="text-2xl font-bold text-primary">{formatLocalizedPercent(summary.percent, language)}</p>
        </Card>
      </div>

      <Card>
        <div className="p-4 flex flex-col sm:flex-row justify-between items-center border-b bg-gray-50/50 gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={tr("common", "searchPlaceholder") || "Search students..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-9 bg-white"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 shadow-sm w-full sm:w-auto">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 w-[130px] text-sm font-medium"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-b-border/60">
                <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("students", "admissionNumber") || "Adm No"}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("students", "studentName") || "Student Name"}</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("common", "status") || "Status"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center">
                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
                      {tr("common", "loading") || "Loading..."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="p-0">
                    <EmptyState 
                      title={tr("common", "noData") || "No students found"}
                      description={searchTerm ? "Try adjusting your search." : "No students are enrolled in this class."}
                      icon={Users}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => {
                  const status = getStudentStatus(student._id);
                  return (
                    <TableRow key={student._id} className="hover:bg-muted/40 transition-colors duration-200">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {toEnglishDigits ? toEnglishDigits(student.admissionNumber) : student.admissionNumber || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm" dir="auto">
                          {getLocalizedStudentName(student, language)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {getStatusBadge(status)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </motion.div>
  );
}

// Temporary fallback in case toEnglishDigits is not exported
const toEnglishDigits = (val) => {
  if (!val) return val;
  const urduDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const englishDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return String(val).replace(/[۰-۹]/g, (d) => englishDigits[urduDigits.indexOf(d)]);
};

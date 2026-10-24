import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/BackButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";
import { getLocalizedStudentName, formatLocalizedPercent, formatLocalizedNumber } from "@/utils/localizationUtils";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  FileSpreadsheet, 
  BookOpen, 
  Landmark, 
  CalendarCheck,
  TrendingDown,
  GraduationCap,
  Award,
  Wallet,
  Receipt,
  HeartHandshake,
  ChevronLeft
} from "lucide-react";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { reportApi } from "@/lib/api/report";
import { pdfApi } from "@/lib/api/pdf";
import { teacherApi, classApi, attendanceApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";



export default function Reports() {
  const { tr, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();

  const REPORT_CATEGORIES = [
    { id: "students", label: tr("reports", "catStudents"), icon: Users },
    { id: "results", label: tr("reports", "catResults"), icon: Award },
    { id: "attendance", label: tr("reports", "catAttendance"), icon: CalendarCheck },
    { id: "finance", label: tr("reports", "catFinance"), icon: Landmark },
  ].filter(cat => {
    if (user?.role === "accountant") return cat.id === "finance";
    if (user?.role === "teacher") return cat.id !== "finance";
    return true;
  });

  const ALL_REPORTS = [
    // Student Reports
    { id: "student_marksheet", category: "students", title: tr("reports", "studentMarksheet"), desc: tr("reports", "studentMarksheetDesc"), icon: FileSpreadsheet, config: { showClass: true, showStudent: true, showExamType: true } },
    { id: "student_list", category: "students", title: tr("reports", "studentListReport"), desc: tr("reports", "studentListReportDesc"), icon: Users, config: { showClass: true } },
    { id: "weak_students", category: "students", title: tr("reports", "weakStudentsReport"), desc: tr("reports", "weakStudentsReportDesc"), icon: TrendingDown, config: { showClass: true } },
    { id: "student_attendance", categories: ["attendance", "students"], category: "attendance", title: tr("reports", "studentAttendanceReport"), desc: tr("reports", "studentAttendanceReportDesc"), icon: CalendarCheck, config: { showClass: true, showStudent: true, showDateRange: true } },
    // Result Reports
    { id: "class_result", category: "results", title: tr("reports", "classResult"), desc: tr("reports", "classResultDesc"), icon: Users, config: { showClass: true, showExamType: true } },
    { id: "class_marksheets", category: "results", title: "Class Marksheets", desc: "Generate marksheets for all students in a class", icon: BookOpen, config: { showClass: true, showExamType: true } },
    { id: "yearly_result", category: "results", title: "Yearly Result", desc: "Generate yearly result for a specific student", icon: Award, config: { showClass: true, showStudent: true } },
    { id: "academic_history", category: "results", title: "Academic History", desc: "Generate academic history for a specific student", icon: BookOpen, config: { showClass: true, showStudent: true } },
    // Attendance Reports
    { id: "class_attendance", categories: ["attendance"], category: "attendance", title: tr("reports", "dailyAttendance"), desc: tr("reports", "dailyAttendanceDesc"), icon: CalendarCheck, config: { showClass: true, showStudent: true, showDateRange: true, studentOptional: true } },
    // Finance Reports
    { id: "finance_summary", category: "finance", title: tr("reports", "dailyFinance"), desc: tr("reports", "dailyFinanceDesc"), icon: Wallet, config: { showDateRange: true } },
    { id: "income_report", category: "finance", title: tr("reports", "incomeReport"), desc: tr("reports", "incomeReportDesc"), icon: TrendingDown, config: { showDateRange: true, showCategory: true } },
    { id: "expense_report", category: "finance", title: tr("reports", "expenseReport"), desc: tr("reports", "expenseReportDesc"), icon: Receipt, config: { showDateRange: true, showCategory: true } },
    { id: "donor_report", category: "finance", title: tr("reports", "donorReport"), desc: tr("reports", "donorReportDesc"), icon: HeartHandshake, config: { showDateRange: true } },
  ];

  
  const [activeTab, setActiveTab] = useState(user?.role === "accountant" ? "finance" : "students");
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [filters, setFilters] = useState({
      class: "all",
      examType: "monthly",
      startDate: "",
      endDate: "",
  });

  const [assignedClasses, setAssignedClasses] = useState([]);

  const fetchClasses = async () => {
    let ALL_DYNAMIC_CLASSES = [{ id: "all", name: tr("reports", "allClasses") }];
    let classData = [];
    try {
      const res = await classApi.getClasses();
      if (res.success && res.data) {
        classData = res.data.filter(c => c.status === "active");
        ALL_DYNAMIC_CLASSES = [
          { id: "all", name: tr("reports", "allClasses") },
          ...classData.map(c => ({ id: c._id, name: c.fullName }))
        ];
      }
    } catch(e) {
      console.error(e);
    }

    if (user?.role === "teacher") {
        teacherApi.getMe().then(res => {
            const me = res.data;
            if (me) {
                const myClassIds = me.assignedClassIds || [];
                
                const teacherClasses = classData
                   .filter(c => myClassIds.includes(c._id))
                   .map(c => ({ id: c._id, name: c.fullName }));

                if (teacherClasses.length > 0) {
                    setAssignedClasses(teacherClasses);
                    setFilters(prev => ({ ...prev, class: teacherClasses[0].id }));
                } else {
                    setAssignedClasses([]);
                }
            } else {
                setAssignedClasses([]);
            }
        }).catch(err => {
            console.error(err);
            setAssignedClasses([]);
        });
    } else {
        setAssignedClasses(ALL_DYNAMIC_CLASSES);
        setFilters(prev => ({ ...prev, class: "all" }));
    }
  };

  React.useEffect(() => {
    fetchClasses();
  }, [user]);

  /** Builds a clean human-readable subtitle for the on-screen report layout header. */
  const buildSubtitle = (report, f) => {
    const parts = [];
    const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (reportData?.student) {
      const studentName = getLocalizedStudentName(reportData.student, language);
      parts.push(`Student: ${studentName}${reportData.student.rollNumber ? ` (Roll: ${reportData.student.rollNumber})` : ""}`);
    }
    if (report.config.showClass && f.class) {
      const clsObj = assignedClasses.find(c => c.id === f.class);
      const clsName = clsObj ? clsObj.name : f.class;
      parts.push(`Class: ${clsName === "All Classes" ? "All" : clsName}`);
    }
    if (report.config.showExamType && f.examType)
      parts.push(`Exam: ${f.examType.charAt(0).toUpperCase() + f.examType.slice(1)}`);
    if (report.config.showMonth && f.month)
      parts.push(`Month: ${MONTH_NAMES[(parseInt(f.month, 10) - 1) % 12]}`);
    if (report.config.showYear && f.year)
      parts.push(`Year: ${f.year}`);
    if (report.config.showDateRange && f.startDate && f.endDate)
      parts.push(`${f.startDate} – ${f.endDate}`);
    return parts.length ? parts.join("  |  ") : "No filters applied";
  };

  const downloadPdf = async (url, filename) => {
      try {
          setIsLoading(true);
          const token = localStorage.getItem("dawat_token");
          const response = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              throw new Error(errData.message || "Failed to generate PDF");
          }
          const blob = await response.blob();
          const objectUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
          toast({ title: tr("common", "success"), description: tr("reports", "download") });
      } catch (error) {
          toast({ title: tr("common", "error"), description: error.message, variant: "destructive" });
      } finally {
          setIsLoading(false);
      }
  };

  const handleGenerate = async () => {
      if (selectedReport?.id === "weak_students") {
          setIsLoading(true);
          try {
              const res = await reportApi.getWeakStudents(filters);
              setReportData(res.data);
              toast({ title: tr("common", "success"), description: tr("reports", "generate") });
          } catch (error) {
              toast({ title: tr("common", "error"), description: tr("reports", "failed"), variant: "destructive" });
          } finally {
              setIsLoading(false);
          }
      } else if (
          selectedReport?.id === "student_attendance" || 
          (selectedReport?.id === "class_attendance" && filters.studentId && filters.studentId !== "all")
      ) {
          if (!filters.studentId || filters.studentId === "all") {
              toast({ title: "Missing Student", description: "Please select a Student to view attendance.", variant: "destructive" });
              return;
          }
          setIsLoading(true);
          try {
              const res = await attendanceApi.getStudentSummary(filters.studentId, {
                  startDate: filters.startDate,
                  endDate: filters.endDate,
                  month: filters.month,
                  year: filters.year
              });
              setReportData(res.data);
              toast({ title: tr("common", "success"), description: tr("reports", "generate") });
          } catch (error) {
              toast({ title: tr("common", "error"), description: error.message || "Failed to load student attendance", variant: "destructive" });
          } finally {
              setIsLoading(false);
          }
      } else {
          // For whole class attendance or other reports without screen preview, trigger export
          handleExport();
      }
  };

  const handleExport = (typeOrLang = 'pdf', maybeLang) => {
      let type = 'pdf';
      let exportLang = language || 'en';

      if (typeOrLang === 'en' || typeOrLang === 'ur') {
          exportLang = typeOrLang;
          type = 'pdf';
      } else {
          type = typeOrLang || 'pdf';
          exportLang = maybeLang || language || 'en';
      }

      if (type === 'excel') {
          toast({ title: "Notice", description: "Excel export not supported." });
          return;
      }

      const { class: classId, studentId, examId, examType, startDate, endDate, month, year, status, category } = filters;
      const txType = filters.type;

      // Validation for student reports
      if (selectedReport?.config?.showStudent && !selectedReport?.config?.studentOptional && (!studentId || studentId === "all")) {
          toast({ title: "Missing Filter", description: "Please select a Student.", variant: "destructive" });
          return;
      }

      // Validation for exam reports
      if (selectedReport?.config?.showExamType && !examType && !examId) {
          toast({ title: "Missing Filter", description: "Please select an Exam Type or Exam.", variant: "destructive" });
          return;
      }

      // PDF Exports Mapping
      if (selectedReport?.id === "weak_students") {
          downloadPdf(pdfApi.getWeakStudentsReport({ ...filters, language: exportLang }), `Weak_Students_Report_${exportLang}.pdf`);
      } 
      else if (selectedReport?.id === "student_marksheet") {
          downloadPdf(pdfApi.getStudentReportCard(studentId, examId || examType, exportLang), `Marksheet_${studentId}_${exportLang}.pdf`);
      }
      else if (selectedReport?.id === "yearly_result") {
          downloadPdf(pdfApi.getYearlyResult(studentId, exportLang, filters.academicYear || filters.year), `Yearly_Result_${studentId}_${exportLang}.pdf`);
      }
      else if (selectedReport?.id === "academic_history") {
          downloadPdf(pdfApi.getAcademicHistory(studentId, exportLang), `Academic_History_${studentId}_${exportLang}.pdf`);
      }
      else if (selectedReport?.id === "class_result") {
          downloadPdf(pdfApi.getClassResult(classId, examId, examType, exportLang), `Class_Result_${classId}_${exportLang}.pdf`);
      }
      else if (selectedReport?.id === "class_marksheets") {
          downloadPdf(pdfApi.getClassMarksheets(classId, examId, examType, exportLang), `Class_Marksheets_${classId}_${exportLang}.pdf`);
      }
      else if (selectedReport?.id === "student_attendance") {
          downloadPdf(pdfApi.getStudentAttendanceReport(studentId, { ...filters, language: exportLang }), `Student_Attendance_${studentId}_${exportLang}.pdf`);
      } 
      else if (selectedReport?.id === "class_attendance") {
          if (studentId && studentId !== "all") {
              downloadPdf(pdfApi.getStudentAttendanceReport(studentId, { ...filters, language: exportLang }), `Student_Attendance_${studentId}_${exportLang}.pdf`);
          } else {
              downloadPdf(pdfApi.getClassAttendanceReport({ classId, startDate, endDate, language: exportLang }), `Class_Attendance_${exportLang}.pdf`);
          }
      }
      else if (selectedReport?.category === "finance") {
          // Build finance params explicitly — never serialize undefined/null as query strings
          const financeParams = { language: exportLang };
          if (startDate) financeParams.startDate = startDate;
          if (endDate) financeParams.endDate = endDate;

          // Determine type: some reports force a specific type
          let finalType = txType; // may be undefined if showType not in config
          if (selectedReport.id === "income_report") finalType = "income";
          if (selectedReport.id === "expense_report") finalType = "expense";
          // Only add type if it is a real valid value
          if (finalType && finalType !== "undefined" && finalType !== "null" && finalType !== "all") {
              financeParams.type = finalType;
          }

          // Determine category
          let finalCategory = category;
          if (selectedReport.id === "donor_report") finalCategory = "Atiya";
          // Only add category if it is a real valid value
          if (finalCategory && finalCategory !== "undefined" && finalCategory !== "null" && finalCategory !== "all") {
              financeParams.category = finalCategory;
          }

          downloadPdf(pdfApi.getFinanceSummary(financeParams), `Finance_${selectedReport.id}_${exportLang}.pdf`);
      } 
      else if (selectedReport?.id === "student_list") {
          downloadPdf(pdfApi.getStudentListReport(classId, exportLang), `Student_List_${classId || "All"}_${exportLang}.pdf`);
      }
      else {
          window.print();
      }
  };

  const handlePrint = () => {
      handleExport();
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(language === "ur" ? "ur-PK" : "en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const formatDayName = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(language === "ur" ? "ur-PK" : "en-US", { weekday: "short" });
    } catch {
      return "—";
    }
  };

  const getStatusBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "present":
        return <Badge variant="soft-success">{language === "ur" ? "حاضر (Present)" : "Present"}</Badge>;
      case "absent":
        return <Badge variant="soft-danger">{language === "ur" ? "غیر حاضر (Absent)" : "Absent"}</Badge>;
      case "late":
        return <Badge variant="soft-warning">{language === "ur" ? "تاخیر (Late)" : "Late"}</Badge>;
      case "leave":
        return <Badge variant="soft-info">{language === "ur" ? "رخصت (Leave)" : "Leave"}</Badge>;
      default:
        return <Badge variant="outline">{status || "—"}</Badge>;
    }
  };

  const renderReportMenu = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            {REPORT_CATEGORIES.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id} className="flex gap-2">
                    <cat.icon className="w-4 h-4 hidden sm:block" />
                    {cat.label}
                </TabsTrigger>
            ))}
        </TabsList>
        
        {REPORT_CATEGORIES.map(category => (
            <TabsContent key={category.id} value={category.id}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ALL_REPORTS.filter(r => r.category === category.id || (Array.isArray(r.categories) && r.categories.includes(category.id))).map(report => (
                        <Card 
                            key={report.id} 
                            className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group"
                            onClick={() => { setSelectedReport(report); setReportData(null); }}
                        >
                            <CardHeader className="p-4 flex flex-row items-start gap-4 space-y-0">
                                <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                    <report.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">{report.title}</CardTitle>
                                    <CardDescription className="mt-1 line-clamp-2 text-xs">
                                        {report.desc}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </TabsContent>
        ))}
    </Tabs>
  );

  const renderSelectedReport = () => (
      <div className="space-y-4">
          <BackButton 
            className="mb-2 print-hidden pl-0" 
            onClick={() => { setSelectedReport(null); setReportData(null); }}
            label="Back to Report Center"
          />
          
          <div className="print-hidden">
              <h2 className="text-2xl font-bold tracking-tight">{selectedReport.title}</h2>
              <p className="text-muted-foreground">{selectedReport.desc}</p>
          </div>

          <ReportFilters 
              config={selectedReport.config}
              filters={filters}
              setFilters={setFilters}
              onGenerate={handleGenerate}
              onPrint={handlePrint}
              onExport={handleExport}
              availableClasses={assignedClasses}
              loading={isLoading}
              generateLabel="Generate Report"
          />

          <ReportLayout 
              title={selectedReport.title} 
              subtitle={buildSubtitle(selectedReport, filters)}
              showSignatures={selectedReport.id.includes("marksheet") || selectedReport.id.includes("result")}
          >
              {isLoading ? (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
                      <p>Loading report data...</p>
                  </div>
              ) : selectedReport.id === "weak_students" && reportData ? (
                  <div className="overflow-x-auto rounded-md border border-border/50">
                      <Table className="min-w-[800px]">
                          <TableHeader className="bg-muted/40">
                              <TableRow className="hover:bg-transparent border-b-border/60">
                                  <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sr. No</TableHead>
                                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</TableHead>
                                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class</TableHead>
                                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg %</TableHead>
                                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attendance</TableHead>
                                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Failed Subjects</TableHead>
                                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {reportData.map((student, idx) => (
                                  <TableRow key={student._id} className="hover:bg-muted/40 transition-colors duration-200">
                                      <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                                      <TableCell className="font-semibold text-sm">{getLocalizedStudentName(student, language)}</TableCell>
                                      <TableCell className="capitalize text-sm">{student.className}</TableCell>
                                      <TableCell className="font-bold text-red-600 text-sm">{formatLocalizedPercent(student.averageMarks, language)}</TableCell>
                                      <TableCell className="font-bold text-amber-600 text-sm">{formatLocalizedPercent(student.attendancePercent, language)}</TableCell>
                                      <TableCell className="text-sm">{formatLocalizedNumber(student.failedSubjectsCount, language)}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{student.reasons.join(", ")}</TableCell>
                                  </TableRow>
                              ))}
                              {reportData.length === 0 && (
                                  <TableRow>
                                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                          No weak students found for the selected criteria.
                                      </TableCell>
                                  </TableRow>
                              )}
                          </TableBody>
                      </Table>
                  </div>
              ) : (selectedReport.id === "student_attendance" || selectedReport.id === "class_attendance") && reportData?.summary ? (
                  <div className="space-y-6">
                      {reportData.student && (
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
                              <div>
                                  <h3 className="text-lg font-bold text-foreground">
                                      {getLocalizedStudentName(reportData.student, language)}
                                  </h3>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                      {reportData.student.rollNumber ? `Roll No: ${reportData.student.rollNumber}  |  ` : ""}
                                      Class: {reportData.student.className || filters.class || "—"}
                                  </p>
                              </div>
                              {reportData.periodLabel && (
                                  <Badge variant="outline" className="text-xs font-medium">
                                      {reportData.periodLabel}
                                  </Badge>
                              )}
                          </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                          <Card className="p-3 text-center border-border/60 bg-muted/20">
                              <p className="text-xs text-muted-foreground uppercase font-medium">Total Days</p>
                              <p className="text-2xl font-bold mt-1">{formatLocalizedNumber(reportData.totalWorkingDays ?? reportData.summary.total ?? 0, language)}</p>
                          </Card>
                          <Card className="p-3 text-center border-green-200 bg-green-50/40 dark:bg-green-950/20">
                              <p className="text-xs text-green-700 dark:text-green-400 uppercase font-medium">Present</p>
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatLocalizedNumber(reportData.summary.present || 0, language)}</p>
                          </Card>
                          <Card className="p-3 text-center border-red-200 bg-red-50/40 dark:bg-red-950/20">
                              <p className="text-xs text-red-700 dark:text-red-400 uppercase font-medium">Absent</p>
                              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{formatLocalizedNumber(reportData.summary.absent || 0, language)}</p>
                          </Card>
                          <Card className="p-3 text-center border-amber-200 bg-amber-50/40 dark:bg-amber-950/20">
                              <p className="text-xs text-amber-700 dark:text-amber-400 uppercase font-medium">Late / Leave</p>
                              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{formatLocalizedNumber((reportData.summary.late || 0) + (reportData.summary.leave || 0), language)}</p>
                          </Card>
                          <Card className="p-3 text-center border-primary/20 bg-primary/5">
                              <p className="text-xs text-primary uppercase font-medium">Attendance Rate</p>
                              <p className="text-2xl font-bold text-primary mt-1">{formatLocalizedPercent(reportData.summary.percentage || 0, language)}</p>
                          </Card>
                      </div>

                      <div className="overflow-x-auto rounded-md border border-border/50">
                          <Table className="min-w-[650px]">
                              <TableHeader className="bg-muted/40">
                                  <TableRow className="hover:bg-transparent border-b-border/60">
                                      <TableHead className="w-[70px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sr. No</TableHead>
                                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Day</TableHead>
                                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Remarks</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {(reportData.records || []).map((rec, idx) => (
                                      <TableRow key={rec._id || idx} className="hover:bg-muted/40 transition-colors duration-200">
                                          <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                                          <TableCell className="font-medium text-sm">{formatDateDisplay(rec.date)}</TableCell>
                                          <TableCell className="text-sm text-muted-foreground">{formatDayName(rec.date)}</TableCell>
                                          <TableCell className="text-sm">{getStatusBadge(rec.status)}</TableCell>
                                          <TableCell className="text-sm text-muted-foreground">{rec.remarks || "—"}</TableCell>
                                      </TableRow>
                                  ))}
                                  {(!reportData.records || reportData.records.length === 0) && (
                                      <TableRow>
                                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                              No attendance records found for this student in the selected period.
                                          </TableCell>
                                      </TableRow>
                                  )}
                              </TableBody>
                          </Table>
                      </div>
                  </div>
              ) : selectedReport.id === "student_attendance" || selectedReport.id === "class_attendance" ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-primary/20 rounded-lg bg-primary/5 p-6 text-center">
                      <CalendarCheck className="w-12 h-12 text-primary mb-3 opacity-60" />
                      <h3 className="text-base font-semibold text-gray-800">
                          {language === "ur" ? "طالب علم کی حاضری کا پیش منظر" : "Student Attendance Preview"}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-1">
                          {language === "ur"
                              ? "اوپر دی گئی فہرست سے کلاس اور طالب علم منتخب کریں، پھر اسکرین پر حاضری دیکھنے کے لیے 'Generate Report' پر کلک کریں۔"
                              : "Select a Class and Student above, then click Generate Report to view day-wise attendance and statistics on screen."
                          }
                      </p>
                      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                          <span>{language === "ur" ? "یا پی ڈی ایف ڈاؤن لوڈ کرنے کے لیے" : "Or use"}</span>
                          <span className="font-semibold px-2 py-0.5 bg-background rounded border text-foreground">
                              {language === "ur" ? "Export PDF" : "Export PDF"}
                          </span>
                          <span>{language === "ur" ? "پر کلک کریں۔" : "to download English or Urdu PDF directly."}</span>
                      </div>
                  </div>
              ) : (
                  <div className="flex items-center justify-center h-full min-h-[300px] border-2 border-dashed border-gray-200 rounded-lg">
                      <div className="text-center text-gray-500">
                          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <h3 className="text-lg font-medium">Report Preview Area</h3>
                          <p className="text-sm mt-1">Configure filters above and click Generate or Export.</p>
                      </div>
                  </div>
              )}
          </ReportLayout>
      </div>
  );

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col gap-2 print-hidden">
        <h2 className="text-2xl font-bold tracking-tight">Report Center</h2>
        <p className="text-muted-foreground">
          Generate, preview, and print official Madrasa reports and marksheets.
        </p>
      </div>

      <AnimatePresence mode="wait">
          {selectedReport ? (
              <motion.div
                  key="report-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
              >
                  {renderSelectedReport()}
              </motion.div>
          ) : (
              <motion.div
                  key="menu-view"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
              >
                  {renderReportMenu()}
              </motion.div>
          )}
      </AnimatePresence>
    </motion.div>
  );
}

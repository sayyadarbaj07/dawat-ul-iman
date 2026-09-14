import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/BackButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { teacherApi, classApi } from "@/lib/api";
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
    return true;
  });

  const ALL_REPORTS = [
    // Student Reports
    { id: "student_performance", category: "students", title: tr("reports", "studentPerformance"), desc: tr("reports", "studentPerformanceDesc"), icon: BookOpen, config: { showClass: true, showStudent: true, showExamType: true } },
    { id: "student_marksheet", category: "students", title: tr("reports", "studentMarksheet"), desc: tr("reports", "studentMarksheetDesc"), icon: FileSpreadsheet, config: { showClass: true, showStudent: true, showExamType: true } },
    { id: "student_list", category: "students", title: tr("reports", "studentListReport"), desc: tr("reports", "studentListReportDesc"), icon: Users, config: { showClass: true } },
    { id: "weak_students", category: "students", title: tr("reports", "weakStudentsReport"), desc: tr("reports", "weakStudentsReportDesc"), icon: TrendingDown, config: { showClass: true } },
    { id: "student_attendance", category: "students", title: tr("reports", "studentAttendanceReport"), desc: tr("reports", "studentAttendanceReportDesc"), icon: CalendarCheck, config: { showClass: true, showStudent: true, showDateRange: true } },
    // Result Reports
    { id: "monthly_result", category: "results", title: tr("reports", "monthlyResult"), desc: tr("reports", "monthlyResultDesc"), icon: FileSpreadsheet, config: { showClass: true } },
    { id: "half_yearly_result", category: "results", title: tr("reports", "halfYearlyResult"), desc: tr("reports", "halfYearlyResultDesc"), icon: Award, config: { showClass: true } },
    { id: "annual_result", category: "results", title: tr("reports", "annualResult"), desc: tr("reports", "annualResultDesc"), icon: GraduationCap, config: { showClass: true } },
    { id: "class_result", category: "results", title: tr("reports", "classResult"), desc: tr("reports", "classResultDesc"), icon: Users, config: { showClass: true, showExamType: true } },
    { id: "class_marksheets", category: "results", title: "Class Marksheets", desc: "Generate marksheets for all students in a class", icon: BookOpen, config: { showClass: true, showExamType: true } },
    { id: "yearly_result", category: "results", title: "Yearly Result", desc: "Generate yearly result for a specific student", icon: Award, config: { showClass: true, showStudent: true } },
    { id: "academic_history", category: "results", title: "Academic History", desc: "Generate academic history for a specific student", icon: BookOpen, config: { showClass: true, showStudent: true } },
    // Attendance Reports
    { id: "daily_attendance", category: "attendance", title: tr("reports", "dailyAttendance"), desc: tr("reports", "dailyAttendanceDesc"), icon: CalendarCheck, config: { showClass: true, showDateRange: true } },
    { id: "weekly_attendance", category: "attendance", title: tr("reports", "weeklyAttendance"), desc: tr("reports", "weeklyAttendanceDesc"), icon: CalendarCheck, config: { showClass: true, showDateRange: true } },
    { id: "monthly_attendance", category: "attendance", title: tr("reports", "monthlyAttendance"), desc: tr("reports", "monthlyAttendanceDesc"), icon: CalendarCheck, config: { showClass: true, showMonth: true, showYear: true } },
    { id: "yearly_attendance", category: "attendance", title: tr("reports", "yearlyAttendance"), desc: tr("reports", "yearlyAttendanceDesc"), icon: CalendarCheck, config: { showClass: true, showYear: true } },
    // Finance Reports
    { id: "daily_finance", category: "finance", title: tr("reports", "dailyFinance"), desc: tr("reports", "dailyFinanceDesc"), icon: Wallet, config: { showDateRange: true } },
    { id: "weekly_finance", category: "finance", title: tr("reports", "weeklyFinance"), desc: tr("reports", "weeklyFinanceDesc"), icon: Landmark, config: { showDateRange: true } },
    { id: "monthly_finance", category: "finance", title: tr("reports", "monthlyFinance"), desc: tr("reports", "monthlyFinanceDesc"), icon: Landmark, config: { showDateRange: true } },
    { id: "yearly_finance", category: "finance", title: tr("reports", "yearlyFinance"), desc: tr("reports", "yearlyFinanceDesc"), icon: Landmark, config: { showDateRange: true } },
    { id: "income_report", category: "finance", title: tr("reports", "incomeReport"), desc: tr("reports", "incomeReportDesc"), icon: TrendingDown, config: { showDateRange: true, showCategory: true } },
    { id: "expense_report", category: "finance", title: tr("reports", "expenseReport"), desc: tr("reports", "expenseReportDesc"), icon: Receipt, config: { showDateRange: true, showCategory: true } },
    { id: "donor_report", category: "finance", title: tr("reports", "donorReport"), desc: tr("reports", "donorReportDesc"), icon: HeartHandshake, config: { showDateRange: true } },
    { id: "receipt_history", category: "finance", title: tr("reports", "receiptHistory"), desc: tr("reports", "receiptHistoryDesc"), icon: Receipt, config: { showDateRange: true } },
  ];

  
  const [activeTab, setActiveTab] = useState(user?.role === "accountant" ? "finance" : "students");
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [filters, setFilters] = useState({
      class: user?.role === "admin" ? "all" : "",
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
    }
  };

  React.useEffect(() => {
    fetchClasses();
  }, [user]);

  /** Builds a clean human-readable subtitle for the on-screen report layout header. */
  const buildSubtitle = (report, f) => {
    const parts = [];
    const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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
      } else {
          // For most PDF-based reports, "Generate" acts as "Export PDF" because there is no separate on-screen preview yet
          handleExport();
      }
  };

  const handleExport = (type = 'pdf', language = 'en') => {
      if (type === 'excel') {
          toast({ title: "Notice", description: "Excel export not supported." });
          return;
      }

      const { class: classId, studentId, examId, examType, startDate, endDate, month, year, status, category } = filters;
      const txType = filters.type;

      // Validation for student reports
      if (selectedReport?.config?.showStudent && !studentId) {
          toast({ title: "Missing Filter", description: "Please select a Student.", variant: "destructive" });
          return;
      }

      // Validation for exam reports
      if (selectedReport?.config?.showExamType && !examType && !examId && selectedReport.id !== "monthly_result" && selectedReport.id !== "half_yearly_result" && selectedReport.id !== "annual_result") {
          toast({ title: "Missing Filter", description: "Please select an Exam Type or Exam.", variant: "destructive" });
          return;
      }

      // PDF Exports Mapping
      if (selectedReport?.id === "weak_students") {
          downloadPdf(pdfApi.getWeakStudentsReport({ ...filters, language }), `Weak_Students_Report_${language}.pdf`);
      } 
      else if (selectedReport?.id === "student_performance" || selectedReport?.id === "student_marksheet") {
          downloadPdf(pdfApi.getStudentReportCard(studentId, examId || examType, language), `Marksheet_${studentId}_${language}.pdf`);
      }
      else if (selectedReport?.id === "yearly_result") {
          downloadPdf(pdfApi.getYearlyResult(studentId, language), `Yearly_Result_${studentId}_${language}.pdf`);
      }
      else if (selectedReport?.id === "academic_history") {
          downloadPdf(pdfApi.getAcademicHistory(studentId, language), `Academic_History_${studentId}_${language}.pdf`);
      }
      else if (selectedReport?.id === "class_result") {
          downloadPdf(pdfApi.getClassResult(classId, examId, examType, language), `Class_Result_${classId}_${language}.pdf`);
      }
      else if (selectedReport?.id === "monthly_result") {
          downloadPdf(pdfApi.getClassResult(classId, examId, "monthly", language), `Monthly_Result_${classId}_${language}.pdf`);
      }
      else if (selectedReport?.id === "half_yearly_result") {
          downloadPdf(pdfApi.getClassResult(classId, examId, "half-yearly", language), `Half_Yearly_Result_${classId}_${language}.pdf`);
      }
      else if (selectedReport?.id === "annual_result") {
          downloadPdf(pdfApi.getClassResult(classId, examId, "annual", language), `Annual_Result_${classId}_${language}.pdf`);
      }
      else if (selectedReport?.id === "class_marksheets") {
          downloadPdf(pdfApi.getClassMarksheets(classId, examId, examType, language), `Class_Marksheets_${classId}_${language}.pdf`);
      }
      else if (selectedReport?.id === "student_attendance") {
          downloadPdf(pdfApi.getStudentAttendanceReport(studentId, { ...filters, language }), `Student_Attendance_${studentId}_${language}.pdf`);
      } 
      else if (selectedReport?.id === "daily_attendance") {
          // Send today's date if not set
          const today = new Date().toISOString().split('T')[0];
          downloadPdf(pdfApi.getClassAttendanceReport({ classId, startDate: startDate || today, endDate: endDate || today, language }), `Daily_Attendance_${language}.pdf`);
      }
      else if (selectedReport?.id === "weekly_attendance") {
          downloadPdf(pdfApi.getClassAttendanceReport({ classId, startDate, endDate, language }), `Weekly_Attendance_${language}.pdf`);
      }
      else if (selectedReport?.id === "monthly_attendance") {
          downloadPdf(pdfApi.getClassAttendanceReport({ classId, month, year, language }), `Monthly_Attendance_${language}.pdf`);
      }
      else if (selectedReport?.id === "yearly_attendance") {
          downloadPdf(pdfApi.getClassAttendanceReport({ classId, year, language }), `Yearly_Attendance_${language}.pdf`);
      }
      else if (selectedReport?.category === "finance") {
          // For specific finance reports that have fixed types:
          let finalType = txType;
          let finalCategory = category;
          if (selectedReport.id === "income_report") finalType = "income";
          if (selectedReport.id === "expense_report") finalType = "expense";
          if (selectedReport.id === "donor_report") finalCategory = "Atiya"; // Using Atiya as donation category example

          downloadPdf(pdfApi.getFinanceSummary({ ...filters, type: finalType, category: finalCategory, language }), `Finance_${selectedReport.id}_${language}.pdf`);
      } 
      else if (selectedReport?.id === "student_list") {
          downloadPdf(pdfApi.getStudentListReport(classId, language), `Student_List_${classId || "All"}_${language}.pdf`);
      }
      else {
          window.print();
      }
  };

  const handlePrint = () => {
      handleExport();
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
                    {ALL_REPORTS.filter(r => r.category === category.id).map(report => (
                        <Card 
                            key={report.id} 
                            className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group"
                            onClick={() => setSelectedReport(report)}
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
            onClick={() => setSelectedReport(null)}
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
              generateLabel={selectedReport.id === "student_attendance" ? "Generate PDF" : "Generate Report"}
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
              ) : selectedReport.id === "student_attendance" ? (
                  <div className="flex items-center justify-center h-full min-h-[300px] border-2 border-dashed border-green-100 rounded-lg bg-green-50/30">
                      <div className="text-center text-gray-600 space-y-2">
                          <CalendarCheck className="w-12 h-12 mx-auto text-primary/40" />
                          <h3 className="text-base font-semibold">Ready to Generate PDF</h3>
                          <p className="text-sm">
                              Select a student and period above, then click <strong>Export</strong> to open the attendance report as a PDF.
                          </p>
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

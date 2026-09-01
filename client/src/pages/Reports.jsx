import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/BackButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/context/LanguageContext";
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
import { teacherApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";


const REPORT_CATEGORIES = [
  { id: "students", label: "Student Reports", icon: Users },
  { id: "results", label: "Result Reports", icon: Award },
  { id: "attendance", label: "Attendance Reports", icon: CalendarCheck },
  { id: "finance", label: "Finance Reports", icon: Landmark },
];

const ALL_REPORTS = [
  // Student Reports
  { id: "student_performance", category: "students", title: "Student Performance", desc: "Detailed academic performance of a student.", icon: BookOpen, config: { showClass: true, showDateRange: true } },
  { id: "student_marksheet", category: "students", title: "Student Marksheet", desc: "Official printable student marksheet.", icon: FileSpreadsheet, config: { showClass: true, showExamType: true } },
  { id: "student_list", category: "students", title: "Student List", desc: "Complete directory of students.", icon: Users, config: { showClass: true } },
  { id: "weak_students", category: "students", title: "Weak Students", desc: "Identify students requiring attention.", icon: TrendingDown, config: { showClass: true } },
  { id: "student_attendance", category: "students", title: "Student Attendance", desc: "Attendance records for a specific student.", icon: CalendarCheck, config: { showClass: true, showStudent: true, showMonth: true, showYear: true, showDateRange: true } },
  
  // Result Reports
  { id: "monthly_result", category: "results", title: "Monthly Result", desc: "Monthly exam results and ranks.", icon: FileSpreadsheet, config: { showClass: true, showDateRange: true } },
  { id: "half_yearly_result", category: "results", title: "Half-Yearly Result", desc: "Half-Yearly exam results.", icon: Award, config: { showClass: true } },
  { id: "annual_result", category: "results", title: "Annual Result", desc: "Generate annual class and student results.", icon: GraduationCap, config: { showClass: true } },
  { id: "class_result", category: "results", title: "Class Result", desc: "Overall class performance summary.", icon: Users, config: { showClass: true, showExamType: true } },

  // Attendance Reports
  { id: "daily_attendance", category: "attendance", title: "Daily Attendance", desc: "Daily attendance logs for all classes.", icon: CalendarCheck, config: { showClass: true, showDateRange: true } },
  { id: "weekly_attendance", category: "attendance", title: "Weekly Attendance", desc: "Weekly attendance summary.", icon: CalendarCheck, config: { showClass: true, showDateRange: true } },
  { id: "monthly_attendance", category: "attendance", title: "Monthly Attendance", desc: "Monthly attendance aggregation.", icon: CalendarCheck, config: { showClass: true, showMonth: true, showYear: true, showDateRange: true } },
  { id: "yearly_attendance", category: "attendance", title: "Yearly Attendance", desc: "Yearly attendance summary.", icon: CalendarCheck, config: { showDateRange: true } },

  // Finance Reports
  { id: "daily_finance", category: "finance", title: "Daily Finance", desc: "Daily income and expense tracking.", icon: Wallet, config: { showDateRange: true } },
  { id: "weekly_finance", category: "finance", title: "Weekly Finance", desc: "Weekly financial summary.", icon: Landmark, config: { showDateRange: true } },
  { id: "monthly_finance", category: "finance", title: "Monthly Finance", desc: "Monthly financial statement.", icon: Landmark, config: { showDateRange: true } },
  { id: "yearly_finance", category: "finance", title: "Yearly Finance", desc: "Annual financial statement.", icon: Landmark, config: { showDateRange: true } },
  { id: "income_report", category: "finance", title: "Income Report", desc: "Detailed breakdown of all income sources.", icon: TrendingDown, config: { showDateRange: true } }, // Trending up conceptually
  { id: "expense_report", category: "finance", title: "Expense Report", desc: "Detailed breakdown of all expenses.", icon: Receipt, config: { showDateRange: true } },
  { id: "donor_report", category: "finance", title: "Donor Report", desc: "Summary of donations by donors.", icon: HeartHandshake, config: { showDateRange: true } },
  { id: "receipt_history", category: "finance", title: "Receipt History", desc: "Log of all generated financial receipts.", icon: Receipt, config: { showDateRange: true } },
];

export default function Reports() {
  const { tr } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState("students");
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

  React.useEffect(() => {
    if (user?.role === "teacher") {
        teacherApi.list().then(res => {
            const me = (res.data || []).find(t => (t.userId?._id === user.id) || (t.userId === user.id));
            if (me && me.assignedClasses && me.assignedClasses.length > 0) {
                setAssignedClasses(me.assignedClasses);
                setFilters(prev => ({ ...prev, class: me.assignedClasses[0] }));
            }
        });
    } else {
        setAssignedClasses(["all", "diniyat", "arabic", "contemporary"]);
    }
  }, [user]);

  /** Builds a clean human-readable subtitle for the on-screen report layout header. */
  const buildSubtitle = (report, f) => {
    const parts = [];
    const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (report.config.showClass && f.class)
      parts.push(`Class: ${f.class === "all" ? "All" : f.class.charAt(0).toUpperCase() + f.class.slice(1)}`);
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
          toast({ title: "Success", description: "Attendance PDF downloaded successfully" });
      } catch (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
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
              toast({ title: "Success", description: "Report generated successfully." });
          } catch (error) {
              toast({ title: "Error", description: "Failed to generate report.", variant: "destructive" });
          } finally {
              setIsLoading(false);
          }
      } else if (selectedReport?.id === "student_attendance") {
          handleExport();
      } else {
          toast({
              title: "Notice",
              description: "Report data generation will be implemented in Phase 3/4. The UI layout is ready.",
          });
      }
  };

  const handleExport = () => {
      if (selectedReport?.id === "weak_students") {
          downloadPdf(pdfApi.getWeakStudentsReport(filters), "Weak_Students_Report.pdf");
      } else if (selectedReport?.id === "student_attendance") {
          if (!filters.studentId) {
             toast({ title: "Missing Filter", description: "Please select a Student from the dropdown.", variant: "destructive" });
             return;
          }
          const { studentId, ...restFilters } = filters;
          downloadPdf(pdfApi.getStudentAttendanceReport(studentId, restFilters), `Student_Attendance_${studentId}.pdf`);
      } else if (
          selectedReport?.id === "monthly_attendance" || 
          selectedReport?.id === "daily_attendance" || 
          selectedReport?.id === "weekly_attendance" || 
          selectedReport?.id === "yearly_attendance"
      ) {
          downloadPdf(pdfApi.getClassAttendanceReport({ ...filters, className: filters.class }), "Class_Attendance_Report.pdf");
      } else {
          handleGenerate();
      }
  };

  const handlePrint = () => {
      if (selectedReport?.id === "student_attendance" || selectedReport?.id === "weak_students" || selectedReport?.category === "attendance") {
          handleExport();
      } else {
          window.print();
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
                                      <TableCell className="font-semibold text-sm">{student.name}</TableCell>
                                      <TableCell className="capitalize text-sm">{student.className}</TableCell>
                                      <TableCell className="font-bold text-red-600 text-sm">{student.averageMarks}%</TableCell>
                                      <TableCell className="font-bold text-amber-600 text-sm">{student.attendancePercent}%</TableCell>
                                      <TableCell className="text-sm">{student.failedSubjectsCount}</TableCell>
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

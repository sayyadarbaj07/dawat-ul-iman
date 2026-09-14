import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { teacherSalaryApi, pdfApi } from "@/lib/api";
import { FileText, Loader2, Download, AlertCircle, Calendar as CalendarIcon, CheckCircle2, IndianRupee, Clock, Wallet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

export function TeacherSalaryTab({ teacher }) {
  const { tr, language } = useLanguage();
  const { user } = useAuth();
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [downloadingId, setDownloadingId] = useState(null);

  const isUrdu = language === "ur";
  const isAuthorized = user?.role === "admin" || (user?.role === "teacher" && (teacher?.userId === user._id || teacher?._id === user?.teacherId));

  const formatLocalizedDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    if (isUrdu) {
      return new Intl.DateTimeFormat("ur-PK", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(d);
    }
    return format(d, "dd MMM yyyy");
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isAuthorized) {
        setError("Unauthorized");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await teacherSalaryApi.getHistory(teacher._id || teacher.id, { page, limit: 12 });
        setHistory(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
      } catch (err) {
        console.error("Failed to load salary history", err);
        setError(err?.response?.status === 403 ? "Forbidden" : "Failed to load salary data");
      } finally {
        setLoading(false);
      }
    };
    
    if (teacher?._id || teacher?.id) {
      fetchHistory();
    }
  }, [teacher, page, isAuthorized]);

  const handleDownloadPdf = async (salaryId, status) => {
    if (downloadingId) return;
    try {
      setDownloadingId(salaryId);
      const url = pdfApi.getTeacherSalarySlip(salaryId, language);
      const prefix = status === "Paid" ? "Teacher_Salary_Slip" : "Salary_Breakdown";
      await pdfApi.downloadPdf(url, `${prefix}_${teacher.name.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error(err);
      alert(tr("common", "error") || "Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  if (!isAuthorized || error === "Unauthorized" || error === "Forbidden" || user?.role === "accountant") {
    return (
      <Card className="mt-6 border-dashed bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-red-100 p-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-600 mb-2">{tr("common", "permissionDenied") || "Unauthorized"}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            You do not have permission to view this teacher's salary information.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        {error}
      </div>
    );
  }

  const latestSalary = history.length > 0 ? history[0] : null;

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir={isUrdu ? "rtl" : "ltr"}>
      
      {!latestSalary ? (
         <Card className="border-dashed bg-muted/20">
           <CardContent className="flex flex-col items-center justify-center py-16 text-center">
             <div className="rounded-full bg-muted p-3 mb-4">
               <Wallet className="h-6 w-6 text-muted-foreground" />
             </div>
             <h3 className="text-lg font-semibold mb-2">{tr("teacherProfile", "noSalaryRecords") || "No salary records found"}</h3>
             <p className="text-sm text-muted-foreground max-w-sm">
               Payroll has not generated any salary records for this teacher yet.
             </p>
           </CardContent>
         </Card>
      ) : (
        <>
          {/* LATEST SALARY OVERVIEW */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{tr("teacherProfile", "payableSalary") || "Payable Salary"}</p>
                    <p className="text-3xl font-bold text-primary">
                      ₹{latestSalary.payableSalary?.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full">
                    <IndianRupee className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant={latestSalary.status === "Paid" ? "default" : "secondary"}>
                    {latestSalary.status === "Paid" ? (tr("teacherProfile", "paid") || "Paid") : (tr("teacherProfile", "draft") || "Draft")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {latestSalary.month}/{latestSalary.year}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{tr("teacherProfile", "monthlySalary") || "Monthly Salary"}</p>
                    <p className="text-2xl font-semibold">
                      ₹{latestSalary.monthlySalarySnapshot?.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground flex justify-between">
                    <span>{tr("teacherProfile", "dailySalary") || "Daily Salary"}</span>
                    <span className="font-medium text-foreground">₹{latestSalary.dailySalary?.toFixed(2)}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{tr("teacherProfile", "attendance") || "Attendance"}</p>
                    <div className="flex items-baseline gap-2">
                       {latestSalary.presentDays !== undefined && (
                         <span className="text-2xl font-semibold text-green-600">{latestSalary.presentDays} <span className="text-sm font-normal text-muted-foreground">P</span></span>
                       )}
                       <span className="text-lg font-semibold text-red-500">{latestSalary.absentDays || 0} <span className="text-sm font-normal text-muted-foreground">A</span></span>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground flex gap-3 flex-wrap">
                  <span>{tr("teacherProfile", "leave") || "Leave"}: {latestSalary.leaveTaken || 0}</span>
                  <span>{tr("teacherProfile", "late") || "Late"}: {latestSalary.lateDays || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{tr("teacherProfile", "deductions") || "Total Deductions"}</p>
                    <p className="text-2xl font-semibold text-red-600">
                      ₹{latestSalary.totalDeduction?.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground flex flex-col gap-1">
                  <span className="flex justify-between">
                    <span>{tr("teacherProfile", "leaveDeduction") || "Leave Ded."}</span>
                    <span>₹{latestSalary.leaveDeduction || 0}</span>
                  </span>
                  <span className="flex justify-between">
                    <span>{tr("teacherProfile", "absentDeduction") || "Absent Ded."}</span>
                    <span>₹{latestSalary.absentDeduction || 0}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LATEST PAYMENT INFO (Only if paid) */}
          {latestSalary.status === "Paid" && (
            <Card className="shadow-sm border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex flex-wrap gap-6 items-center">
                 <div className="flex items-center gap-2">
                   <CheckCircle2 className="w-5 h-5 text-primary" />
                   <span className="font-medium text-sm">{tr("teacherProfile", "paymentInformation") || "Payment Info"}:</span>
                 </div>
                 <div className="text-sm flex flex-wrap gap-4 text-muted-foreground">
                   <span><strong className="text-foreground">{tr("teacherProfile", "paymentDate") || "Date"}:</strong> {formatLocalizedDate(latestSalary.paymentDate)}</span>
                   <span><strong className="text-foreground">{tr("teacherProfile", "paymentMethod") || "Method"}:</strong> {latestSalary.paymentMethod || "—"}</span>
                   {latestSalary.paymentReference && <span><strong className="text-foreground">{tr("teacherProfile", "paymentReference") || "Ref"}:</strong> {latestSalary.paymentReference}</span>}
                 </div>
              </CardContent>
            </Card>
          )}

          {/* HISTORY TABLE */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">{tr("teacherProfile", "salaryHistory") || "Salary History"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isUrdu ? "text-right" : ""}>{tr("teacherProfile", "salaryPeriod") || "Period"}</TableHead>
                      <TableHead className={isUrdu ? "text-right" : ""}>{tr("teacherProfile", "monthlySalary") || "Base"}</TableHead>
                      <TableHead className={isUrdu ? "text-right" : ""}>{tr("teacherProfile", "deductions") || "Deductions"}</TableHead>
                      <TableHead className={isUrdu ? "text-right" : ""}>{tr("teacherProfile", "payableSalary") || "Net Payable"}</TableHead>
                      <TableHead className={isUrdu ? "text-right" : ""}>{tr("teacherProfile", "status") || "Status"}</TableHead>
                      <TableHead className={isUrdu ? "text-right" : ""}>{tr("teacherProfile", "paymentDate") || "Paid On"}</TableHead>
                      <TableHead className={isUrdu ? "text-right" : "text-right"}>{tr("common", "actions") || "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="font-medium">
                          {record.month}/{record.year}
                        </TableCell>
                        <TableCell>₹{record.monthlySalarySnapshot?.toLocaleString()}</TableCell>
                        <TableCell className="text-red-500">₹{record.totalDeduction?.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-primary">₹{record.payableSalary?.toLocaleString()}</TableCell>
                        <TableCell>
                           <Badge variant={record.status === "Paid" ? "default" : "outline"} className="text-xs">
                             {record.status === "Paid" ? (tr("teacherProfile", "paid") || "Paid") : (tr("teacherProfile", "draft") || "Draft")}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                           {record.status === "Paid" ? formatLocalizedDate(record.paymentDate) : "—"}
                        </TableCell>
                        <TableCell className={isUrdu ? "text-left" : "text-right"}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 flex gap-2"
                            onClick={() => handleDownloadPdf(record._id, record.status)}
                            disabled={downloadingId === record._id}
                          >
                            {downloadingId === record._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            <span className="hidden sm:inline">
                              {record.status === "Paid" 
                                ? (tr("teacherProfile", "salarySlip") || "Salary Slip") 
                                : (tr("teacherProfile", "salaryCalculationBreakdown") || "Breakdown")}
                            </span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {totalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                   <Button 
                     variant="outline" 
                     disabled={page === 1}
                     onClick={() => setPage(p => p - 1)}
                   >
                     {tr("common", "previous") || "Previous"}
                   </Button>
                   <span className="text-sm text-muted-foreground">
                     {tr("common", "page") || "Page"} {page} {tr("common", "of") || "of"} {totalPages}
                   </span>
                   <Button 
                     variant="outline" 
                     disabled={page === totalPages}
                     onClick={() => setPage(p => p + 1)}
                   >
                     {tr("common", "next") || "Next"}
                   </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

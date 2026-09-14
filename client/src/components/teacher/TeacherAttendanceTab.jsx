import React, { useState, useEffect, useMemo } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { attendanceApi } from "@/lib/api/attendance";
import { formatLocalizedDate, formatLocalizedNumber } from "@/utils/localizationUtils";
import { Calendar, UserCheck, UserX, Clock, Plane, FileText, FilterX, RotateCcw, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export function TeacherAttendanceTab({ teacher }) {
  const { tr, language } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const dir = language === "ur" ? "rtl" : "ltr";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allRecords, setAllRecords] = useState([]);

  // Filters
  const currentMonthValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [monthFilter, setMonthFilter] = useState(currentMonthValue);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await attendanceApi.getTeacherSummary(teacher._id || teacher.id);
      if (res.data && res.data.records) {
        // Ensure new records first (safely sorted)
        const sorted = [...res.data.records].sort((a, b) => new Date(b.date) - new Date(a.date));
        setAllRecords(sorted);
      } else {
        setAllRecords([]);
      }
    } catch (err) {
      console.error("Failed to load teacher attendance:", err);
      if (err.response?.status === 403) {
        setError(tr("common", "unauthorized") || "Unauthorized access.");
      } else if (err.response?.status === 404) {
        setError(tr("common", "notFound") || "Not Found.");
      } else {
        setError(tr("common", "error") || "An error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacher) {
      fetchAttendance();
    }
  }, [teacher]);

  // Derived available months for dropdown based on records
  const availableMonths = useMemo(() => {
    const months = new Set();
    allRecords.forEach(r => {
      const d = new Date(r.date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      months.add(`${yyyy}-${mm}`);
    });
    // Ensure current month is always an option even if no records exist yet
    months.add(currentMonthValue);
    
    return Array.from(months).sort().reverse();
  }, [allRecords, currentMonthValue]);

  // Filter Logic
  // UX Rule: Date Range overrides Month filter if From OR To is populated
  const isDateRangeActive = fromDate !== "" || toDate !== "";

  const filteredRecords = useMemo(() => {
    return allRecords.filter(record => {
      // Status Filter
      if (statusFilter !== "All" && record.status !== statusFilter) return false;

      const recordDate = new Date(record.date);
      // Strip time for accurate inclusive day comparisons
      recordDate.setHours(0, 0, 0, 0);

      // Date Filters
      if (isDateRangeActive) {
        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          if (recordDate < from) return false;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(0, 0, 0, 0);
          if (recordDate > to) return false;
        }
      } else if (monthFilter !== "All") {
        const [year, month] = monthFilter.split("-");
        if (recordDate.getFullYear() !== parseInt(year) || (recordDate.getMonth() + 1) !== parseInt(month)) {
          return false;
        }
      }

      return true;
    });
  }, [allRecords, statusFilter, monthFilter, fromDate, toDate, isDateRangeActive]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, monthFilter, fromDate, toDate]);

  // Summary Metrics Calculation (based ONLY on filtered records)
  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let late = 0;

    filteredRecords.forEach(r => {
      if (r.status === "Present") present++;
      else if (r.status === "Absent") absent++;
      else if (r.status === "Leave") leave++;
      else if (r.status === "Late") late++;
    });

    const total = filteredRecords.length;
    // Calculate percentage: (Present + Late) / Total * 100
    // We do NOT count Leave as Present
    const effectivePresent = present + late;
    const percentage = total > 0 ? Math.round((effectivePresent / total) * 100) : 0;

    return { present, absent, leave, late, total, percentage };
  }, [filteredRecords]);

  // Today's Status
  const todayStatus = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecord = allRecords.find(r => {
      const rd = new Date(r.date);
      rd.setHours(0, 0, 0, 0);
      return rd.getTime() === today.getTime();
    });
    return todayRecord ? todayRecord.status : (tr("teacherProfile", "notMarked") || "Not Marked");
  }, [allRecords, tr]);

  const resetFilters = () => {
    setMonthFilter(currentMonthValue);
    setFromDate("");
    setToDate("");
    setStatusFilter("All");
    setCurrentPage(1);
  };

  const formatMonthLabel = (val) => {
    if (val === "All") return tr("teacherProfile", "allMonths") || "All Months";
    const [year, month] = val.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return new Intl.DateTimeFormat(language === 'ur' ? 'ur-PK' : 'en-US', { month: 'long', year: 'numeric' }).format(d);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Present": return <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-green-200">{tr("attendance", status) || status}</Badge>;
      case "Absent": return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200">{tr("attendance", status) || status}</Badge>;
      case "Leave": return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200">{tr("attendance", status) || status}</Badge>;
      case "Late": return <Badge variant="warning" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200">{tr("attendance", status) || status}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={FilterX}
        title={error}
        description={tr("common", "errorDesc") || "Could not load attendance data."}
        action={{
          label: tr("common", "retry") || "Retry",
          onClick: fetchAttendance
        }}
      />
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* HEADER & MANAGE BUTTON */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {tr("teacherProfile", "attendanceSummary") || "Attendance Summary"}
          </h3>
          <div className="text-sm text-muted-foreground mt-1">
            {tr("teacherProfile", "todayStatus") || "Today's Status"}: 
            <span className="font-semibold ms-2">{getStatusBadge(todayStatus)}</span>
          </div>
        </div>
        
        {user?.role === "admin" && (
          <Button variant="outline" onClick={() => setLocation("/attendance")}>
            {tr("teacherProfile", "manageAttendance") || "Manage Attendance"}
            <ArrowRight className="w-4 h-4 ms-2" />
          </Button>
        )}
      </div>

      {/* SUMMARY METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/20 col-span-2 md:col-span-1 flex flex-col justify-center items-center p-4">
          <div className="text-3xl font-bold text-primary" dir="ltr">{summary.percentage}%</div>
          <div className="text-sm text-muted-foreground font-medium mt-1">{tr("teacherProfile", "attendancePercent") || "Attendance %"}</div>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <UserCheck className="w-6 h-6 text-green-500 mb-2" />
            <div className="text-2xl font-bold" dir="ltr">{formatLocalizedNumber(summary.present, language)}</div>
            <div className="text-sm text-muted-foreground">{tr("attendance", "Present") || "Present"}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <UserX className="w-6 h-6 text-red-500 mb-2" />
            <div className="text-2xl font-bold" dir="ltr">{formatLocalizedNumber(summary.absent, language)}</div>
            <div className="text-sm text-muted-foreground">{tr("attendance", "Absent") || "Absent"}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <Plane className="w-6 h-6 text-blue-500 mb-2" />
            <div className="text-2xl font-bold" dir="ltr">{formatLocalizedNumber(summary.leave, language)}</div>
            <div className="text-sm text-muted-foreground">{tr("attendance", "Leave") || "Leave"}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-500 mb-2" />
            <div className="text-2xl font-bold" dir="ltr">{formatLocalizedNumber(summary.late, language)}</div>
            <div className="text-sm text-muted-foreground">{tr("attendance", "Late") || "Late"}</div>
          </CardContent>
        </Card>
      </div>

      {/* FILTERS */}
      <div className="bg-muted/30 p-4 rounded-lg border space-y-4 md:space-y-0 md:flex md:items-end gap-4">
        
        <div className="space-y-1.5 flex-1 min-w-[150px]">
          <label className="text-xs font-medium text-muted-foreground">{tr("teacherProfile", "month") || "Month"}</label>
          <Select value={monthFilter} onValueChange={setMonthFilter} disabled={isDateRangeActive}>
            <SelectTrigger>
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">{tr("teacherProfile", "allMonths") || "All Months"}</SelectItem>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground">{tr("teacherProfile", "from") || "From"}</label>
          <Input 
            type="date" 
            value={fromDate} 
            onChange={(e) => setFromDate(e.target.value)} 
          />
        </div>

        <div className="space-y-1.5 flex-1 min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground">{tr("teacherProfile", "to") || "To"}</label>
          <Input 
            type="date" 
            value={toDate} 
            onChange={(e) => setToDate(e.target.value)} 
            min={fromDate}
          />
        </div>

        <div className="space-y-1.5 flex-1 min-w-[120px]">
          <label className="text-xs font-medium text-muted-foreground">{tr("teacherProfile", "status") || "Status"}</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">{tr("teacherProfile", "all") || "All"}</SelectItem>
              <SelectItem value="Present">{tr("attendance", "Present") || "Present"}</SelectItem>
              <SelectItem value="Absent">{tr("attendance", "Absent") || "Absent"}</SelectItem>
              <SelectItem value="Leave">{tr("attendance", "Leave") || "Leave"}</SelectItem>
              <SelectItem value="Late">{tr("attendance", "Late") || "Late"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="ghost" onClick={resetFilters} className="mt-4 md:mt-0 px-2" title={tr("teacherProfile", "resetFilters") || "Reset Filters"}>
          <RotateCcw className="w-4 h-4 mr-2" />
          <span className="md:hidden ml-2">Reset</span>
        </Button>
      </div>

      {/* HISTORY TABLE / CARDS */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">{tr("teacherProfile", "attendanceHistory") || "Attendance History"}</h4>
        
        {filteredRecords.length === 0 ? (
          <EmptyState 
            title={allRecords.length === 0 ? (tr("teacherProfile", "noAttendanceRecords") || "No attendance records available.") : (tr("teacherProfile", "noMatchingAttendanceRecords") || "No attendance records match the selected filters.")}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-card rounded-lg border shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>{tr("common", "date") || "Date"}</TableHead>
                    <TableHead>{tr("teacherProfile", "status") || "Status"}</TableHead>
                    <TableHead>{tr("common", "remarks") || "Remarks"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((r, i) => (
                    <TableRow key={r._id || i}>
                      <TableCell className="font-medium" dir="ltr">{formatLocalizedDate(r.date, language)}</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.remarks || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {paginatedRecords.map((r, i) => (
                <Card key={r._id || i}>
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold" dir="ltr">{formatLocalizedDate(r.date, language)}</span>
                      {getStatusBadge(r.status)}
                    </div>
                    {r.remarks && (
                      <div className="text-sm text-muted-foreground mt-1 flex items-start gap-1">
                        <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{r.remarks}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  {tr("teacherProfile", "previous") || "Previous"}
                </Button>
                <span className="text-sm text-muted-foreground" dir="ltr">
                  {tr("teacherProfile", "page") || "Page"} {formatLocalizedNumber(currentPage, language)} / {formatLocalizedNumber(totalPages, language)}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  {tr("teacherProfile", "next") || "Next"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

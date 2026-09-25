import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue 
} from "@/components/ui/select";
import { Filter, Printer, Download } from "lucide-react";
import { studentApi } from "@/lib/api/student";

export function ReportFilters({ 
  config = {}, 
  filters, 
  setFilters,
  onGenerate,
  onPrint,
  onExport,
  loading = false,
  showPrint = true,
  showExport = true,
  generateLabel = "Generate Report",
  availableClasses = ["all"]
}) {
  const CLASS_LABELS = {
    all: "All Classes",
    diniyat: "Diniyat",
    arabic: "Arabic",
    contemporary: "Contemporary",
  };
  const handleChange = (key, value) => {
    setFilters(prev => {
        const newFilters = { ...prev, [key]: value };
        if (key === "class") {
            newFilters.studentId = ""; // Clear student when class changes
            newFilters.examId = "";
            newFilters.examType = "";
        }
        return newFilters;
    });
  };

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);

  useEffect(() => {
    if ((config.showStudent || config.showExamType) && filters.class && filters.class !== "all") {
        if (config.showStudent) {
            setStudents([]);  // clear stale list immediately
            setLoadingStudents(true);
            studentApi.list({ classId: filters.class, limit: 1000 })
                .then(res => setStudents(res.data?.data || res.data || []))
                .catch(err => console.error("Failed to load students", err))
                .finally(() => setLoadingStudents(false));
        }
        if (config.showExamType) {
            setExams([]);
            setLoadingExams(true);
            import("@/lib/api/exam").then(({ examApi }) => {
                examApi.listExams({ classId: filters.class })
                    .then(res => setExams(res.data || res || []))
                    .catch(err => console.error("Failed to load exams", err))
                    .finally(() => setLoadingExams(false));
            });
        }
    } else {
        setStudents([]);
        setExams([]);
    }
  }, [filters.class, config.showStudent, config.showExamType]);

  // Format a Date object as YYYY-MM-DD using LOCAL date components.
  // toISOString() must NOT be used here because it converts to UTC first,
  // which shifts the date backward by 5h30m in IST (e.g. Sep 1 00:00 IST
  // becomes Aug 31 18:30 UTC, producing "2026-08-31" instead of "2026-09-01").
  const formatLocalDate = (date) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const handleDatePreset = (preset) => {
      const today = new Date();
      let start = "";
      let end = formatLocalDate(today); // local date, no UTC conversion

      if (preset === "today") {
          start = end;
      } else if (preset === "thisWeek") {
          const firstDay = new Date(today);
          firstDay.setDate(today.getDate() - today.getDay());
          start = formatLocalDate(firstDay);
      } else if (preset === "thisMonth") {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          start = formatLocalDate(firstDay);
      } else if (preset === "thisYear") {
          const firstDay = new Date(today.getFullYear(), 0, 1);
          start = formatLocalDate(firstDay);
      }
      handleChange("startDate", start);
      handleChange("endDate", end);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 print-hidden">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b">
        <Filter className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Report Filters</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        
        {config.showClass && (
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Class</Label>
                <Select value={filters.class || undefined} onValueChange={(val) => handleChange("class", val)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableClasses.map(cls => (
                            <SelectItem key={cls.id || cls} value={cls.id || cls}>
                                {cls.name || CLASS_LABELS[cls] || cls}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}

        {config.showExamType && (
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Exam Type</Label>
                <Select value={filters.examType || undefined} onValueChange={(val) => handleChange("examType", val)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Exam Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        )}

        {config.showExamType && (
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Exam</Label>
                <Select 
                    value={filters.examId || undefined} 
                    onValueChange={(val) => handleChange("examId", val)}
                    disabled={!filters.class || filters.class === "all" || loadingExams}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={
                            loadingExams
                                ? "Loading exams…"
                                : (!filters.class || filters.class === "all")
                                    ? "Select a class first"
                                    : exams.length === 0
                                        ? "No exams in class"
                                        : "Select Specific Exam"
                        } />
                    </SelectTrigger>
                    <SelectContent>
                        {(Array.isArray(exams) ? exams : []).map(e => (
                            <SelectItem key={e._id} value={e._id}>
                                {e.name || e.examType || "Unknown Exam"}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}

        {config.showMonth && (
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Month</Label>
                <Select value={String(filters.month || new Date().getMonth() + 1)} onValueChange={(val) => handleChange("month", val)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i+1} value={String(i+1)}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}

        {config.showYear && (
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Year</Label>
                <Select value={String(filters.year || new Date().getFullYear())} onValueChange={(val) => handleChange("year", val)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {[2024, 2025, 2026].map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}

        {config.showStudent && (
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Student</Label>
                <Select 
                    value={filters.studentId || undefined} 
                    onValueChange={(val) => handleChange("studentId", val)}
                    disabled={!filters.class || filters.class === "all" || loadingStudents}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={
                            loadingStudents
                                ? "Loading students…"
                                : (!filters.class || filters.class === "all")
                                    ? "Select a class first"
                                    : students.length === 0
                                        ? "No students in class"
                                        : "Select Student"
                        } />
                    </SelectTrigger>
                    <SelectContent>
                        {(Array.isArray(students) ? students : []).map(s => (
                            <SelectItem key={s._id} value={s._id}>
                                {s.name}{s.rollNumber ? ` — Roll ${s.rollNumber}` : ""}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}

        {config.showDateRange && (
            <>
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-500">Start Date</Label>
                    <Input 
                        type="date" 
                        value={filters.startDate || ""} 
                        onChange={(e) => handleChange("startDate", e.target.value)} 
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-500">End Date</Label>
                    <Input 
                        type="date" 
                        value={filters.endDate || ""} 
                        onChange={(e) => handleChange("endDate", e.target.value)} 
                    />
                </div>
                <div className="space-y-1.5 md:col-span-3 lg:col-span-4 flex gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleDatePreset('today')} className="text-xs h-7">Today</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleDatePreset('thisWeek')} className="text-xs h-7">This Week</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleDatePreset('thisMonth')} className="text-xs h-7">This Month</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleDatePreset('thisYear')} className="text-xs h-7">This Year</Button>
                </div>
            </>
        )}

        {config.showType && (
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Transaction Type</Label>
                <Select value={filters.type || "all"} onValueChange={(val) => handleChange("type", val)}>
                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        )}

        {config.showCategory && (
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Category</Label>
                <Select value={filters.category || "all"} onValueChange={(val) => handleChange("category", val)}>
                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Fees">Fees</SelectItem>
                        <SelectItem value="Salary">Salary</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Atiya">Atiya</SelectItem>
                        <SelectItem value="Kafalat">Kafalat</SelectItem>
                        <SelectItem value="Zakat">Zakat</SelectItem>
                        <SelectItem value="Sadqa">Sadqa</SelectItem>
                        <SelectItem value="Isale Sawab">Isale Sawab</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        )}

        {config.showStatus && (
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Status</Label>
                <Select value={filters.status || "active"} onValueChange={(val) => handleChange("status", val)}>
                    <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="graduated">Graduated</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <div>
            <Button onClick={onGenerate} disabled={loading} className="min-w-[120px]">
                {loading ? (
                    <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Generating PDF...
                    </span>
                ) : (
                    generateLabel
                )}
            </Button>
          </div>
          
          <div className="flex gap-2">
            {showPrint && (
                <Button variant="outline" onClick={onPrint} disabled={loading} className="gap-2">
                    <Printer className="w-4 h-4" /> Print
                </Button>
            )}
            {showExport && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" disabled={loading} className="gap-2">
                            <Download className="w-4 h-4" /> Export
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onExport('en')}>English PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onExport('ur')}>Urdu PDF (اردو)</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
          </div>
      </div>
    </div>
  );
}

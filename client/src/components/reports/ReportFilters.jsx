import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  availableClasses = ["all", "diniyat", "arabic", "contemporary"]
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
        }
        return newFilters;
    });
  };

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (config.showStudent && filters.class && filters.class !== "all") {
        setStudents([]);  // clear stale list immediately
        setLoadingStudents(true);
        studentApi.list({ className: filters.class, limit: 1000 })
            .then(res => setStudents(res.data || []))
            .catch(err => console.error("Failed to load students", err))
            .finally(() => setLoadingStudents(false));
    } else {
        setStudents([]);
    }
  }, [filters.class, config.showStudent]);

  const handleDatePreset = (preset) => {
      const today = new Date();
      let start = "";
      let end = today.toISOString().split('T')[0];

      if (preset === "today") {
          start = end;
      } else if (preset === "thisWeek") {
          const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
          start = firstDay.toISOString().split('T')[0];
      } else if (preset === "thisMonth") {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          start = firstDay.toISOString().split('T')[0];
      } else if (preset === "thisYear") {
          const firstDay = new Date(today.getFullYear(), 0, 1);
          start = firstDay.toISOString().split('T')[0];
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
                <Select value={filters.class} onValueChange={(val) => handleChange("class", val)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableClasses.map(cls => (
                            <SelectItem key={cls} value={cls}>
                                {CLASS_LABELS[cls] ?? cls}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}

        {config.showExamType && (
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">Exam Type</Label>
                <Select value={filters.examType} onValueChange={(val) => handleChange("examType", val)}>
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
                    value={filters.studentId || ""} 
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
                        {students.map(s => (
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
                    "Generate Report"
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
                <Button variant="outline" onClick={onExport} disabled={loading} className="gap-2">
                    <Download className="w-4 h-4" /> Export
                </Button>
            )}
          </div>
      </div>
    </div>
  );
}

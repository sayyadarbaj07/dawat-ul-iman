import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { studentApi, attendanceApi, classApi } from "@/lib/api";
import { CalendarIcon, Search, Activity, Users, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatLocalizedNumber, formatLocalizedPercent } from "@/utils/localizationUtils";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";

export default function ClassAttendanceOverview() {
  const [, setLocation] = useLocation();
  const { tr, language } = useLanguage();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    loadAttendanceData();
  }, [date]);

  const loadBaseData = async () => {
    try {
      setLoading(true);
      const [classRes, studentRes] = await Promise.allSettled([
        classApi.getClasses(),
        studentApi.list({ limit: 5000 })
      ]);
      
      if (classRes.status === "fulfilled") {
        setClasses(classRes.value?.data || []);
      }
      if (studentRes.status === "fulfilled") {
        const studentData = studentRes.value?.data?.data || studentRes.value?.data || [];
        setStudents(studentData.filter(s => s.status !== "inactive"));
      }
    } catch (error) {
      console.error("Failed to load base data", error);
    } finally {
      if (attendance.length > 0 || date) {
         // loadAttendanceData handles setting loading false
      }
    }
  };

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const res = await attendanceApi.getByDate(date, "Student");
      setAttendance(res.data?.data || res.data || []);
    } catch (error) {
      console.error("Failed to load attendance", error);
    } finally {
      setLoading(false);
    }
  };

  const getOverviewData = () => {
    // Filter classes
    let filteredClasses = classes;
    if (departmentFilter !== "all") {
      filteredClasses = filteredClasses.filter(c => c.department === departmentFilter);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filteredClasses = filteredClasses.filter(c => 
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q))
      );
    }

    return filteredClasses.map(cls => {
      // Find students in this class using canonical ID or legacy className
      const classStudents = students.filter(s => 
        (s.classId === cls._id) || 
        (!s.classId && (s.className === cls.fullName || s.className === cls.name || s.studentClass === cls.name))
      );
      
      const totalStudents = classStudents.length;
      
      // Find attendance for this class
      const classAttendance = attendance.filter(a => 
        (a.classId === cls._id) || 
        (!a.classId && (a.className === cls.fullName || a.className === cls.name))
      );
      
      let present = 0;
      let absent = 0;
      let late = 0;
      let leave = 0;

      classAttendance.forEach(a => {
        if (a.status === "Present") present++;
        else if (a.status === "Absent") absent++;
        else if (a.status === "Late") late++;
        else if (a.status === "Leave") leave++;
      });
      
      const effectivePresent = present + late;
      const notMarked = Math.max(totalStudents - effectivePresent - absent, 0);
      const percent = totalStudents > 0 ? Math.round((effectivePresent / totalStudents) * 100) : 0;
      
      return {
        ...cls,
        totalStudents,
        present: effectivePresent,
        absent,
        notMarked,
        percent,
        hasRecords: totalMarked > 0
      };
    }).sort((a, b) => {
      // Sort by department then name
      if (a.department !== b.department) return a.department.localeCompare(b.department);
      return a.name.localeCompare(b.name);
    });
  };

  const overviewData = getOverviewData();

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader 
        title={tr("attendance", "classOverviewTitle") || "Class Attendance Overview"}
        description={tr("attendance", "classOverviewDesc") || "Monitor daily attendance metrics across all classes."}
        showBack={true}
        backLabel={tr("common", "backToDashboard")}
      />

      <Card>
        <div className="p-4 flex flex-col sm:flex-row justify-between items-center border-b bg-gray-50/50 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tr("common", "searchPlaceholder") || "Search classes..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-9 bg-white"
              />
            </div>
            
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm min-w-[140px]"
            >
              <option value="all">{tr("common", "allDepartments") || "All Departments"}</option>
              <option value="diniyat">Diniyat</option>
              <option value="hifz">Hifz</option>
              <option value="alimiyat">Alimiyat</option>
              <option value="qirat">Qirat</option>
              <option value="contemporary">Contemporary</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 shadow-sm w-full sm:w-auto">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 w-[130px] text-sm"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-b-border/60">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("common", "className") || "Class Name"}</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("common", "department") || "Department"}</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("attendance", "totalStudents") || "Total"}</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-emerald-700">{tr("attendance", "present") || "Present"}</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-rose-700">{tr("attendance", "absent") || "Absent"}</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-amber-700">{tr("attendance", "notMarked") || "Not Marked"}</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("attendance", "attendancePercent") || "Percentage"}</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("common", "actions") || "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
                      {tr("common", "loading") || "Loading..."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : overviewData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState 
                      title={tr("common", "noData") || "No classes found"}
                      description={searchTerm ? "Try adjusting your search or filters." : "No active classes available."}
                      icon={Activity}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                overviewData.map((cls) => (
                  <TableRow key={cls._id} className="hover:bg-muted/40 transition-colors duration-200">
                    <TableCell>
                      <div className="font-semibold text-sm" dir="auto">{cls.fullName || cls.name}</div>
                      <div className="text-xs text-muted-foreground uppercase mt-0.5">{cls.section ? `Sec: ${cls.section}` : "—"}</div>
                    </TableCell>
                    <TableCell className="capitalize text-sm text-muted-foreground">
                      {cls.department}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs">
                        <Users className="w-3 h-3 text-slate-500" />
                        {formatLocalizedNumber(cls.totalStudents, language)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                        {formatLocalizedNumber(cls.present, language)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/50">
                        {formatLocalizedNumber(cls.absent, language)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                        cls.notMarked > 0 
                          ? 'bg-amber-50 text-amber-700 border-amber-200/50' 
                          : 'bg-slate-50 text-slate-500 border-slate-200/50'
                      }`}>
                        {formatLocalizedNumber(cls.notMarked, language)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${cls.percent >= 75 ? 'bg-emerald-500' : cls.percent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                            style={{ width: `${cls.percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold tabular-nums min-w-[32px] text-right">
                          {formatLocalizedPercent(cls.percent, language)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Navigate to actual view class logic as requested */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => setLocation(`/class-attendance/${cls._id}?date=${date}`)}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </motion.div>
  );
}

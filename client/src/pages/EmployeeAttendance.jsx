import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { employeeApi, employeeAttendanceApi } from "@/lib/api";
import { CalendarIcon, Check, X, Clock, AlertTriangle, Search, Info, Briefcase } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatLocalizedNumber, formatLocalizedDate } from "@/utils/localizationUtils";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";

export default function EmployeeAttendance() {
  const { tr, language, isRtl } = useLanguage();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [remarksData, setRemarksData] = useState({});
  
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const abortControllerRef = useRef(null);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoadingUsers(true);
      // Fetch only active employees
      const res = await employeeApi.list({ isActive: true, limit: 500 });
      setEmployees(res.data?.data || res.data || []);
    } catch (error) {
      console.error("Failed to load employees", error);
      toast.error(tr("employeeAttendance", "failedToLoad"));
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [date]);

  const loadAttendance = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoadingAttendance(true);
      const res = await employeeAttendanceApi.list({ date });
      
      if (abortControllerRef.current.signal.aborted) return;

      const newAttendanceData = {};
      const newRemarksData = {};
      const data = res.data?.data || res.data || [];
      data.forEach((record) => {
        newAttendanceData[record.employeeId?._id || record.employeeId] = record.status;
        if (record.remarks) newRemarksData[record.employeeId?._id || record.employeeId] = record.remarks;
      });
      setAttendanceData(newAttendanceData);
      setRemarksData(newRemarksData);
      setIsDirty(false);
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Failed to load attendance", error);
      toast.error(tr("employeeAttendance", "failedToLoad"));
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleDateChange = (newDate) => {
    if (isDirty && !window.confirm(tr("common", "unsavedChanges"))) return;
    setDate(newDate);
  };

  const handleMark = (employeeId, status) => {
    setAttendanceData((prev) => ({ ...prev, [employeeId]: status }));
    setIsDirty(true);
  };

  const handleRemark = (employeeId, remark) => {
    setRemarksData((prev) => ({ ...prev, [employeeId]: remark }));
    setIsDirty(true);
  };

  const handleMarkAll = () => {
    const list = getFilteredList();
    if (list.length === 0) return;
    
    if (window.confirm(tr("employeeAttendance", "markAllConfirm"))) {
      const newObj = { ...attendanceData };
      list.forEach(e => {
        newObj[e._id] = "Present";
      });
      setAttendanceData(newObj);
      setIsDirty(true);
    }
  };

  const saveAttendance = async () => {
    try {
      setSaving(true);
      
      const records = [];
      Object.keys(attendanceData).forEach((employeeId) => {
        records.push({
          employeeId,
          date,
          status: attendanceData[employeeId],
          remarks: remarksData[employeeId] || ""
        });
      });

      if (records.length === 0) {
        toast.info(tr("employeeAttendance", "noEmployees"));
        return;
      }

      await employeeAttendanceApi.bulkCreate(records);
      toast.success(tr("employeeAttendance", "saved"));
      setIsDirty(false);
      await loadAttendance(); // reload to confirm saved state
    } catch (error) {
      console.error("Failed to save attendance", error);
      toast.error(error.response?.data?.message || tr("employeeAttendance", "failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const getFilteredList = () => {
    if (!searchTerm) return employees;
    const lower = searchTerm.toLowerCase();
    return employees.filter(
      e => 
        e.name.toLowerCase().includes(lower) || 
        e.employeeId.toLowerCase().includes(lower) || 
        (e.designation && e.designation.toLowerCase().includes(lower))
    );
  };

  const filteredEmployees = getFilteredList();

  const getStatusCounts = () => {
    const counts = { Present: 0, Absent: 0, Late: 0, Leave: 0, NotMarked: 0 };
    employees.forEach(e => {
      const status = attendanceData[e._id];
      if (status) {
        counts[status] = (counts[status] || 0) + 1;
      } else {
        counts.NotMarked++;
      }
    });
    return counts;
  };

  const statusCounts = getStatusCounts();
  const selectedDateObj = new Date(date);
  const isSunday = selectedDateObj.getDay() === 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={tr("employeeAttendance", "pageTitle")} 
        description={tr("employeeAttendance", "pageSubtitle")} 
      />

      {/* Date & Search Actions */}
      <Card className="p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <CalendarIcon className={`w-5 h-5 text-slate-500 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full md:w-48 bg-white dark:bg-slate-950"
            />
          </div>
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {formatLocalizedDate(selectedDateObj, language)}
          </div>
        </div>
        <div className="relative w-full md:w-64">
          <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4`} />
          <Input 
            placeholder={tr("common", "search") + "..."} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full bg-white dark:bg-slate-950 ${isRtl ? 'pr-9' : 'pl-9'}`}
          />
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 flex flex-col items-center justify-center bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatLocalizedNumber(employees.length, language)}</div>
          <div className="text-xs text-slate-500 uppercase font-semibold">{tr("employeeAttendance", "totalActive")}</div>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatLocalizedNumber(statusCounts.Present, language)}</div>
          <div className="text-xs text-slate-500 uppercase font-semibold">{tr("employeeAttendance", "present")}</div>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatLocalizedNumber(statusCounts.Absent, language)}</div>
          <div className="text-xs text-slate-500 uppercase font-semibold">{tr("employeeAttendance", "absent")}</div>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatLocalizedNumber(statusCounts.Late, language)}</div>
          <div className="text-xs text-slate-500 uppercase font-semibold">{tr("employeeAttendance", "late")}</div>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatLocalizedNumber(statusCounts.Leave, language)}</div>
          <div className="text-xs text-slate-500 uppercase font-semibold">{tr("employeeAttendance", "leave")}</div>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-slate-500 dark:text-slate-400">{formatLocalizedNumber(statusCounts.NotMarked, language)}</div>
          <div className="text-xs text-slate-500 uppercase font-semibold">{tr("employeeAttendance", "notMarked")}</div>
        </Card>
      </div>

      {isSunday && (
        <Card className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 flex items-center gap-3">
          <Info className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <div className="text-indigo-800 dark:text-indigo-300 font-medium">
            {tr("employeeAttendance", "weeklyOff")}
          </div>
        </Card>
      )}

      {/* Main List */}
      <Card className="border-0 shadow-sm overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">
            {tr("employeeAttendance", "pageTitle")}
          </h3>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMarkAll}
              disabled={filteredEmployees.length === 0 || loadingUsers || loadingAttendance}
            >
              <Check className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
              {tr("employeeAttendance", "markAllPresent")}
            </Button>
            <Button 
              size="sm" 
              onClick={saveAttendance}
              disabled={!isDirty || saving || filteredEmployees.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                tr("common", "save")
              )}
            </Button>
          </div>
        </div>

        {loadingUsers || loadingAttendance ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState 
            icon={Briefcase}
            title={tr("employeeAttendance", "noEmployees")}
            description=""
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>{tr("common", "name")}</TableHead>
                  <TableHead>{tr("common", "designation")}</TableHead>
                  <TableHead>{tr("employeeAttendance", "updateStatus")}</TableHead>
                  <TableHead>{tr("employeeAttendance", "remarks")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp, index) => {
                  const status = attendanceData[emp._id] || "";
                  
                  return (
                    <TableRow key={emp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <TableCell className="text-center font-medium text-slate-500">
                        {formatLocalizedNumber(index + 1, language)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{emp.name}</span>
                          <span className="text-xs text-slate-500">{emp.employeeId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-xs font-medium">
                          {emp.designation}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleMark(emp._id, "Present")}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              status === "Present" 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 ring-2 ring-green-500/50" 
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              {tr("employeeAttendance", "present")}
                            </span>
                          </button>
                          <button
                            onClick={() => handleMark(emp._id, "Absent")}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              status === "Absent" 
                                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 ring-2 ring-red-500/50" 
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <X className="w-3 h-3" />
                              {tr("employeeAttendance", "absent")}
                            </span>
                          </button>
                          <button
                            onClick={() => handleMark(emp._id, "Late")}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              status === "Late" 
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 ring-2 ring-amber-500/50" 
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {tr("employeeAttendance", "late")}
                            </span>
                          </button>
                          <button
                            onClick={() => handleMark(emp._id, "Leave")}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              status === "Leave" 
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 ring-2 ring-purple-500/50" 
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {tr("employeeAttendance", "leave")}
                            </span>
                          </button>
                        </div>
                        {!status && (
                          <div className="mt-1 text-[10px] text-slate-400 italic">
                            {tr("employeeAttendance", "notMarked")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input 
                          placeholder={tr("employeeAttendance", "remarks")} 
                          value={remarksData[emp._id] || ""}
                          onChange={(e) => handleRemark(emp._id, e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-slate-950 w-full min-w-[120px]"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

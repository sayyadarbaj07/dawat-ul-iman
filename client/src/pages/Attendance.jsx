import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { studentApi, teacherApi, attendanceApi, eventApi, classApi } from "@/lib/api";
import { CalendarIcon, Check, X, Clock, AlertTriangle, Search, Info } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatLocalizedNumber, formatLocalizedDate } from "@/utils/localizationUtils";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Attendance() {
  const { tr, language } = useLanguage();
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  const [mainTab, setMainTab] = useState("mark");
  const [activeTab, setActiveTab] = useState("students");
  const [classFilter, setClassFilter] = useState("all");
  
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [remarksData, setRemarksData] = useState({});
  
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [assignedClasses, setAssignedClasses] = useState([]);
  
  const [events, setEvents] = useState([]);
  const [holidayEvent, setHolidayEvent] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // History State
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());
  const [historyClass, setHistoryClass] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const abortControllerRef = useRef(null);

  // Prevent leaving with unsaved changes
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

  // Load basic teacher assignments and events on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const [apiClasses, setApiClasses] = useState([]);

  const loadInitialData = async () => {
    try {
      // 1. Fetch events to check holidays
      const eventRes = await eventApi.list().catch(() => ({ data: { data: [] } }));
      const allEvents = eventRes.data?.data || eventRes.data || [];
      setEvents(allEvents);

      // 1.5 Fetch API Classes for Phase 6.5
      const classRes = await classApi.getClasses().catch(() => ({ data: [] }));
      const activeApiClasses = classRes.data?.filter(c => c.status === "active") || [];
      setApiClasses(activeApiClasses);

      // 2. Resolve Teachers & RBAC
      if (user?.role === "teacher") {
        const teacherRes = await teacherApi.list().catch(() => ({ data: [] }));
        const allTeachers = teacherRes.data?.data || teacherRes.data || [];
        setTeachers(allTeachers);
        
        const me = allTeachers.find(t => (t.userId?._id === user.id) || (t.userId === user.id));
        if (me) {
          let teacherClasses = [];
          if (me.assignedClassIds && me.assignedClassIds.length > 0) {
            // Use assignedClassIds to get the precise active classes assigned
            teacherClasses = activeApiClasses.filter(c => me.assignedClassIds.includes(c._id));
          } else if (me.assignedClasses && me.assignedClasses.length > 0) {
            // Legacy fallback: match by legacy department/name mapping
            teacherClasses = activeApiClasses.filter(c => me.assignedClasses.includes(c.department) || me.assignedClasses.includes(c.name));
          }
          
          if (teacherClasses.length > 0) {
            setAssignedClasses(teacherClasses);
            setClassFilter(teacherClasses[0]?._id || "");
          } else {
            setAssignedClasses([]);
            setClassFilter("");
          }
        } else {
          setAssignedClasses([]);
          setClassFilter("");
        }
      } else if (user?.role === "admin") {
        setAssignedClasses(activeApiClasses);
        setClassFilter(activeApiClasses[0]?._id || ""); // default to first class ID
      }
    } catch (error) {
      console.error("Failed to load initial data", error);
    }
  };

  // Check Holiday status whenever date changes
  useEffect(() => {
    if (events.length > 0 && date) {
      const isHoliday = events.find(e => 
        e.type === "holiday" && 
        new Date(e.date).toISOString().split("T")[0] === date
      );
      setHolidayEvent(isHoliday || null);
    }
  }, [date, events]);

  // Load Students when Class changes
  useEffect(() => {
    if (mainTab === "mark" && activeTab === "students" && classFilter && classFilter !== "all") {
      loadStudentsForClass(classFilter);
    }
  }, [classFilter, mainTab, activeTab]);

  const getQueryClassName = (cid) => {
    const cls = apiClasses.find(c => c._id === cid);
    return cls ? cls.fullName : cid;
  };

  const loadStudentsForClass = async (classId) => {
    try {
      setLoadingUsers(true);
      const res = await studentApi.list({ classId, limit: 500 });
      setStudents(res.data?.data || res.data || []);
    } catch (error) {
      console.error("Failed to load students", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load Attendance when Date or Class changes
  useEffect(() => {
    if (mainTab === "mark" && classFilter) {
      loadAttendance();
    }
  }, [date, classFilter, mainTab, activeTab]);

  const loadAttendance = async () => {
    if (user?.role === "teacher" && assignedClasses.length === 0) return;
    if (activeTab === "students" && (!classFilter || classFilter === "all")) return;
    
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoadingAttendance(true);
      setErrorMsg("");
      
      // classFilter acts as classId parameter.
      const res = await attendanceApi.getByDate(
        date,
        activeTab === "students" ? "Student" : "Teacher",
        activeTab === "students" ? null : null, // Do not send className anymore
        activeTab === "students" ? classFilter : null // Send classFilter as classId
      );
      
      if (abortControllerRef.current.signal.aborted) return;

      const newAttendanceData = {};
      const newRemarksData = {};
      const data = res.data?.data || res.data || [];
      data.forEach((record) => {
        newAttendanceData[record.userId?._id || record.userId] = record.status;
        if (record.remarks) newRemarksData[record.userId?._id || record.userId] = record.remarks;
      });
      setAttendanceData(newAttendanceData);
      setRemarksData(newRemarksData);
      setIsDirty(false); // Clean state after loading DB data
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Failed to load attendance", error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (mainTab === "history") {
      loadHistory();
    }
  }, [historyMonth, historyYear, historyClass, mainTab]);

  const loadHistory = async () => {
    if (!historyClass) return;
    try {
      setLoadingHistory(true);
      const queryName = getQueryClassName(historyClass);
      const res = await attendanceApi.getClassAttendance(queryName, historyMonth, historyYear, historyClass);
      setHistoryData(res.data?.data || []);
    } catch (error) {
      console.error("Failed to load history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDateChange = (newDate) => {
    if (isDirty && !window.confirm(tr("common", "unsavedChanges"))) return;
    setDate(newDate);
  };

  const handleClassChange = (newClass) => {
    if (isDirty && !window.confirm(tr("common", "unsavedChanges"))) return;
    setClassFilter(newClass);
  };

  const handleMark = (userId, status) => {
    setAttendanceData((prev) => ({ ...prev, [userId]: status }));
    setIsDirty(true);
  };

  const handleRemark = (userId, remark) => {
    setRemarksData((prev) => ({ ...prev, [userId]: remark }));
    setIsDirty(true);
  };

  const handleMarkAll = (status) => {
    if (holidayEvent) return;
    const newObj = { ...attendanceData };
    const list = getFilteredUserList();
    list.forEach(u => {
      newObj[u._id] = status;
    });
    setAttendanceData(newObj);
    setIsDirty(true);
  };

  const getFilteredUserList = () => {
    let list = activeTab === "students" ? students : teachers;
    if (searchTerm) {
      list = list.filter(u => {
        const name = (u.fullName || u.name || "").toLowerCase();
        const roll = (u.rollNumber || "").toLowerCase();
        const q = searchTerm.toLowerCase();
        return name.includes(q) || roll.includes(q);
      });
    }
    return list;
  };

  const handleSave = async () => {
    if (holidayEvent) {
      setErrorMsg(tr("attendance", "cannotSaveHoliday"));
      return;
    }
    
    try {
      setSaving(true);
      setErrorMsg("");
      setSuccessMsg("");
      
      const isStudent = activeTab === "students";
      const userList = getFilteredUserList();

      // Only save records that have an explicit status set
      const recordsToSave = userList.filter(u => attendanceData[u._id]);

      if (recordsToSave.length === 0) {
        setErrorMsg(tr("attendance", "pleaseMarkFirst"));
        setSaving(false);
        return;
      }

      // Check if all students are marked (warning only)
      if (recordsToSave.length < userList.length) {
        if (!window.confirm(tr("attendance", "studentsUnmarked").replace("{count}", userList.length - recordsToSave.length))) {
          setSaving(false);
          return;
        }
      }

      const records = recordsToSave.map((u) => ({
        userType: isStudent ? "Student" : "Teacher",
        userId: u._id,
        status: attendanceData[u._id],
        remarks: remarksData[u._id] || "",
        className: isStudent ? (u.studentClass || u.className) : undefined,
      }));

      // In Phase 6.6, saveBatch takes (date, classId, records)
      await attendanceApi.saveBatch(date, isStudent ? classFilter : null, records);
      
      setSuccessMsg(tr("attendance", "savedSuccessfully").replace("{count}", records.length));
      setIsDirty(false);
      setTimeout(() => setSuccessMsg(""), 3000);
      
      // Refresh
      loadAttendance();
    } catch (error) {
      console.error("Failed to save attendance", error);
      setErrorMsg(error.error || error.message || "Failed to save attendance (403 Forbidden or Validation Error).");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (isDirty && !window.confirm(tr("common", "unsavedChanges"))) return;
    setAttendanceData({});
    setRemarksData({});
    setIsDirty(false);
    loadAttendance(); // Reload original state
  };

  const renderStatusButtons = (userId) => {
    const status = attendanceData[userId];
    return (
      <div className="flex justify-center gap-1.5 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          disabled={!!holidayEvent}
          onClick={() => handleMark(userId, "Present")}
          className={
            status === "Present"
              ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 shadow-sm px-2"
              : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 px-2"
          }
        >
          {tr("attendance", "present")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!!holidayEvent}
          onClick={() => handleMark(userId, "Absent")}
          className={
            status === "Absent"
              ? "bg-red-500/15 text-red-700 border-red-500/30 shadow-sm px-2"
              : "text-muted-foreground hover:bg-red-50 hover:text-red-700 hover:border-red-200 px-2"
          }
        >
          {tr("attendance", "absent")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!!holidayEvent}
          onClick={() => handleMark(userId, "Late")}
          className={
            status === "Late"
              ? "bg-amber-500/15 text-amber-700 border-amber-500/30 shadow-sm px-2"
              : "text-muted-foreground hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 px-2"
          }
        >
          {tr("attendance", "late")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!!holidayEvent}
          onClick={() => handleMark(userId, "Leave")}
          className={
            status === "Leave"
              ? "bg-blue-500/15 text-blue-700 border-blue-500/30 shadow-sm px-2"
              : "text-muted-foreground hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 px-2"
          }
        >
          {tr("attendance", "leave")}
        </Button>
      </div>
    );
  };

  const filteredUserList = getFilteredUserList();
  
  // History Computations
  const historyTotal = historyData.length;
  const historyPresent = historyData.filter(d => d.status === 'Present').length;
  const historyAbsent = historyData.filter(d => d.status === 'Absent').length;
  const historyLate = historyData.filter(d => d.status === 'Late').length;

  if (user?.role === "accountant") {
    return (
      <Card className="p-8 text-center text-muted-foreground mt-10">
        <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-red-500" />
        {tr("attendance", "noPermission")}
      </Card>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader 
        title={tr("attendance", "pageTitle")}
        description={tr("attendance", "manageAttendance")}
        showBack={true}
        backLabel={tr("common", "backToDashboard")}
      />

      <Tabs value={mainTab} onValueChange={(v) => {
        if (isDirty && v !== mainTab && !window.confirm(tr("attendance", "unsavedDiscard"))) return;
        setMainTab(v);
      }} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="mark">{tr("attendance", "markAttendance")}</TabsTrigger>
          <TabsTrigger value="history">{tr("attendance", "attendanceHistory")}</TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="mt-0 space-y-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-3 rounded-md border">
            {user?.role === "admin" ? (
              <Tabs value={activeTab} onValueChange={(v) => {
                if (isDirty && v !== activeTab && !window.confirm(tr("attendance", "unsavedDiscard"))) return;
                setActiveTab(v);
              }} className="w-auto">
                <TabsList>
                  <TabsTrigger value="students">{tr("attendance", "students")}</TabsTrigger>
                  <TabsTrigger value="teachers">{tr("attendance", "teachers")}</TabsTrigger>
                </TabsList>
              </Tabs>
            ) : (
              <div className="font-semibold text-lg text-gray-700 px-2" dir="auto">{tr("attendance", "students")}</div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {activeTab === "students" && (
                <select
                  value={classFilter}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                  disabled={user?.role === "teacher" && assignedClasses.length <= 1}
                >
                  {user?.role === "admin" && <option value="all" disabled>{tr("attendance", "selectClass")}</option>}
                  {assignedClasses.map(cls => (
                    <option key={cls._id} value={cls._id}>{cls.fullName}</option>
                  ))}
                </select>
              )}
              
              <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-1.5 shadow-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 w-[130px] text-sm"
                />
              </div>
            </div>
          </div>

          {holidayEvent && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded flex items-center gap-3 shadow-sm">
              <Info className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900" dir="auto">{tr("attendance", "holidayTitle")}: {holidayEvent.title}</p>
                <p className="text-sm">{tr("attendance", "holidayDesc")} ({holidayEvent.description ? <span dir="auto">{holidayEvent.description}</span> : tr("common", "noDescription")})</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span>{successMsg}</span>
            </div>
          )}

          {user?.role === "teacher" && assignedClasses.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-amber-500" />
              {tr("attendance", "notAssigned")}
            </Card>
          ) : (!classFilter || classFilter === "all") ? (
            <Card className="p-12 text-center text-muted-foreground">
              {tr("attendance", "selectClassPrompt")}
            </Card>
          ) : (
            <Card>
              <div className="p-4 flex flex-col sm:flex-row justify-between items-center border-b bg-gray-50/50 gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={tr("attendance", "searchNameRoll")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="ps-9 bg-white"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleMarkAll("Present")} disabled={!!holidayEvent}>{tr("attendance", "allPresent")}</Button>
                  <Button variant="outline" size="sm" onClick={() => handleMarkAll("Absent")} disabled={!!holidayEvent}>{tr("attendance", "allAbsent")}</Button>
                  <Button variant="outline" size="sm" onClick={() => handleMarkAll("Leave")} disabled={!!holidayEvent}>{tr("attendance", "allLeave")}</Button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent border-b-border/60">
                      <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("students", "id")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[200px]">{tr("common", "name")}</TableHead>
                      <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("attendance", "status")}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[250px]">{tr("attendance", "remarksOptional")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingUsers || loadingAttendance ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center">
                          <div className="flex justify-center items-center gap-2 text-muted-foreground">
                            <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
                            {tr("attendance", "loadingData")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredUserList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="p-0">
                          <EmptyState 
                            title={tr("attendance", "noUsersFound")}
                            description={searchTerm ? tr("attendance", "noUsersFoundDesc") : tr("attendance", "noUsersInClass")}
                            icon={Search}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUserList.map((u) => {
                        const status = attendanceData[u._id];
                        const isPending = !status;
                        
                        return (
                          <TableRow key={u._id} className={`transition-colors duration-200 ${isPending ? 'bg-amber-50/20' : 'hover:bg-muted/40'}`}>
                            <TableCell className="font-medium text-muted-foreground text-xs font-mono">
                              {u.rollNumber || (u._id || u.id).slice(-6).toUpperCase()}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-sm" dir="auto">{u.fullName || u.name}</div>
                              {isPending && <div className="text-[10px] text-amber-600 font-medium tracking-wider uppercase mt-0.5">{tr("attendance", "notMarked")}</div>}
                            </TableCell>
                            <TableCell className="text-center">{renderStatusButtons(u._id)}</TableCell>
                            <TableCell>
                              <Input
                                placeholder={tr("attendance", "remarksPlaceholder")}
                                value={remarksData[u._id] || ""}
                                onChange={(e) => handleRemark(u._id, e.target.value)}
                                className="h-8 text-sm"
                                dir="auto"
                                disabled={!!holidayEvent}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 rounded-b-lg">
                <div className="text-sm text-muted-foreground">
                  {filteredUserList.filter(u => attendanceData[u._id]).length} / {filteredUserList.length} {tr("attendance", "marked")}
                  {isDirty && <span className="ms-2 text-amber-600 font-medium flex items-center inline-flex"><AlertTriangle className="w-3 h-3 me-1"/> {tr("attendance", "unsavedChanges")}</span>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset} disabled={loadingAttendance || saving || !isDirty}>
                    {tr("attendance", "discardChanges")}
                  </Button>
                  <Button onClick={handleSave} disabled={loadingAttendance || saving || !!holidayEvent || !isDirty}>
                    {saving ? tr("attendance", "saving") : tr("attendance", "saveAttendance")}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-0 space-y-4">
          <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-md border items-end">
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-gray-500">{tr("common", "class")}</label>
                <select
                  value={historyClass}
                  onChange={(e) => setHistoryClass(e.target.value)}
                  className="flex h-9 w-[200px] rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                >
                  <option value="" disabled>{tr("attendance", "selectClass")}</option>
                  {apiClasses.map(cls => (
                    <option key={cls._id} value={cls._id}>{cls.fullName}</option>
                  ))}
                </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-gray-500">{tr("attendance", "month")}</label>
              <select
                value={historyMonth}
                onChange={(e) => setHistoryMonth(Number(e.target.value))}
                className="flex h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-gray-500">{tr("attendance", "year")}</label>
              <select
                value={historyYear}
                onChange={(e) => setHistoryYear(Number(e.target.value))}
                className="flex h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-xs text-muted-foreground uppercase font-semibold">{tr("attendance", "totalRecords")}</div>
              <div className="text-2xl font-bold mt-1">{formatLocalizedNumber(historyTotal, language)}</div>
            </Card>
            <Card className="p-4 text-center border-emerald-500/20 bg-emerald-500/5">
              <div className="text-xs text-emerald-700 uppercase font-semibold tracking-wider">{tr("attendance", "present")}</div>
              <div className="text-2xl font-bold mt-1 text-emerald-700">{formatLocalizedNumber(historyPresent, language)}</div>
            </Card>
            <Card className="p-4 text-center border-red-500/20 bg-red-500/5">
              <div className="text-xs text-red-700 uppercase font-semibold tracking-wider">{tr("attendance", "absent")}</div>
              <div className="text-2xl font-bold mt-1 text-red-700">{formatLocalizedNumber(historyAbsent, language)}</div>
            </Card>
            <Card className="p-4 text-center border-amber-500/20 bg-amber-500/5">
              <div className="text-xs text-amber-700 uppercase font-semibold tracking-wider">{tr("attendance", "late")}</div>
              <div className="text-2xl font-bold mt-1 text-amber-700">{formatLocalizedNumber(historyLate, language)}</div>
            </Card>
          </div>

          <Card>
            <div className="overflow-x-auto max-h-[500px]">
              <Table className="min-w-[800px]">
                <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                  <TableRow className="hover:bg-transparent border-b-border/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[150px]">{tr("attendance", "date")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[200px]">{tr("attendance", "studentName")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[120px]">{tr("attendance", "status")}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("attendance", "remarks")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingHistory ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">{tr("attendance", "loadingHistory")}</TableCell>
                    </TableRow>
                  ) : historyData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0">
                        <EmptyState 
                          title={tr("attendance", "noRecordsFound")}
                          description={tr("attendance", "noRecordsFoundDesc")}
                          icon={CalendarIcon}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyData.sort((a, b) => new Date(b.date) - new Date(a.date)).map((record) => (
                      <TableRow key={record._id} className="hover:bg-muted/40 transition-colors duration-200">
                        <TableCell className="font-medium whitespace-nowrap text-sm" dir="ltr">
                          {formatLocalizedDate(record.date, language, "EEE, dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-sm font-semibold" dir="auto">{record.userId?.fullName || record.userId?.name || "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border border-transparent ${
                            record.status === 'Present' ? 'bg-emerald-500/15 text-emerald-700' :
                            record.status === 'Absent' ? 'bg-red-500/15 text-red-700' :
                            record.status === 'Leave' ? 'bg-blue-500/15 text-blue-700' :
                            'bg-amber-500/15 text-amber-700'
                          }`}>
                            {record.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.remarks || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

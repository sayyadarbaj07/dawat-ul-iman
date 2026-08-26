import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { studentApi, teacherApi, attendanceApi } from "@/lib/api";
import { CalendarIcon, Check, X, Clock, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

export default function Attendance() {
  const { tr } = useLanguage();
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Outer Tabs: mark, history
  const [mainTab, setMainTab] = useState("mark");
  // Inner Tabs for Mark Attendance: students, teachers
  const [activeTab, setActiveTab] = useState("students");
  
  const [classFilter, setClassFilter] = useState("all");
  
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [assignedClasses, setAssignedClasses] = useState([]);

  // History State
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());
  const [historyClass, setHistoryClass] = useState("diniyat");
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (mainTab === "mark") {
      loadAttendance();
    }
  }, [date, activeTab, classFilter, mainTab]);

  useEffect(() => {
    if (mainTab === "history") {
      loadHistory();
    }
  }, [historyMonth, historyYear, historyClass, mainTab]);

  const loadUsers = async () => {
    try {
      const [studentRes, teacherRes] = await Promise.all([
        studentApi.list(),
        teacherApi.list(),
      ]);
      setStudents(studentRes.data || []);
      const allTeachers = teacherRes.data || [];
      setTeachers(allTeachers);

      if (user?.role === "teacher") {
        const me = allTeachers.find(t => (t.userId?._id === user.id) || (t.userId === user.id));
        if (me && me.assignedClasses && me.assignedClasses.length > 0) {
          setAssignedClasses(me.assignedClasses);
          setClassFilter(me.assignedClasses[0]);
        } else {
          setAssignedClasses([]);
          setClassFilter("");
        }
      } else {
        setAssignedClasses(["diniyat", "arabic", "contemporary"]);
      }
    } catch (error) {
      console.error("Failed to load users", error);
    }
  };

  const loadAttendance = async () => {
    if (user?.role === "teacher" && assignedClasses.length === 0) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await attendanceApi.getByDate(
        date,
        activeTab === "students" ? "Student" : "Teacher",
        activeTab === "students" && classFilter !== "all" ? classFilter : null
      );
      
      const newAttendanceData = {};
      (res.data || []).forEach((record) => {
        newAttendanceData[record.userId._id] = record.status;
      });
      setAttendanceData(newAttendanceData);
    } catch (error) {
      console.error("Failed to load attendance", error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!historyClass) return;
    try {
      setLoadingHistory(true);
      const res = await attendanceApi.getClassAttendance(historyClass, historyMonth, historyYear);
      setHistoryData(res.data || []);
    } catch (error) {
      console.error("Failed to load history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleMark = (userId, status) => {
    setAttendanceData((prev) => ({
      ...prev,
      [userId]: status,
    }));
  };

  const handleMarkAll = (status) => {
    const newObj = { ...attendanceData };
    const list = getFilteredUserList();
    list.forEach(u => {
      newObj[u._id] = status;
    });
    setAttendanceData(newObj);
  };

  const getFilteredUserList = () => {
    if (activeTab === "students") {
      return classFilter === "all" ? students : students.filter(s => s.className?.toLowerCase() === classFilter);
    }
    return teachers;
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");
      
      const isStudent = activeTab === "students";
      const userList = getFilteredUserList();

      const records = userList.map((u) => ({
        userType: isStudent ? "Student" : "Teacher",
        userId: u._id,
        status: attendanceData[u._id] || "Present", // Default to Present if unmarked
        className: isStudent ? u.className : undefined,
      }));

      if (records.length === 0) {
        setLoading(false);
        return;
      }

      await attendanceApi.saveBatch(date, records);
      setSuccessMsg("Attendance saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Failed to save attendance", error);
      setErrorMsg(error.error || error.message || "Failed to save attendance (403 Forbidden or Validation Error).");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAttendanceData({});
  };

  const filteredStudents = classFilter === "all"
    ? students
    : students.filter((s) => s.className?.toLowerCase() === classFilter);

  const renderStatusButtons = (userId) => {
    const status = attendanceData[userId];
    return (
      <div className="flex justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleMark(userId, "Present")}
          className={
            status === "Present"
              ? "bg-green-100 text-green-800 border-green-300 shadow-sm"
              : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          }
        >
          <Check className="h-4 w-4 mr-1 hidden sm:block" /> Present
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleMark(userId, "Absent")}
          className={
            status === "Absent"
              ? "bg-red-100 text-red-800 border-red-300 shadow-sm"
              : "text-muted-foreground hover:bg-red-50 hover:text-red-700 hover:border-red-200"
          }
        >
          <X className="h-4 w-4 mr-1 hidden sm:block" /> Absent
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleMark(userId, "Late")}
          className={
            status === "Late"
              ? "bg-amber-100 text-amber-800 border-amber-300 shadow-sm"
              : "text-muted-foreground hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
          }
        >
          <Clock className="h-4 w-4 mr-1 hidden sm:block" /> Late
        </Button>
      </div>
    );
  };

  // History Computations
  const historyTotal = historyData.length;
  const historyPresent = historyData.filter(d => d.status === 'Present').length;
  const historyAbsent = historyData.filter(d => d.status === 'Absent').length;
  const historyLate = historyData.filter(d => d.status === 'Late').length;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {tr("attendance", "pageTitle")}
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage and view attendance records
          </p>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="mt-0 space-y-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-3 rounded-md border">
            {user?.role === "admin" ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList>
                  <TabsTrigger value="students">{tr("attendance", "students")}</TabsTrigger>
                  <TabsTrigger value="teachers">{tr("attendance", "teachers")}</TabsTrigger>
                </TabsList>
              </Tabs>
            ) : (
              <div className="font-semibold text-lg text-gray-700 px-2">Student Attendance</div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {activeTab === "students" && (
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                >
                  {user?.role === "admin" && <option value="all">{tr("attendance", "allClasses")}</option>}
                  {assignedClasses.includes("diniyat") && <option value="diniyat">Diniyat</option>}
                  {assignedClasses.includes("arabic") && <option value="arabic">Arabic</option>}
                  {assignedClasses.includes("contemporary") && <option value="contemporary">Contemporary</option>}
                </select>
              )}
              
              <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-1.5 shadow-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 w-[130px] text-sm"
                />
              </div>
            </div>
          </div>

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
              You are not assigned to any classes yet. Please contact the administrator.
            </Card>
          ) : (
            <Card>
              <div className="p-4 flex flex-wrap justify-between items-center border-b bg-gray-50/50">
                <div className="text-sm text-muted-foreground font-medium">
                  {activeTab === "students" ? `Showing ${filteredStudents.length} students` : `Showing ${teachers.length} teachers`}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleMarkAll("Present")}>Mark All Present</Button>
                  <Button variant="outline" size="sm" onClick={() => handleMarkAll("Absent")}>Mark All Absent</Button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">{tr("students", "id")}</TableHead>
                      <TableHead>Name</TableHead>
                      {activeTab === "students" ? <TableHead>Class</TableHead> : <TableHead>Subject</TableHead>}
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTab === "students" ? (
                      filteredStudents.map((student) => (
                        <TableRow key={student._id}>
                          <TableCell className="font-medium text-muted-foreground text-xs">
                            {student.rollNumber || "—"}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {student.fullName || student.name}
                          </TableCell>
                          <TableCell className="capitalize">{student.className}</TableCell>
                          <TableCell>{renderStatusButtons(student._id)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      teachers.map((teacher) => (
                        <TableRow key={teacher._id}>
                          <TableCell className="font-medium text-muted-foreground text-xs">
                            {(teacher._id || teacher.id).slice(-6).toUpperCase()}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {teacher.fullName || teacher.name}
                          </TableCell>
                          <TableCell>{teacher.subject || "—"}</TableCell>
                          <TableCell>{renderStatusButtons(teacher._id)}</TableCell>
                        </TableRow>
                      ))
                    )}
                    
                    {activeTab === "students" && filteredStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          No students found for this class.
                        </TableCell>
                      </TableRow>
                    )}
                    {activeTab === "teachers" && teachers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          No teachers found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-lg">
                <Button variant="outline" onClick={handleReset}>
                  Reset
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-0 space-y-4">
          <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-md border items-end">
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Class</label>
              <select
                value={historyClass}
                onChange={(e) => setHistoryClass(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
              >
                <option value="diniyat">Diniyat</option>
                <option value="arabic">Arabic</option>
                <option value="contemporary">Contemporary</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Month</label>
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
              <label className="text-xs font-semibold text-gray-500">Year</label>
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
              <div className="text-xs text-muted-foreground uppercase font-semibold">Total Records</div>
              <div className="text-2xl font-bold mt-1">{historyTotal}</div>
            </Card>
            <Card className="p-4 text-center border-green-200">
              <div className="text-xs text-green-600 uppercase font-semibold">Present</div>
              <div className="text-2xl font-bold mt-1 text-green-700">{historyPresent}</div>
            </Card>
            <Card className="p-4 text-center border-red-200">
              <div className="text-xs text-red-600 uppercase font-semibold">Absent</div>
              <div className="text-2xl font-bold mt-1 text-red-700">{historyAbsent}</div>
            </Card>
            <Card className="p-4 text-center border-amber-200">
              <div className="text-xs text-amber-600 uppercase font-semibold">Late</div>
              <div className="text-2xl font-bold mt-1 text-amber-700">{historyLate}</div>
            </Card>
          </div>

          <Card>
            <div className="overflow-x-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-white">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingHistory ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Loading history...</TableCell>
                    </TableRow>
                  ) : historyData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No records found for this period.</TableCell>
                    </TableRow>
                  ) : (
                    historyData.sort((a, b) => new Date(b.date) - new Date(a.date)).map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </TableCell>
                        <TableCell>{record.userId?.fullName || record.userId?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            record.status === 'Present' ? 'bg-green-100 text-green-700' :
                            record.status === 'Absent' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {record.status}
                          </span>
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

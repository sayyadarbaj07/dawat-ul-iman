import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTeacherDashboardData } from "@/hooks/useTeacherDashboardData";
import {
  Users,
  Calendar,
  ClipboardList,
  GraduationCap,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isRtl = language === "ur";
  
  // Helper for fallback text since default t doesn't support 2nd param as fallback
  const tx = (key, fallback) => {
    const res = t(key);
    return res === key || res === undefined ? fallback : res;
  };
  
  const { loading, data } = useTeacherDashboardData(user);
  const [selectedClassId, setSelectedClassId] = useState(null);

  useEffect(() => {
    if (data?.assignedClasses?.length > 0) {
      if (!selectedClassId || !data.assignedClasses.some(c => c._id === selectedClassId)) {
        setSelectedClassId(data.assignedClasses[0]._id);
      }
    }
  }, [data?.assignedClasses, selectedClassId]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <p className="text-muted-foreground animate-pulse">{tx("dashboard.loading", "Loading dashboard...")}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load teacher dashboard data.
      </div>
    );
  }

  const selectedClass = data.assignedClasses?.find(c => c._id === selectedClassId) || null;

  return (
    <div className={`space-y-6 ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-50/50 p-6 rounded-xl border border-emerald-100">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {tx("dashboard.greeting", "Assalamu Alaikum")}, {data.teacherName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {tx("dashboard.overview", "Here is the overview of your classes for today.")}
          </p>
        </div>
        <div className="flex gap-2">
           {data.canAccess("/attendance") && selectedClassId && (
             <Link href={`/attendance?classId=${selectedClassId}`}>
               <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all duration-200">
                 <ClipboardList className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                 {tx("dashboard.markAttendance", "Mark Attendance")}
               </Button>
             </Link>
           )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow border-emerald-100/50 bg-white/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">
              {tx("dashboard.myClasses", "My Classes")}
            </CardTitle>
            <GraduationCap className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{data.assignedClasses.length}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-emerald-100/50 bg-white/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">
              {tx("dashboard.myStudents", "My Students")}
            </CardTitle>
            <Users className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{data.totalStudents}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-emerald-100/50 bg-white/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">
              {tx("dashboard.attendancePending", "Attendance Pending")}
            </CardTitle>
            <AlertTriangle className={`h-5 w-5 ${data.pendingAttendanceCount > 0 ? "text-amber-500" : "text-emerald-500"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{data.pendingAttendanceCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {tx("dashboard.classesToMark", "Classes left to mark")}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-emerald-100/50 bg-white/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600">
              {tx("dashboard.upcomingExams", "Upcoming Exams")}
            </CardTitle>
            <Calendar className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{data.upcomingExams.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Classes List */}
        <Card className="col-span-1 border-emerald-100/50 shadow-sm">
          <CardHeader className="bg-emerald-50/30 border-b border-emerald-100/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              {tx("dashboard.myClasses", "My Classes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             {data.assignedClasses.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  {tx("dashboard.noAssignedClasses", "No classes assigned yet.")}
                </div>
             ) : (
                <div className="divide-y divide-emerald-50">
                  {data.assignedClasses.map((cls) => {
                    const isSelected = cls._id === selectedClassId;
                    return (
                    <div 
                      key={cls._id} 
                      onClick={() => setSelectedClassId(cls._id)}
                      className={`p-4 transition-colors flex justify-between items-center cursor-pointer ${isSelected ? "bg-emerald-100/50 border-l-4 border-emerald-500" : "hover:bg-emerald-50/30 border-l-4 border-transparent"}`}
                    >
                      <div>
                        <h3 className={`font-medium ${isSelected ? "text-emerald-900" : "text-gray-900"}`}>{cls.fullName}</h3>
                        {cls.subjects.length > 0 && (
                           <p className="text-sm text-gray-500 mt-1">{cls.subjects.join(" • ")}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center justify-center text-xs font-medium px-2.5 py-1 rounded-full ${isSelected ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700"}`}>
                           {cls.studentCount} {tx("dashboard.students", "Students")}
                        </span>
                      </div>
                    </div>
                  )})}
                </div>
             )}
          </CardContent>
        </Card>

        {/* Today's Attendance Summary */}
        <Card className="col-span-1 border-emerald-100/50 shadow-sm">
          <CardHeader className="bg-emerald-50/30 border-b border-emerald-100/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              {tx("dashboard.todaysAttendance", "Today's Attendance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             {data.assignedClasses.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  {tx("dashboard.noAssignedClasses", "No classes assigned yet.")}
                </div>
             ) : selectedClass ? (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-lg text-gray-900">{selectedClass.fullName}</h3>
                    {selectedClass.isPending ? (
                       <span className="inline-flex items-center text-amber-600 text-sm font-medium bg-amber-50 px-3 py-1 rounded-full">
                         <AlertTriangle className={`h-4 w-4 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
                         Pending
                       </span>
                    ) : (
                       <span className="inline-flex items-center text-emerald-600 text-sm font-medium bg-emerald-50 px-3 py-1 rounded-full">
                         <UserCheck className={`h-4 w-4 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
                         Marked
                       </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-100">
                      <div className="text-sm text-emerald-700 font-medium mb-1">P / L</div>
                      <div className="text-3xl font-bold text-emerald-900">{selectedClass.present}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center border border-red-100">
                      <div className="text-sm text-red-700 font-medium mb-1">Absent</div>
                      <div className="text-3xl font-bold text-red-900">{selectedClass.absent}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                      <div className="text-sm text-gray-600 font-medium mb-1">Total</div>
                      <div className="text-3xl font-bold text-gray-900">{selectedClass.studentCount}</div>
                    </div>
                  </div>
                </div>
             ) : (
                 <div className="p-6 text-center text-muted-foreground">
                   Select a class to view attendance.
                 </div>
             )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}


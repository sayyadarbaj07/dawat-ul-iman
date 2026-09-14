import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { BookOpen, Calendar, Clock, Award, Users, BookMarked, Briefcase, UserCheck } from "lucide-react";
import { classApi } from "@/lib/api";
import { formatLocalizedNumber, formatLocalizedPercent } from "@/utils/localizationUtils";

export function TeacherOverviewTab({ teacher }) {
  const { tr, language } = useLanguage();
  const [apiClasses, setApiClasses] = useState([]);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await classApi.getClasses();
        setApiClasses(res.data || []);
      } catch (err) {
        console.error("Failed to fetch classes:", err);
      }
    };
    loadClasses();
  }, []);

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { label: tr("teachers", "active") || "Active", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
      on_leave: { label: tr("teachers", "onLeave") || "On Leave", color: "bg-amber-100 text-amber-700 border-amber-200" },
      resigned: { label: tr("teachers", "resigned") || "Resigned", color: "bg-red-100 text-red-700 border-red-200" },
      inactive: { label: tr("teachers", "inactive") || "Inactive", color: "bg-slate-100 text-slate-700 border-slate-200" }
    };
    const s = statusMap[status] || statusMap.inactive;
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${s.color}`}>{s.label}</span>;
  };

  const getClassName = (id) => {
    const cls = apiClasses.find((c) => c._id === id || c.id === id);
    return cls ? cls.fullName : id.slice(-6).toUpperCase();
  };

  const canonicalClasses = teacher?.assignedClassIds?.length > 0
    ? teacher.assignedClassIds.map(id => getClassName(id)).join(", ")
    : teacher?.assignedClasses?.length > 0
      ? teacher.assignedClasses.join(", ")
      : teacher?.classesAssigned || "—";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Profile Summary */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              {tr("teacherProfile", "profileSummary") || "Profile Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "designation") || "Designation"}</div>
              <div className="font-medium">{teacher?.designation || "—"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "department") || "Department"}</div>
              <div className="font-medium">{teacher?.department || "—"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "primarySubject") || "Primary Subject"}</div>
              <div className="font-medium">{teacher?.subject || "—"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "status") || "Employment Status"}</div>
              <div>{getStatusBadge(teacher?.status)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "joiningDate") || "Joining Date"}</div>
              <div className="font-medium" dir="ltr">{teacher?.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : "—"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{tr("teachers", "experience") || "Experience"}</div>
              <div className="font-medium">
                {typeof teacher?.experience === 'number' 
                  ? `${teacher.experience} ${tr("common", "years") || "Years"}` 
                  : "—"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teaching Summary */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {tr("teacherProfile", "teachingSummary") || "Teaching Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border">
              <Users className="w-8 h-8 text-indigo-500 p-1.5 bg-indigo-100 rounded-md" />
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase">{tr("teachers", "classesAssigned") || "Assigned Classes"}</div>
                <div className="font-medium text-sm mt-0.5">{canonicalClasses}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border">
              <BookMarked className="w-8 h-8 text-amber-500 p-1.5 bg-amber-100 rounded-md" />
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase">{tr("teacherProfile", "classTeacherOf") || "Class Teacher Of"}</div>
                <div className="font-medium text-sm mt-0.5">
                  {teacher?.isClassTeacher && teacher?.classTeacherOf 
                    ? getClassName(teacher.classTeacherOf) 
                    : "—"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border">
                <Clock className="w-8 h-8 text-emerald-500 p-1.5 bg-emerald-100 rounded-md shrink-0" />
                <div>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">{tr("teachers", "weeklyPeriods") || "Weekly Periods"}</div>
                  <div className="font-bold text-base mt-0.5">{typeof teacher?.weeklyPeriods === 'number' ? formatLocalizedNumber(teacher.weeklyPeriods, language) : "—"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border">
                <Award className="w-8 h-8 text-blue-500 p-1.5 bg-blue-100 rounded-md shrink-0" />
                <div>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">{tr("teachers", "attendance") || "Attendance"}</div>
                  <div className="font-bold text-base mt-0.5">{typeof teacher?.attendancePercent === 'number' ? formatLocalizedPercent(teacher.attendancePercent, language) : "—"}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

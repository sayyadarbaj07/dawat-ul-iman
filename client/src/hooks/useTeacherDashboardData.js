import { useEffect, useState } from "react";
import {
  teacherApi,
  classApi,
  studentApi,
  attendanceApi,
  examApi,
} from "@/lib/api";
import { localISODate, startOfDay } from "./useDashboardData";
import { ROLE_PERMISSIONS } from "@/context/AuthContext";

function unwrap(result) {
  if (result.status !== "fulfilled" || result.value == null) return null;
  const value = result.value;
  if (Array.isArray(value)) return value;
  let unwrapped = value.data !== undefined ? value.data : value;
  if (unwrapped && unwrapped.data !== undefined && Array.isArray(unwrapped.data)) {
      return unwrapped.data;
  }
  return unwrapped;
}

export function useTeacherDashboardData(user) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const today = localISODate();

      try {
        const [meRes, classesRes, studentsRes, attendanceRes, examsRes] = await Promise.allSettled([
          teacherApi.getMe(),
          classApi.getClasses(),
          studentApi.list(),
          attendanceApi.getByDate(today, "Student"),
          examApi.listExams(),
        ]);

        if (cancelled) return;

        const teacher = unwrap(meRes);
        const classes = unwrap(classesRes) || [];
        const students = unwrap(studentsRes) || [];
        const attendance = unwrap(attendanceRes) || [];
        const exams = unwrap(examsRes) || [];

        const assignedClasses = [];
        let totalStudents = 0;
        let pendingAttendanceCount = 0;

        // Process Classes and Attendance
        if (teacher && teacher.assignedClassIds) {
          teacher.assignedClassIds.forEach((classId) => {
            const classDoc = classes.find(c => c._id === classId);
            if (!classDoc) return;

            const classStudents = students.filter(s => s.classId === classId && s.status !== "inactive");
            totalStudents += classStudents.length;

            const classAttendance = attendance.filter(a => a.classId === classId);
            const present = classAttendance.filter(a => a.status === "Present" || a.status === "Late").length;
            const absent = classAttendance.filter(a => a.status === "Absent").length;
            const late = classAttendance.filter(a => a.status === "Late").length;
            
            // Pending if no attendance marked for this class (or incomplete)
            // Let's assume if the attendance array for this class is empty, it's pending.
            const isPending = classStudents.length > 0 && classAttendance.length === 0;
            if (isPending) pendingAttendanceCount++;

            // Resolve teaching assignments for this class
            const assignments = teacher.teachingAssignments
              ?.filter(a => a.classId === classId)
              .map(a => a.subjectId) || [];

            assignedClasses.push({
              _id: classId,
              fullName: classDoc.fullName,
              studentCount: classStudents.length,
              present,
              absent,
              late,
              totalMarked: classAttendance.length,
              isPending,
              subjects: assignments
            });
          });
        }

        const todayStart = startOfDay(new Date());
        const upcomingExams = exams
          .filter((exam) => exam.date && startOfDay(exam.date) >= todayStart)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 5);

        setData({
          teacherName: teacher?.name || user?.name,
          assignedClasses,
          totalStudents,
          pendingAttendanceCount,
          upcomingExams,
          canAccess: (href) => Boolean(user?.role && ROLE_PERMISSIONS[user.role]?.includes(href)),
        });
        setLoading(false);

      } catch (e) {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { loading, data };
}

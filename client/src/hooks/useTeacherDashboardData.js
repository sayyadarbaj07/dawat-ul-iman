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

        // Use a Set to track unique students across all assigned classes
        const uniqueStudentIds = new Set();
        
        // Process Classes and Attendance
        if (teacher && teacher.assignedClassIds) {
          teacher.assignedClassIds.forEach((classId) => {
            const classDoc = classes.find(c => String(c._id) === String(classId));
            const className = classDoc ? classDoc.fullName : `Class ${classId.toString().substring(0,6)}...`;

            const classStudents = students.filter(s => {
              const studentClassId = s.classId && typeof s.classId === "object" ? s.classId._id : s.classId;
              return String(studentClassId) === String(classId) && s.status !== "inactive";
            });
            
            classStudents.forEach(s => {
              if (s._id) uniqueStudentIds.add(String(s._id));
            });

            const classAttendance = attendance.filter(a => {
               const attClassId = a.classId && typeof a.classId === "object" ? a.classId._id : a.classId;
               return String(attClassId) === String(classId);
            });
            const present = classAttendance.filter(a => a.status === "Present" || a.status === "Late").length;
            const absent = classAttendance.filter(a => a.status === "Absent").length;
            const late = classAttendance.filter(a => a.status === "Late").length;
            
            // Pending if no attendance marked for this class (or incomplete)
            // Let's assume if the attendance array for this class is empty, it's pending.
            const isPending = classStudents.length > 0 && classAttendance.length === 0;
            if (isPending) pendingAttendanceCount++;

            // Resolve teaching assignments for this class
            const assignments = teacher.teachingAssignments
              ?.filter(a => String(a.classId) === String(classId))
              .map(a => a.subjectId) || [];

            assignedClasses.push({
              _id: classId,
              fullName: className,
              studentCount: classStudents.length,
              present,
              absent,
              late,
              totalMarked: classAttendance.length,
              isPending,
              subjects: assignments
            });
          });
          totalStudents = uniqueStudentIds.size;
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

import { useEffect, useState } from "react";
import {
  studentApi,
  teacherApi,
  attendanceApi,
  examApi,
  financeApi,
  eventApi,
  activityLogApi,
  meetingApi,
  reportApi,
} from "@/lib/api";
import { ROLE_PERMISSIONS } from "@/context/AuthContext";

export const CLASS_KEYS = ["diniyat", "arabic", "contemporary"];

export function localISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function daysFromToday(value) {
  const diff = startOfDay(value).getTime() - startOfDay(new Date()).getTime();
  return Math.round(diff / 86400000);
}

export function formatRs(amount) {
  const n = Number(amount) || 0;
  return `Rs ${n.toLocaleString()}`;
}

function unwrap(result) {
  if (result.status !== "fulfilled" || result.value == null) return null;
  const value = result.value;
  if (Array.isArray(value)) return value;
  if (value.data !== undefined) return value.data;
  return value;
}

function monthSparkline(items, getDate) {
  const now = new Date();
  const series = [];
  for (let i = 5; i >= 0; i -= 1) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const count = items.filter((item) => {
      const date = getDate(item);
      if (!date || Number.isNaN(date.getTime())) return false;
      return (
        date.getMonth() === cursor.getMonth() &&
        date.getFullYear() === cursor.getFullYear()
      );
    }).length;
    series.push(count);
  }
  return series.some((n) => n > 0) ? series : [];
}

function financeMonthChart(transactions) {
  const monthlyData = {};
  transactions.forEach((tx) => {
    const d = new Date(tx.date);
    if (Number.isNaN(d.getTime())) return;
    const name = `${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;
    if (!monthlyData[name]) {
      monthlyData[name] = { name, income: 0, expense: 0, sortKey: d.getTime() };
    }
    if (tx.type === "income") monthlyData[name].income += Number(tx.amount) || 0;
    if (tx.type === "expense") monthlyData[name].expense += Number(tx.amount) || 0;
  });
  return Object.values(monthlyData).sort((a, b) => a.sortKey - b.sortKey);
}

function isPresentStatus(status) {
  return status === "Present" || status === "Late";
}

export function useDashboardData(user) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const role = user?.role;

    async function load() {
      // PHASE 1: Critical Data (Stats, Attendance, Quick Actions)
      setLoading(true);
      const today = localISODate();

      try {
        const [studentRes, teacherRes, attendanceRes, reportRes] = await Promise.allSettled([
          studentApi.list(),
          teacherApi.list(),
          attendanceApi.getByDate(today, "Student"),
          reportApi.getSummary(),
        ]);

        if (cancelled) return;

        const students = unwrap(studentRes) || [];
        const teachers = unwrap(teacherRes) || [];
        const attendance = unwrap(attendanceRes) || [];
        const reportSummary = unwrap(reportRes);

        const studentListOk = studentRes.status === "fulfilled";
        const teacherListOk = teacherRes.status === "fulfilled";
        const attendanceOk = attendanceRes.status === "fulfilled";

        const activeStudents = students.filter((s) => s.status !== "inactive");
        const now = new Date();
        const admittedThisMonth = activeStudents.filter((s) => {
          if (!s.admissionDate) return false;
          const d = new Date(s.admissionDate);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;

        const presentToday = attendance.filter((r) => isPresentStatus(r.status)).length;
        const absentToday = attendance.filter((r) => r.status === "Absent").length;
        const lateToday = attendance.filter((r) => r.status === "Late").length;
        const enrolled = activeStudents.length || 0;
        const attendancePercent =
          attendance.length > 0 && enrolled > 0
            ? Math.round((presentToday / enrolled) * 100)
            : attendance.length > 0
              ? Math.round((presentToday / attendance.length) * 100)
              : null;

        const classAttendance = CLASS_KEYS.map((key) => {
          const classEnrolled = activeStudents.filter((s) => s.className === key);
          const records = attendance.filter((r) => r.className === key);
          const present = records.filter((r) => isPresentStatus(r.status)).length;
          const absent = records.filter((r) => r.status === "Absent").length;
          const late = records.filter((r) => r.status === "Late").length;
          const total = classEnrolled.length || records.length;
          const percent = total > 0 ? Math.round((present / (classEnrolled.length || total)) * 100) : 0;
          return {
            key,
            enrolled: classEnrolled.length,
            present,
            absent,
            late,
            percent,
            hasRecords: records.length > 0,
          };
        });

        const studentMix = CLASS_KEYS.map((key) => ({
          key,
          value: activeStudents.filter((s) => s.className === key).length,
        })).filter((row) => row.value > 0);

        const residential = activeStudents.filter((s) => s.residential).length;
        const dayScholars = Math.max(activeStudents.length - residential, 0);

        const studentCount = studentListOk ? activeStudents.length : reportSummary?.totalStudents ?? null;
        const teacherCount = teacherListOk ? teachers.length : reportSummary?.totalTeachers ?? null;

        // Partially set critical data and finish main loading
        setData({
          studentCount,
          teacherCount,
          admittedThisMonth: studentListOk ? admittedThisMonth : null,
          studentSpark: studentListOk
            ? monthSparkline(activeStudents, (s) => (s.admissionDate ? new Date(s.admissionDate) : null))
            : [],
          attendance: {
            present: presentToday,
            absent: absentToday,
            late: lateToday,
            enrolled,
            percent: attendancePercent,
            marked: attendanceOk && attendance.length > 0,
            classes: classAttendance,
          },
          attendanceOk,
          studentListOk,
          studentMix,
          residential,
          dayScholars,
          canAccess: (href) => Boolean(role && ROLE_PERMISSIONS[role]?.includes(href)),
          // Stubs for secondary data
          upcomingExams: [],
          examsOk: false,
          nextEvent: null,
          eventsOk: false,
          weekAlerts: [],
          canShowFinance: false,
          balance: null,
          financeChart: [],
          recentTransactions: [],
          financeListOk: false,
          activityLogs: [],
          logsOk: false,
          upcomingMeetings: [],
          meetingsOk: false,
        });
        setLoading(false);

        // PHASE 2: Secondary Data (Finance, Exams, Events, Logs)
        const [financeRes, financeSumRes, examRes, eventRes, logRes, meetingRes] = await Promise.allSettled([
          financeApi.list(),
          financeApi.summary(),
          examApi.listExams(),
          eventApi.list(),
          role === "admin" ? activityLogApi.list() : Promise.resolve({ data: [] }),
          meetingApi.list(),
        ]);

        if (cancelled) return;

        const transactions = unwrap(financeRes) || [];
        const financeSummary = unwrap(financeSumRes);
        const exams = unwrap(examRes) || [];
        const events = unwrap(eventRes) || [];
        const logs = unwrap(logRes) || [];
        const meetings = unwrap(meetingRes) || [];

        const financeListOk = financeRes.status === "fulfilled";
        const financeSummaryOk = financeSumRes.status === "fulfilled";
        const examsOk = examRes.status === "fulfilled";
        const eventsOk = eventRes.status === "fulfilled";
        const logsOk = role === "admin" && logRes.status === "fulfilled";
        const meetingsOk = meetingRes.status === "fulfilled";

        const todayStart = startOfDay(new Date());
        const upcomingExams = exams
          .filter((exam) => exam.date && startOfDay(exam.date) >= todayStart)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 5);

        const futureEvents = events
          .filter((event) => event.date && startOfDay(event.date) >= todayStart)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        const nextBazm = futureEvents.find((event) => event.type === "bazm");
        const nextEvent = nextBazm || futureEvents[0] || null;

        const weekAhead = new Date(todayStart);
        weekAhead.setDate(weekAhead.getDate() + 7);
        const weekAlerts = [
          ...upcomingExams.map((exam) => ({
            id: exam._id,
            kind: "exam",
            title: exam.name,
            date: exam.date,
            href: "/exams",
          })),
          ...futureEvents
            .filter((event) => startOfDay(event.date) <= weekAhead)
            .map((event) => ({
              id: event._id,
              kind: event.type || "event",
              title: event.title,
              date: event.date,
              href: "/calendar",
            })),
        ]
          .filter((item) => startOfDay(item.date) <= weekAhead)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 8);

        const incomeTotal = financeListOk
          ? transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
          : financeSummary?.totalIncome ?? reportSummary?.finance?.totalIncome ?? null;

        const expenseTotal = financeListOk
          ? transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
          : financeSummary?.totalExpense ?? reportSummary?.finance?.totalExpenses ?? null;

        const balance = financeListOk
          ? incomeTotal - expenseTotal
          : financeSummary?.currentBalance ?? reportSummary?.finance?.balance ?? null;

        setData((prev) => ({
          ...prev,
          upcomingExams,
          examsOk,
          nextEvent,
          eventsOk,
          weekAlerts,
          canShowFinance: financeListOk || financeSummaryOk,
          balance,
          financeChart: financeListOk ? financeMonthChart(transactions) : [],
          recentTransactions: financeListOk ? transactions.slice(0, 5) : [],
          financeListOk,
          activityLogs: logsOk ? logs.slice(0, 6) : [],
          logsOk,
          upcomingMeetings: meetingsOk
            ? meetings.filter((m) => m.status !== "Completed" && m.status !== "Cancelled").slice(0, 5)
            : [],
          meetingsOk,
        }));
      } catch (e) {
        // Fallback catch
      }
    }

    load().catch(() => {
      if (!cancelled) {
        setData(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  return { loading, data };
}

import { useEffect, useState } from "react";
import { examApi, eventApi } from "@/lib/api";
import { daysFromToday, startOfDay } from "./useDashboardData";

export function useUpcomingAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const results = await Promise.allSettled([
        examApi.listExams(),
        eventApi.list(),
      ]);
      if (cancelled) return;

      const exams =
        results[0].status === "fulfilled" ? results[0].value?.data || [] : [];
      const events =
        results[1].status === "fulfilled" ? results[1].value?.data || [] : [];

      const today = startOfDay(new Date());
      const weekAhead = new Date(today);
      weekAhead.setDate(weekAhead.getDate() + 7);

      const items = [
        ...exams
          .filter((exam) => exam.date && startOfDay(exam.date) >= today && startOfDay(exam.date) <= weekAhead)
          .map((exam) => ({
            id: `exam-${exam._id}`,
            title: exam.name,
            date: exam.date,
            href: "/exams",
            kind: "exam",
            days: daysFromToday(exam.date),
          })),
        ...events
          .filter((event) => event.date && startOfDay(event.date) >= today && startOfDay(event.date) <= weekAhead)
          .map((event) => ({
            id: `event-${event._id}`,
            title: event.title,
            date: event.date,
            href: "/calendar",
            kind: event.type || "event",
            days: daysFromToday(event.date),
          })),
      ].sort((a, b) => new Date(a.date) - new Date(b.date));

      setAlerts(items);
      setLoading(false);
    }

    load().catch(() => {
      if (!cancelled) {
        setAlerts([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { alerts, loading };
}

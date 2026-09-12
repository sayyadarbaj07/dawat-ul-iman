import React from "react";
import { useAuth } from "@/context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import TeacherDashboard from "./TeacherDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  
  if (user?.role === "teacher") {
    return <TeacherDashboard />;
  }
  
  return <AdminDashboard />;
}

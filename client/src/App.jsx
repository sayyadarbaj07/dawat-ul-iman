import {
  Switch,
  Route,
  Router as WouterRouter,
  useLocation,
  Redirect,
} from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import { AuthProvider, useAuth, ROLE_PERMISSIONS } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { LanguageProvider } from "@/context/LanguageContext";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import Promotions from "@/pages/Promotions";
import Teachers from "@/pages/Teachers";
import Employees from "@/pages/Employees";
import EmployeeAttendance from "@/pages/EmployeeAttendance";
import Curriculum from "@/pages/Curriculum";
import StudentProfile from "@/pages/StudentProfile";
import TeacherProfile from "@/pages/TeacherProfile";
import Attendance from "./pages/Attendance";
import Exams from "@/pages/Exams";
import Finance from "@/pages/Finance";
import ReserveFund from "@/pages/ReserveFund";
import Hostel from "@/pages/Hostel";
import Activities from "@/pages/Activities";
import Meetings from "@/pages/Meetings";
import CalendarPage from "./pages/CalendarPage";
import Reports from "@/pages/Reports";
import UsersManagement from "@/pages/UsersManagement";
import SystemLogs from "@/pages/SystemLogs";
import ForceChangePassword from "@/pages/ForceChangePassword";
import InstituteSettings from "@/pages/InstituteSettings";
import Classes from "@/pages/Classes";
import ClassAttendanceOverview from "@/pages/ClassAttendanceOverview";
import ClassAttendanceDetail from "@/pages/ClassAttendanceDetail";
import DataResolution from "@/pages/DataResolution";
import Payroll from "@/pages/Payroll";
import ExamMappingPage from "@/pages/ExamMappingPage";

import NotFound from "@/pages/not-found";
const queryClient = new QueryClient();
function ProtectedRoute({ path, component: Component }) {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  if (!isAuthenticated) return <Redirect to="/login" />;
  
  let allowed = false;
  if (user) {
    if (user.role === "admin") {
      allowed = true;
    } else {
      const allowedPaths = ROLE_PERMISSIONS[user.role] || [];
      allowed = allowedPaths.some(p => location === p || (p !== "/" && location.startsWith(p)));
    }
  }

  if (!allowed) {
    const fallbackPath = user && ROLE_PERMISSIONS[user.role]?.length > 0 ? ROLE_PERMISSIONS[user.role][0] : "/login";
    return <Redirect to={fallbackPath} />;
  }
  return <Route path={path} component={Component} />;
}
function Router() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  if (user?.mustChangePassword) {
    return (
      <Switch>
        <Route component={ForceChangePassword} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        <Redirect to="/" />
      </Route>

      {/* Main App Routes wrapped in Layout */}
      <Route>
        <Layout>
          <Switch>
            <ProtectedRoute path="/" component={Dashboard} />
            <ProtectedRoute path="/students" component={Students} />
            <ProtectedRoute path="/students/:studentId" component={StudentProfile} />
            <ProtectedRoute path="/promotions" component={Promotions} />
            <ProtectedRoute path="/teachers" component={Teachers} />
            <ProtectedRoute path="/teachers/:teacherId" component={TeacherProfile} />
            <ProtectedRoute path="/employees" component={Employees} />
            <ProtectedRoute path="/employee-attendance" component={EmployeeAttendance} />
            <ProtectedRoute path="/curriculum" component={Curriculum} />
            <ProtectedRoute path="/attendance" component={Attendance} />
            <ProtectedRoute path="/exams" component={Exams} />
            <ProtectedRoute path="/finance" component={Finance} />
            <ProtectedRoute path="/reserve-fund" component={ReserveFund} />
            <ProtectedRoute path="/hostel" component={Hostel} />
            <ProtectedRoute path="/activities" component={Activities} />
            <ProtectedRoute path="/meetings" component={Meetings} />
            <ProtectedRoute path="/calendar" component={CalendarPage} />
            <ProtectedRoute path="/reports" component={Reports} />
            <ProtectedRoute path="/users" component={UsersManagement} />
            <ProtectedRoute path="/audit" component={SystemLogs} />
            <ProtectedRoute path="/settings" component={InstituteSettings} />
            <ProtectedRoute path="/classes" component={Classes} />
            <ProtectedRoute path="/class-attendance" component={ClassAttendanceOverview} />
            <ProtectedRoute path="/class-attendance/:classId" component={ClassAttendanceDetail} />
            <ProtectedRoute path="/data-resolution" component={DataResolution} />
            <ProtectedRoute path="/payroll" component={Payroll} />
            <ProtectedRoute path="/admin/exam-mapping" component={ExamMappingPage} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SettingsProvider>
            <LanguageProvider>
              <WouterRouter
                base={(import.meta.env?.BASE_URL || "").replace(/\/$/, "")}
              >
                <Router />
              </WouterRouter>
            </LanguageProvider>
          </SettingsProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
export default App;

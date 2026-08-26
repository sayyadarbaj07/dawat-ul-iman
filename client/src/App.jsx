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
import Teachers from "@/pages/Teachers";
import Curriculum from "@/pages/Curriculum";
import Attendance from "./pages/Attendance";
import Exams from "@/pages/Exams";
import Finance from "@/pages/Finance";
import Hostel from "@/pages/Hostel";
import Activities from "@/pages/Activities";
import Meetings from "@/pages/Meetings";
import CalendarPage from "./pages/CalendarPage";
import Reports from "@/pages/Reports";
import UsersManagement from "@/pages/UsersManagement";
import SystemLogs from "@/pages/SystemLogs";
import ForceChangePassword from "@/pages/ForceChangePassword";
import InstituteSettings from "@/pages/InstituteSettings";

import NotFound from "@/pages/not-found";
const queryClient = new QueryClient();
function ProtectedRoute({ path, component: Component }) {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  if (!isAuthenticated) return <Redirect to="/login" />;
  const allowed = user ? ROLE_PERMISSIONS[user.role].includes(location) : false;
  if (!allowed) return <Redirect to="/" />;
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
            <Route path="/" component={Dashboard} />
            <Route path="/students" component={Students} />
            <Route path="/teachers" component={Teachers} />
            <Route path="/curriculum" component={Curriculum} />
            <Route path="/attendance" component={Attendance} />
            <Route path="/exams" component={Exams} />
            <Route path="/finance" component={Finance} />
            <Route path="/hostel" component={Hostel} />
            <Route path="/activities" component={Activities} />
            <Route path="/meetings" component={Meetings} />
            <Route path="/calendar" component={CalendarPage} />
            <Route path="/reports" component={Reports} />
            <Route path="/users" component={UsersManagement} />
            <Route path="/audit" component={SystemLogs} />
            <Route path="/settings" component={InstituteSettings} />
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

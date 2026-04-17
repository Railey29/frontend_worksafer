import { GoogleOAuthProvider } from "@react-oauth/google";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./components/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "../src/components/ui/toaster";
import { TooltipProvider } from "../src/components/ui/tooltip";
import Navigation from "../src/components/layout/navigation";
import Dashboard from "../src/pages/dashboard";
import IncidentReport from "../src/pages/incident-report";
import Reports from "../src/pages/reports";
import ArchivedReports from "../src/pages/archived-reports";
import Analytics from "../src/pages/analytics";
import Compliance from "../src/pages/compliance";
import UserProfile from "../src/pages/user-profile";
import AuditLogs from "../src/pages/audit-logs";
import Notifications from "../src/pages/notifications";
import Login from "../src/pages/login";
import Registration from "../src/pages/registration";
import HRDashboard from "../src/pages/hr-dashboard";
import FieldDashboard from "../src/pages/field-dashboard";
import QualityDashboard from "../src/pages/quality-dashboard";
import EnvironmentalDashboard from "../src/pages/environmental-dashboard";
import NotFound from "../src/pages/not-found";
import ReportDetail from "../src/pages/report-detail";
import { getStoredUser } from "./utils/user";

function Router() {
  const [location] = useLocation();
  const user = getStoredUser();

  // ✅ Handle public routes first (login, register)
  if (location === "/login") {
    return <Login />;
  }

  if (location === "/register") {
    return <Registration />;
  }

  // ✅ If user not logged in, redirect to login
  if (!user) {
    return <Login />;
  }

  // ✅ Authenticated routes
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/hr-dashboard" component={HRDashboard} />
        <Route path="/field-dashboard" component={FieldDashboard} />
        <Route path="/quality-dashboard" component={QualityDashboard} />
        <Route
          path="/environmental-dashboard"
          component={EnvironmentalDashboard}
        />
        <Route path="/incident-report" component={IncidentReport} />
        <Route path="/reports/:id" component={ReportDetail} />
        <Route path="/reports" component={Reports} />
        <Route path="/archived-reports" component={ArchivedReports} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/compliance" component={Compliance} />
        <Route path="/user-profile" component={UserProfile} />
        <Route path="/audit-logs" component={AuditLogs} />
        <Route path="/notifications" component={Notifications} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId="609775986703-3mdih863emnqm8qc7utkfb3jkdoghgg4.apps.googleusercontent.com">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

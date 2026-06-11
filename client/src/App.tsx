import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import ContentQueue from "./pages/ContentQueue";
import ContentCalendar from "./pages/ContentCalendar";
import ContentLibrary from "./pages/ContentLibrary";
import AIGenerator from "./pages/AIGenerator";
import Analytics from "./pages/Analytics";
import HeyGen from "./pages/HeyGen";
import Platforms from "./pages/Platforms";
import Schedules from "./pages/Schedules";
import Clients from "./pages/Clients";
import BrandBrain from "./pages/BrandBrain";
import Brainstorm from "./pages/Brainstorm";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Settings from "./pages/Settings";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={Clients} />
        <Route path="/brand" component={BrandBrain} />
        <Route path="/brainstorm" component={Brainstorm} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/campaigns/:id" component={CampaignDetail} />
        <Route path="/queue" component={ContentQueue} />
        <Route path="/calendar" component={ContentCalendar} />
        <Route path="/library" component={ContentLibrary} />
        <Route path="/generate" component={AIGenerator} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={Settings} />
        <Route path="/heygen" component={HeyGen} />
        <Route path="/platforms" component={Platforms} />
        <Route path="/schedules" component={Schedules} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster position="bottom-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

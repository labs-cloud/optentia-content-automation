import { useAuth } from "@/_core/hooks/useAuth";
import { ActiveClientProvider, useActiveClient } from "@/contexts/ActiveClientContext";
import { useIsMobile } from "@/hooks/useMobile";
import { useClerk, useUser } from "@clerk/clerk-react";
import {
  BarChart3,
  Brain,
  Briefcase,
  Clapperboard,
  FolderOpen,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Timer,
  Wifi,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import { BottomNav } from "./BottomNav";
import { ClientSwitcher } from "./ClientSwitcher";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { FloatingActionButton } from "./FloatingActionButton";
import { FloatingDock } from "./FloatingDock";
import { Landing } from "./Landing";
import { Onboarding } from "./Onboarding";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/** Routes that aren't on the mobile bottom tab bar — reachable via the top menu. */
const moreRoutes = [
  { icon: Briefcase, label: "Clients", path: "/clients" },
  { icon: Brain, label: "Brand Brain", path: "/brand" },
  { icon: Sparkles, label: "AI Generator", path: "/generate" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: FolderOpen, label: "Content Library", path: "/library" },
  { icon: Wifi, label: "Platforms", path: "/platforms" },
  { icon: Timer, label: "Schedules", path: "/schedules" },
  { icon: Clapperboard, label: "HeyGen Videos", path: "/heygen" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, error } = useAuth();
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  // Wait for Clerk to load before deciding what to render.
  if (!isLoaded || loading) return <DashboardLayoutSkeleton />;

  // Not signed in — show the branded landing page (sign-in lives behind its CTA).
  if (!isSignedIn) {
    return <Landing />;
  }

  // Signed in to Clerk but the backend couldn't load the user.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 space-y-4 text-center backdrop-blur-md">
          <h2 className="text-lg font-semibold">We couldn't load your profile</h2>
          <p className="text-sm text-muted-foreground">
            You're signed in with Clerk, but the server isn't responding. This usually means an API
            deploy is in a bad state. Try signing out and back in once a fix is deployed.
          </p>
          {error ? (
            <p className="text-xs text-destructive font-mono break-all">
              {String(error.message ?? error)}
            </p>
          ) : null}
          <Button onClick={() => signOut({ redirectUrl: "/" })} variant="destructive">
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ActiveClientProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </ActiveClientProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { clients, isLoading: clientsLoading } = useActiveClient();

  // First-run: signed in but no client workspaces yet → guided onboarding.
  if (!clientsLoading && clients.length === 0) {
    return <Onboarding />;
  }

  if (isMobile) {
    return (
      <div className="min-h-screen">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-[var(--surface)] px-4 backdrop-blur-xl">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 min-w-0"
            aria-label="Content Operator home"
          >
            <span className="ai-grad flex h-7 w-7 items-center justify-center rounded-lg">
              <Zap className="h-4 w-4 text-white" />
            </span>
            <span className="font-display font-semibold text-sm truncate">Content Operator</span>
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ClientSwitcher compact />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/60 text-muted-foreground"
                  aria-label="More"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  More
                </DropdownMenuLabel>
                {moreRoutes.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    className="cursor-pointer gap-2"
                    onClick={() => setLocation(item.path)}
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{item.label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="pb-24">{children}</main>
        <BottomNav />
        <FloatingActionButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Desktop top-right user controls */}
      <div className="fixed right-5 top-5 z-40">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-full border border-border bg-[var(--surface)] py-1 pl-1 pr-3 backdrop-blur-xl transition-colors hover:bg-[var(--surface-2)] focus:outline-none"
              aria-label="Account"
            >
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {user?.name?.charAt(0).toUpperCase() ?? "O"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium max-w-[140px] truncate">
                {user?.name || "Owner"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium truncate">{user?.name || "Owner"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Floating-dock layout — full-width content, dock clears the bottom. */}
      <main className="min-h-screen pb-[132px]">{children}</main>
      <FloatingDock />
    </div>
  );
}

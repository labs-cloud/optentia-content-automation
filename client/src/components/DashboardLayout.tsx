import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { ActiveClientProvider, useClientScope } from "@/contexts/ActiveClientContext";
import { SignIn, useClerk, useUser } from "@clerk/clerk-react";
import {
  BarChart3,
  Brain,
  Briefcase,
  CalendarDays,
  CheckSquare,
  Clapperboard,
  FolderOpen,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Megaphone,
  PanelLeft,
  Sparkles,
  Timer,
  Wifi,
  Zap,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { BottomNav } from "./BottomNav";
import { ClientSwitcher } from "./ClientSwitcher";
import { FloatingActionButton } from "./FloatingActionButton";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { trpc } from "@/lib/trpc";

type MenuItem = { icon: typeof LayoutDashboard; label: string; path: string; badge?: "pending" };

const menuGroups: Array<{ label: string | null; items: MenuItem[] }> = [
  {
    label: null,
    items: [{ icon: LayoutDashboard, label: "Home", path: "/" }],
  },
  {
    label: "Workspace",
    items: [
      { icon: Briefcase, label: "Clients", path: "/clients" },
      { icon: Brain, label: "Brand Brain", path: "/brand" },
    ],
  },
  {
    label: "Create",
    items: [
      { icon: Lightbulb, label: "Brainstorm", path: "/brainstorm" },
      { icon: Megaphone, label: "Campaigns", path: "/campaigns" },
      { icon: Sparkles, label: "AI Generator", path: "/generate" },
    ],
  },
  {
    label: "Operate",
    items: [
      { icon: CheckSquare, label: "Content Queue", path: "/queue", badge: "pending" },
      { icon: CalendarDays, label: "Calendar", path: "/calendar" },
      { icon: FolderOpen, label: "Content Library", path: "/library" },
      { icon: BarChart3, label: "Analytics", path: "/analytics" },
    ],
  },
  {
    label: "Channels",
    items: [
      { icon: Wifi, label: "Platforms", path: "/platforms" },
      { icon: Timer, label: "Schedules", path: "/schedules" },
      { icon: Clapperboard, label: "HeyGen Videos", path: "/heygen" },
    ],
  },
];

const allMenuItems = menuGroups.flatMap((g) => g.items);

const SIDEBAR_WIDTH_KEY = "optentia-sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 320;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, error } = useAuth();
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Wait for Clerk to load before deciding what to render.
  if (!isLoaded || loading) return <DashboardLayoutSkeleton />;

  // Not signed in to Clerk yet — show the SignIn UI. Only render this when
  // Clerk reports no session, otherwise <SignIn> auto-redirects and we loop.
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <SignIn routing="hash" signUpUrl="#/sign-up" />
      </div>
    );
  }

  // Signed in to Clerk but the backend couldn't load the user (likely a 500 from
  // /api/trpc/auth.me). Show a recoverable error instead of looping into SignIn.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-lg border border-border/50 bg-card p-6 space-y-4 text-center">
          <h2 className="text-lg font-semibold">We couldn't load your profile</h2>
          <p className="text-sm text-muted-foreground">
            You're signed in with Clerk, but the server isn't responding. This usually means an
            API deploy is in a bad state. Try signing out and back in once a fix is deployed.
          </p>
          {error ? (
            <p className="text-xs text-destructive font-mono break-all">{String(error.message ?? error)}</p>
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
      <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
        <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
          {children}
        </DashboardLayoutContent>
      </SidebarProvider>
    </ActiveClientProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const activeMenuItem = allMenuItems.find((item) => item.path === location);
  const { clientId, enabled } = useClientScope();

  const { data: summary } = trpc.analytics.summary.useQuery(
    { clientId },
    { refetchInterval: 30000, enabled },
  );

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-border/50" disableTransition={isResizing}>
          {/* Logo */}
          <SidebarHeader className="h-14 justify-center border-b border-border/50">
            <div className="flex items-center gap-3 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                {isCollapsed ? (
                  <Zap className="h-5 w-5 text-primary" />
                ) : (
                  <PanelLeft className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <Zap className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-display font-bold text-base tracking-tight truncate">
                    Content Operator
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="gap-0 py-3">
            {/* Active client workspace */}
            <div className="px-2 pb-3">
              <ClientSwitcher compact={isCollapsed} />
            </div>
            {menuGroups.map((group, gi) => (
              <div key={group.label ?? gi}>
                {group.label && !isCollapsed && (
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {group.label}
                  </p>
                )}
                <SidebarMenu className="px-2 gap-0.5">
                  {group.items.map((item) => {
                    const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                    const pendingCount = item.badge === "pending" ? (summary?.pending ?? 0) : 0;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 transition-all font-normal rounded-lg ${
                            isActive
                              ? "bg-primary/10 text-primary hover:bg-primary/15"
                              : "hover:bg-accent/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                          <span className="text-sm">{item.label}</span>
                          {pendingCount > 0 && !isCollapsed && (
                            <Badge className="ml-auto h-5 min-w-5 px-1 text-xs bg-primary/20 text-primary border-0">
                              {pendingCount}
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            ))}
          </SidebarContent>

          {/* User Footer */}
          <SidebarFooter className="p-3 border-t border-border/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase() ?? "O"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-none">{user?.name || "Owner"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">{user?.email || ""}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors"
            style={{ zIndex: 50 }}
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      <SidebarInset className="bg-background">
        {isMobile && (
          <div className="flex border-b border-border/50 h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="h-8 w-8 rounded-lg" />
              <span className="font-medium text-sm truncate">{activeMenuItem?.label ?? "Content Operator"}</span>
            </div>
            <ClientSwitcher compact />
          </div>
        )}
        <main className={`flex-1 min-h-screen ${isMobile ? "pb-24" : ""}`}>{children}</main>
        {isMobile && (
          <>
            <BottomNav />
            <FloatingActionButton />
          </>
        )}
      </SidebarInset>
    </>
  );
}

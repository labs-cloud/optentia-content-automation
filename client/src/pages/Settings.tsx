import { PageHeader } from "@/components/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { useActiveClient } from "@/contexts/ActiveClientContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { CONTENT_PILLARS, PLATFORM_CONFIG, type Platform } from "@/lib/platformUtils";
import {
  Building2,
  Check,
  CreditCard,
  LogOut,
  Moon,
  Palette,
  Sliders,
  Sun,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/** Tiny localStorage-backed state for preferences without a backend table yet. */
function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}

const DEFAULT_PLATFORMS: Platform[] = ["instagram", "linkedin", "facebook"];
const PLATFORM_CHOICES: Platform[] = [
  "instagram",
  "linkedin",
  "facebook",
  "youtube",
  "email",
  "whatsapp",
];

export default function Settings() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { activeClient } = useActiveClient();

  const [workspaceName, setWorkspaceName] = usePersistedState("co-workspace-name", "My workspace");
  const [defaultPillar, setDefaultPillar] = usePersistedState(
    "co-default-pillar",
    CONTENT_PILLARS[1].value,
  );
  const [defaultPlatforms, setDefaultPlatforms] = usePersistedState<Platform[]>(
    "co-default-platforms",
    DEFAULT_PLATFORMS,
  );

  const togglePlatform = (p: Platform) =>
    setDefaultPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );

  return (
    <div className="container py-6 sm:py-8 max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        pill="Appearance, account, and content defaults"
      />

      {/* Appearance */}
      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" /> Appearance
          </CardTitle>
          <CardDescription>Frosted Vapor ships as a matched light/dark pair.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            {theme === "dark" ? (
              <Moon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Sun className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium">Frosted Vapor · {theme === "dark" ? "Dark" : "Light"}</span>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Account
          </CardTitle>
          <CardDescription>Your operator profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={user?.name ?? ""} readOnly className="rounded-xl bg-muted/40" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} readOnly className="rounded-xl bg-muted/40" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Name and email are managed by your sign-in provider.
          </p>
          <Button
            variant="outline"
            className="rounded-xl text-destructive hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-1.5" /> Sign out
          </Button>
        </CardContent>
      </Card>

      {/* Client defaults */}
      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" /> Client defaults
          </CardTitle>
          <CardDescription>
            Applied as the starting point when you create content
            {activeClient ? ` for ${activeClient.name}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Default content pillar</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONTENT_PILLARS.map((p) => {
                const active = defaultPillar === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setDefaultPillar(p.value)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card/40 hover:bg-accent/50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{p.label}</span>
                      {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default platforms</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_CHOICES.map((p) => {
                const active = defaultPlatforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card/40 text-muted-foreground hover:bg-accent/50",
                    )}
                  >
                    <span>{PLATFORM_CONFIG[p].icon}</span>
                    {PLATFORM_CONFIG[p].label}
                    {active && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace / billing */}
      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Workspace
          </CardTitle>
          <CardDescription>Your operator workspace and plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Workspace name</Label>
            <div className="flex gap-2">
              <Input
                id="ws-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="rounded-xl"
              />
              <Button
                variant="outline"
                className="rounded-xl shrink-0"
                onClick={() => toast.success("Workspace name saved")}
              >
                Save
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/40 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Operator plan</p>
                <p className="text-xs text-muted-foreground">Billing isn't connected yet.</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-xl" disabled>
              Manage billing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

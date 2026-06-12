import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PLATFORM_CONFIG, isManualPlatform } from "@/lib/platformUtils";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClientContext";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Briefcase, CheckCircle2, Loader2, Settings, WifiOff, Zap } from "lucide-react";
import { useLocation } from "wouter";

type Platform = "instagram" | "linkedin_personal" | "linkedin_company" | "facebook" | "youtube" | "email" | "whatsapp";
type CredentialPlatform = Exclude<Platform, "email" | "whatsapp">;

const PLATFORM_HELP: Record<CredentialPlatform, { fields: { key: string; label: string; placeholder: string; type?: string }[]; guide: string }> = {
  instagram: {
    fields: [
      { key: "accountName", label: "Account Name", placeholder: "@yourhandle" },
      { key: "accessToken", label: "Access Token", placeholder: "Instagram Graph API access token", type: "password" },
      { key: "accountId", label: "Instagram Business Account ID", placeholder: "17841400000000000" },
    ],
    guide: "Requires a Facebook Business account with Instagram connected. Get your access token from Meta Developer Portal.",
  },
  linkedin_personal: {
    fields: [
      { key: "accountName", label: "Profile Name", placeholder: "Your Name" },
      { key: "accessToken", label: "Access Token", placeholder: "LinkedIn OAuth 2.0 access token", type: "password" },
      { key: "accountId", label: "Person URN", placeholder: "urn:li:person:XXXXXXXXXX" },
    ],
    guide: "Personal LinkedIn profile posting. Requires w_member_social scope. Token is pre-configured from your LinkedIn Developer App.",
  },
  linkedin_company: {
    fields: [
      { key: "accountName", label: "Company Name", placeholder: "Company name" },
      { key: "accessToken", label: "Access Token", placeholder: "LinkedIn OAuth 2.0 access token", type: "password" },
      { key: "accountId", label: "Organization URN", placeholder: "urn:li:organization:12345678" },
    ],
    guide: "Company page posting. Requires w_organization_social scope. The token must belong to an admin of the company page.",
  },
  facebook: {
    fields: [
      { key: "accountName", label: "Page Name", placeholder: "Page name" },
      { key: "accessToken", label: "Page Access Token", placeholder: "Facebook Page access token", type: "password" },
      { key: "pageId", label: "Page ID", placeholder: "123456789012345" },
    ],
    guide: "Get a Page Access Token from Meta Developer Portal. Requires manage_pages and publish_pages permissions.",
  },
  youtube: {
    fields: [
      { key: "accountName", label: "Channel Name", placeholder: "Channel name" },
      { key: "accessToken", label: "OAuth Access Token", placeholder: "YouTube Data API v3 access token", type: "password" },
      { key: "refreshToken", label: "Refresh Token", placeholder: "OAuth refresh token", type: "password" },
      { key: "accountId", label: "Channel ID", placeholder: "UCxxxxxxxxxxxxxxxxxxxxxxxx" },
    ],
    guide: "Enable YouTube Data API v3 in Google Cloud Console. Use OAuth 2.0 with youtube.upload scope.",
  },
};

const PLATFORM_ORDER: Platform[] = ["instagram", "linkedin_personal", "linkedin_company", "facebook", "youtube", "email", "whatsapp"];

export default function Platforms() {
  const [, setLocation] = useLocation();
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();
  const [editPlatform, setEditPlatform] = useState<CredentialPlatform | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();
  const { data: platforms } = trpc.platforms.list.useQuery({ clientId }, { enabled });

  const upsertMutation = trpc.platforms.upsert.useMutation({
    onSuccess: () => {
      toast.success("Platform credentials saved");
      setEditPlatform(null);
      utils.platforms.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const testMutation = trpc.platforms.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      utils.platforms.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const checkAllMutation = trpc.platforms.checkAllConnections.useMutation({
    onSuccess: () => {
      toast.success("Checked all connections");
      utils.platforms.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (platform: CredentialPlatform) => {
    const existing = platforms?.find((p) => p.platform === platform);
    setFormValues({
      accountName: existing?.accountName ?? "",
      accountId: existing?.accountId ?? "",
      accessToken: "",
      refreshToken: "",
      pageId: existing?.pageId ?? "",
    });
    setEditPlatform(platform);
  };

  const handleSave = () => {
    if (!editPlatform) return;
    upsertMutation.mutate({
      clientId,
      platform: editPlatform,
      accountName: formValues.accountName || undefined,
      accountId: formValues.accountId || undefined,
      accessToken: formValues.accessToken || undefined,
      refreshToken: formValues.refreshToken || undefined,
      pageId: formValues.pageId || undefined,
    });
  };

  if (!enabled) {
    return (
      <div className="p-6 max-w-4xl">
        <EmptyState
          icon={Briefcase}
          title="No client selected"
          description="Select a client workspace to manage its platform connections."
          actionLabel="Go to Clients"
          onAction={() => setLocation("/clients")}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <PageHeader
        eyebrow={activeClient?.name ? `Connections · ${activeClient.name}` : "Connections"}
        title="Platform Connections"
        pill="API credentials and connection status"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs shrink-0"
            onClick={() => checkAllMutation.mutate({ clientId })}
            disabled={checkAllMutation.isPending}
          >
            {checkAllMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Check all
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PLATFORM_ORDER.map((platform) => {
          const cfg = PLATFORM_CONFIG[platform];
          const conn = platforms?.find((p) => p.platform === platform);
          const isConnected = conn?.status === "connected";
          const hasError = conn?.status === "error";

          if (isManualPlatform(platform)) {
            return (
              <Card key={platform} className="bg-card border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-xl ${cfg.bgColor} border ${cfg.borderColor} flex items-center justify-center`}>
                        <span className="text-2xl">{cfg.icon}</span>
                      </div>
                      <CardTitle className="text-base font-semibold">{cfg.label}</CardTitle>
                    </div>
                    <Badge className="text-xs border-0 bg-muted/50 text-muted-foreground">Manual channel</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Content for this channel is generated and saved to the queue — you send it through your own tool.
                  </p>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={platform} className={`bg-card border-border/50 transition-colors ${isConnected ? "border-emerald-500/20" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-xl ${cfg.bgColor} border ${cfg.borderColor} flex items-center justify-center`}>
                      <span className="text-2xl">{cfg.icon}</span>
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{cfg.label}</CardTitle>
                      {conn?.accountName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{conn.accountName}</p>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    isConnected
                      ? "bg-emerald-500/10 text-emerald-400"
                      : hasError
                      ? "bg-red-500/10 text-red-400"
                      : "bg-muted/50 text-muted-foreground"
                  }`}>
                    {isConnected ? (
                      <><CheckCircle2 className="h-3 w-3" /> Connected</>
                    ) : hasError ? (
                      <><WifiOff className="h-3 w-3" /> Error</>
                    ) : (
                      <><WifiOff className="h-3 w-3" /> Not connected</>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasError && conn?.errorMessage && (
                  <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                    {conn.errorMessage}
                  </p>
                )}
                {conn?.lastCheckedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last checked: {new Date(conn.lastCheckedAt).toLocaleString()}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => openEdit(platform as CredentialPlatform)}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Configure
                  </Button>
                  {isConnected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => testMutation.mutate({ clientId, platform })}
                      disabled={testMutation.isPending}
                    >
                      {testMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      Test
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-muted/20 border-border/30">
        <CardContent className="p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Integration Notes</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• LinkedIn Personal and Company Page are separate connections — both use the same access token but different author URNs.</p>
            <p>• All credentials are stored securely and never exposed in the frontend.</p>
            <p>• Platform APIs are used to publish approved and scheduled posts automatically.</p>
            <p>• You will receive an owner notification if any connection fails during publishing.</p>
            <p>• For production use, ensure your API tokens have the required publishing permissions.</p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editPlatform} onOpenChange={(o) => !o && setEditPlatform(null)}>
        <DialogContent className="max-w-lg bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {editPlatform && <span>{PLATFORM_CONFIG[editPlatform]?.icon}</span>}
              Configure {editPlatform && PLATFORM_CONFIG[editPlatform]?.label}
            </DialogTitle>
          </DialogHeader>
          {editPlatform && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
                {PLATFORM_HELP[editPlatform].guide}
              </p>
              {PLATFORM_HELP[editPlatform].fields.map((field) => (
                <div key={field.key}>
                  <label className="text-xs text-muted-foreground mb-1.5 block">{field.label}</label>
                  <Input
                    type={field.type ?? "text"}
                    value={formValues[field.key] ?? ""}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="bg-muted/30 border-border/50"
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlatform(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Credentials"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

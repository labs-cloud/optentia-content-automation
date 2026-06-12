import { AIThinkingState } from "@/components/AIThinkingState";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { PremiumCard } from "@/components/PremiumCard";
import { StaggerItem, StaggerList } from "@/components/motion/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActiveClient, type ClientSummary } from "@/contexts/ActiveClientContext";
import { trpc } from "@/lib/trpc";
import { Archive, Briefcase, Check, Globe, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";

type ClientForm = {
  name: string;
  websiteUrl: string;
  industry: string;
  description: string;
  primaryOffer: string;
  audience: string;
};

const EMPTY_FORM: ClientForm = {
  name: "",
  websiteUrl: "",
  industry: "",
  description: "",
  primaryOffer: "",
  audience: "",
};

export default function Clients() {
  const { clients, activeClient, setActiveClientId, isLoading } = useActiveClient();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientSummary | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);

  // Support /clients?new=1 deep link from the switcher / FAB.
  useEffect(() => {
    if (new URLSearchParams(search).get("new") === "1") {
      openCreate();
      setLocation("/clients", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: (client) => {
      toast.success(`${client.name} added`);
      utils.clients.list.invalidate();
      setDialogOpen(false);
      if (client) setActiveClientId(client.id);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Client updated");
      utils.clients.list.invalidate();
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const archiveMutation = trpc.clients.archive.useMutation({
    onSuccess: () => {
      toast.success("Client archived");
      utils.clients.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (client: ClientSummary) => {
    setEditing(client);
    setForm({
      name: client.name,
      websiteUrl: client.websiteUrl ?? "",
      industry: client.industry ?? "",
      description: client.description ?? "",
      primaryOffer: client.primaryOffer ?? "",
      audience: client.audience ?? "",
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (editing) {
      updateMutation.mutate({ clientId: editing.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container py-6 sm:py-8 space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Clients"
        pill="Each client is its own workspace"
        actions={
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="h-4 w-4 mr-1.5" /> Add client
          </Button>
        }
      />

      {isLoading ? (
        <AIThinkingState messages={["Loading workspaces…"]} />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No clients yet"
          description="Add your first client to give the AI a brand to learn. Each client gets its own content brain."
          actionLabel="Add your first client"
          onAction={openCreate}
        />
      ) : (
        <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => {
            const isActive = activeClient?.id === client.id;
            return (
              <StaggerItem key={client.id}>
                <PremiumCard
                  interactive
                  glow={isActive}
                  className="p-5 h-full flex flex-col gap-3"
                  onClick={() => {
                    setActiveClientId(client.id);
                    setLocation("/");
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary font-display font-bold flex items-center justify-center">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    {isActive && (
                      <Badge className="rounded-lg border-0 bg-primary/15 text-primary">
                        <Check className="h-3 w-3 mr-1" /> Active
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg leading-tight">{client.name}</h3>
                    {client.industry && (
                      <p className="text-xs text-muted-foreground mt-0.5">{client.industry}</p>
                    )}
                  </div>
                  {client.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {client.description}
                    </p>
                  )}
                  {client.websiteUrl && (
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1 truncate">
                      <Globe className="h-3 w-3 shrink-0" /> {client.websiteUrl.replace(/^https?:\/\//, "")}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openEdit(client)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg text-muted-foreground"
                      onClick={() => {
                        if (confirm(`Archive ${client.name}? Its content is kept but the workspace is hidden.`)) {
                          archiveMutation.mutate({ clientId: client.id });
                        }
                      }}
                    >
                      <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                    </Button>
                  </div>
                </PremiumCard>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? `Edit ${editing.name}` : "Add client"}</DialogTitle>
            <DialogDescription>
              The more context you give, the better the AI writes for this brand. You can generate a full Brand
              Operating Profile afterwards in Brand Brain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="client-name">Name *</Label>
              <Input
                id="client-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Acme Studio"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="client-website">Website</Label>
                <Input
                  id="client-website"
                  value={form.websiteUrl}
                  onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                  placeholder="https://…"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-industry">Industry</Label>
                <Input
                  id="client-industry"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="e.g. Boutique fitness"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-description">What do they do?</Label>
              <Textarea
                id="client-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="One or two sentences describing the business"
                rows={2}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-offer">Primary offer / service</Label>
              <Textarea
                id="client-offer"
                value={form.primaryOffer}
                onChange={(e) => setForm({ ...form, primaryOffer: e.target.value })}
                placeholder="What they sell and lead with"
                rows={2}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-audience">Audience</Label>
              <Textarea
                id="client-audience"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                placeholder="Who the content should speak to"
                rows={2}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={submit} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

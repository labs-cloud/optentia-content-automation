import { useActiveClient } from "@/contexts/ActiveClientContext";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

type Form = {
  name: string;
  websiteUrl: string;
  industry: string;
  description: string;
  primaryOffer: string;
  audience: string;
};

const EMPTY: Form = {
  name: "",
  websiteUrl: "",
  industry: "",
  description: "",
  primaryOffer: "",
  audience: "",
};

/**
 * First-run experience: shown when the operator is signed in but has no client
 * workspaces yet. Walks them through creating their first brand.
 */
export function Onboarding() {
  const { setActiveClientId } = useActiveClient();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<Form>(EMPTY);

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: (client) => {
      toast.success(`${client.name} is ready — welcome aboard`);
      utils.clients.list.invalidate();
      if (client) setActiveClientId(client.id);
    },
    onError: (err) => toast.error(err.message),
  });

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Give your first client a name to continue");
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl"
      >
        <div className="text-center">
          <span className="ai-grad ai-glow mx-auto flex h-12 w-12 items-center justify-center rounded-2xl">
            <Zap className="h-6 w-6 text-white" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">
            Welcome to Content Operator
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            Let's set up your first client. Everything in the app is scoped to a brand — the more
            context you give, the better the AI writes for it. You can refine this anytime in Brand
            Brain.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-[var(--surface)] p-6 backdrop-blur-md shadow-[var(--shadow)]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ob-name">Client name *</Label>
              <Input
                id="ob-name"
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Horizon Fitness"
                className="rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ob-website">Website</Label>
                <Input
                  id="ob-website"
                  value={form.websiteUrl}
                  onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                  placeholder="https://…"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-industry">Industry</Label>
                <Input
                  id="ob-industry"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="e.g. Boutique fitness"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-description">What do they do?</Label>
              <Textarea
                id="ob-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="One or two sentences describing the business"
                rows={2}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-audience">Audience</Label>
              <Textarea
                id="ob-audience"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                placeholder="Who the content should speak to"
                rows={2}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              You can add more clients later
            </p>
            <Button className="rounded-xl glow-primary" onClick={submit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create workspace"}
              {!createMutation.isPending && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

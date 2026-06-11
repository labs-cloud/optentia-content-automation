import { SignIn } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckSquare,
  Lightbulb,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

const features = [
  {
    icon: Brain,
    title: "Brand Brain",
    body: "Each client gets an AI that learns their voice, audience, and offer — then writes on-brand every time.",
  },
  {
    icon: Lightbulb,
    title: "Swipe to brainstorm",
    body: "Triage AI-generated content ideas Tinder-style. Keep what fits, pass on the rest.",
  },
  {
    icon: CheckSquare,
    title: "Approval queue",
    body: "Review, edit, and approve drafted posts before they schedule — one calm, glassy queue.",
  },
  {
    icon: BarChart3,
    title: "One operator, many clients",
    body: "Switch workspaces in a tap. Dashboards, campaigns, and analytics scoped per brand.",
  },
];

/**
 * Pre-auth landing page. The actual Clerk sign-in is revealed behind a CTA so
 * the first thing a visitor sees is branded marketing, not a login form.
 */
export function Landing() {
  const [showSignIn, setShowSignIn] = useState(false);

  if (showSignIn) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        <button
          onClick={() => setShowSignIn(false)}
          className="absolute left-5 top-5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <SignIn routing="hash" signUpUrl="#/sign-up" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 sm:px-8 h-16">
        <div className="flex items-center gap-2">
          <span className="ai-grad ai-glow flex h-9 w-9 items-center justify-center rounded-xl">
            <Zap className="h-5 w-5 text-white" />
          </span>
          <span className="font-display font-semibold text-lg tracking-tight">Content Operator</span>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => setShowSignIn(true)}>
          Log in
        </Button>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-5 sm:px-8 pt-12 sm:pt-20 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-[var(--surface)] px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            A premium multi-client AI marketing OS
          </span>
          <h1 className="mt-6 font-display text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
            Run every client's content
            <br className="hidden sm:block" />{" "}
            <span className="text-primary">like one calm operator.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Content Operator gives each brand its own AI Brand Brain — brainstorm, draft, approve,
            schedule, and measure. The AI does the work; you make the calls.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="rounded-xl glow-primary"
              onClick={() => setShowSignIn(true)}
            >
              Get started <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl"
              onClick={() => setShowSignIn(true)}
            >
              Log in
            </Button>
          </div>
        </motion.div>

        {/* Feature grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.06 }}
              className="rounded-2xl border border-border bg-[var(--surface)] p-5 backdrop-blur-md shadow-[var(--shadow-sm)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-display font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="pb-10 text-center text-xs text-muted-foreground">
        DIAGNOSE · AUTOMATE · SCALE — Optentia
      </footer>
    </div>
  );
}

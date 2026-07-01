import { EmptyState } from "@/components/EmptyState";
import { useActiveClient, useClientScope } from "@/contexts/ActiveClientContext";
import { PLATFORM_CONFIG, formatRelativeTime } from "@/lib/platformUtils";
import type { Platform } from "@shared/platforms";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Brain,
  CalendarDays,
  Check,
  Lightbulb,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useLocation } from "wouter";

/** Maps a live platform id onto the prototype's colored platform-icon class. */
function platClass(platform: string): string {
  if (platform === "instagram") return "plat-ig";
  if (platform.startsWith("linkedin")) return "plat-li";
  if (platform === "facebook") return "plat-fb";
  if (platform === "youtube") return "plat-yt";
  return "plat-default";
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { activeClient } = useActiveClient();
  const { clientId, enabled } = useClientScope();

  const { data: summary } = trpc.analytics.summary.useQuery({ clientId }, { enabled });
  const { data: pendingPosts } = trpc.posts.pendingApproval.useQuery({ clientId }, { enabled });

  if (!enabled) {
    return (
      <div className="container py-8">
        <EmptyState
          icon={Users}
          title="Add your first client"
          description="Everything here is scoped to a client workspace. Create one to start generating content."
          actionLabel="Go to Clients"
          onAction={() => setLocation("/clients")}
        />
      </div>
    );
  }

  const pending = summary?.pending ?? 0;
  const scheduled = summary?.scheduled ?? 0;
  const published = summary?.published ?? 0;
  const total = summary?.total ?? 0;
  const approvals = (pendingPosts ?? []).slice(0, 4);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="container py-6 sm:py-8">
      {/* Header */}
      <div className="topbar">
        <div>
          <div className="eyebrow">Workspace · {today}</div>
          <h1 className="page-h1">{activeClient?.name}</h1>
          <div className="topbar-pill">
            <span className="pulse" />
            {activeClient?.industry
              ? `Brand Brain calibrated · ${activeClient.industry}`
              : "Brand Brain calibrated · ready for review"}
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={() => setLocation("/campaigns?new=1")}>
            <Plus /> New campaign
          </button>
          <button className="btn btn-ai" onClick={() => setLocation("/generate")}>
            <Sparkles /> Generate posts
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <button className="kpi warn" onClick={() => setLocation("/queue")}>
          <div className="kpi-label">Pending approval</div>
          <div className="kpi-value">{pending}</div>
          <div className="kpi-delta">Waiting in the queue</div>
        </button>
        <button className="kpi" onClick={() => setLocation("/calendar")}>
          <div className="kpi-label">Scheduled</div>
          <div className="kpi-value">{scheduled}</div>
          <div className="kpi-delta">Going out automatically</div>
        </button>
        <button className="kpi" onClick={() => setLocation("/analytics")}>
          <div className="kpi-label">Published</div>
          <div className="kpi-value">{published}</div>
          <div className="kpi-delta up">
            <span className="arrow">▲</span> live across channels
          </div>
        </button>
        <div className="kpi ai">
          <div className="kpi-label">Total posts</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-delta">in this workspace</div>
        </div>
      </div>

      {/* Brand Brain */}
      <div className="brain-card">
        <div className="brain-inner">
          <div className="brain-orb">
            <Brain className="h-[23px] w-[23px]" />
          </div>
          <div className="brain-txt">
            <div className="brain-eyebrow">Brand Brain · working</div>
            <div className="brain-line">
              {pending > 0 ? (
                <>
                  Drafted content for <b>{activeClient?.name}</b> and lined up{" "}
                  <b>
                    {pending} post{pending === 1 ? "" : "s"}
                  </b>{" "}
                  that match its voice. <b>Ready for your review.</b>
                </>
              ) : (
                <>
                  Tuned to <b>{activeClient?.name}</b>'s voice. Nothing's waiting — generate a fresh
                  batch whenever you're ready.
                </>
              )}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setLocation("/brand")}>
            Tune voice
          </button>
        </div>
      </div>

      {/* Approvals + quick actions */}
      <div className="dash-grid">
        <div className="co-card">
          <div className="card-head">
            <div className="card-title">
              Needs your approval <span className="num">{approvals.length} of {pending}</span>
            </div>
            <a className="card-link" href="#" onClick={(e) => { e.preventDefault(); setLocation("/queue"); }}>
              Open queue →
            </a>
          </div>
          {approvals.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">All caught up — nothing pending review.</p>
          ) : (
            approvals.map((post) => (
              <div className="appr-row" key={post.id}>
                <div className={`plat-ic ${platClass(post.platform)}`}>
                  {PLATFORM_CONFIG[post.platform as Platform]?.icon ?? "📝"}
                </div>
                <div className="appr-meta">
                  <div className="appr-title">{post.title || post.caption || "Untitled post"}</div>
                  <div className="appr-sub">
                    {PLATFORM_CONFIG[post.platform as Platform]?.label ?? post.platform} ·{" "}
                    {post.aiGenerated ? "AI draft" : "manual"} · {formatRelativeTime(post.createdAt)}
                  </div>
                </div>
                <div className="appr-mini">
                  <button
                    className="icon-btn ok"
                    title="Review in queue"
                    onClick={() => setLocation("/queue")}
                  >
                    <Check />
                  </button>
                  <button
                    className="icon-btn no"
                    title="Review in queue"
                    onClick={() => setLocation("/queue")}
                  >
                    <X />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="co-card">
          <div className="card-head">
            <div className="card-title">Quick actions</div>
          </div>
          <div className="quick-actions">
            <button className="qa" onClick={() => setLocation("/brainstorm")}>
              <span className="qa-ic">
                <Lightbulb />
              </span>
              <span>
                <span className="qa-t">Brainstorm</span>
                <span className="qa-s">Swipe fresh ideas</span>
              </span>
            </button>
            <button className="qa" onClick={() => setLocation("/calendar")}>
              <span className="qa-ic">
                <CalendarDays />
              </span>
              <span>
                <span className="qa-t">Schedule batch</span>
                <span className="qa-s">{scheduled} ready to slot</span>
              </span>
            </button>
            <button className="qa" onClick={() => setLocation("/brand")}>
              <span className="qa-ic">
                <Brain />
              </span>
              <span>
                <span className="qa-t">Tune voice</span>
                <span className="qa-s">Brand Brain</span>
              </span>
            </button>
            <button className="qa" onClick={() => setLocation("/analytics")}>
              <span className="qa-ic">
                <BarChart3 />
              </span>
              <span>
                <span className="qa-t">Weekly report</span>
                <span className="qa-s">{published} published</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

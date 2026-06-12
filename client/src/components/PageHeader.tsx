import type { ReactNode } from "react";

/**
 * Shared page header in the Frosted Vapor design language:
 * mono eyebrow → display headline → optional live status pill, with optional
 * right-aligned actions. Used across every screen for a consistent top.
 */
export function PageHeader({
  eyebrow,
  title,
  pill,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  pill?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="topbar">
      <div>
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1 className="page-h1">{title}</h1>
        {pill ? (
          <div className="topbar-pill">
            <span className="pulse" />
            {pill}
          </div>
        ) : null}
      </div>
      {actions ? <div className="topbar-actions">{actions}</div> : null}
    </div>
  );
}

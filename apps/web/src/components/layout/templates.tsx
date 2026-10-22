import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys â€” Page Template Architecture v1.0
 * Phase 4: Canonical templates every page inherits from.
 * 
 * Templates:
 * - DashboardTemplate     â†’ Dashboard page
 * - WorkspaceTemplate     â†’ Candidates, Interviews, Pipeline, AI
 * - MasterDetailTemplate  â†’ Candidate Workspace (30/70 split)
 * - DetailTemplate        â†’ Candidate Profile, Interview Report
 * - SettingsTemplate      â†’ Settings (Stripe-style left nav)
 * - AIWorkspaceTemplate   â†’ Resume Parser, Question Gen, AI Feedback
 * - CodingTemplate        â†’ Coding Room (no shell, full-bleed)
 *
 * Rules:
 * - No page may invent its own layout outside these templates.
 * - Container max-width: 1440px (standard), fluid (pipeline, coding).
 * - Horizontal padding: 32px desktop / 24px tablet / 16px mobile.
 * - Vertical rhythm: 32px between major sections.
 * - PageHeader always appears before content â€” never after.
 */

/* ============================================================
   1. DASHBOARD TEMPLATE
   Purpose: Command center. Today's hiring status.
   Grid: 12 col, 24px gap.
   Scroll: Single page, no horizontal scroll.
   ============================================================ */
interface DashboardTemplateProps {
  header: React.ReactNode;
  kpiRow: React.ReactNode;
  primaryRow: React.ReactNode;       /* Pipeline(60%) + AI(40%) */
  secondaryRow: React.ReactNode;     /* Schedule(50%) + AI Tools(50%) */
  activityRow?: React.ReactNode;     /* Recent Activity (optional) */
  className?: string;
}

export function DashboardTemplate({
  header, kpiRow, primaryRow, secondaryRow, activityRow, className
}: DashboardTemplateProps) {
  return (
    <div className={cn("w-full max-w-[var(--content-max-width)] mx-auto flex flex-col gap-6 page-enter", className)}>
      {/* Block 1: Hero */}
      <section aria-label="Dashboard overview">{header}</section>

      {/* Block 2: KPIs â€” exactly 4 cards */}
      <section aria-label="Key metrics">
        {kpiRow}
      </section>

      {/* Block 3: Pipeline + AI Intelligence */}
      <section aria-label="Pipeline and AI">
        {primaryRow}
      </section>

      {/* Block 4: Schedule + AI Tools */}
      <section aria-label="Schedule and tools">
        {secondaryRow}
      </section>

      {/* Block 5: Recent Activity (optional) */}
      {activityRow && (
        <section aria-label="Recent activity">
          {activityRow}
        </section>
      )}
    </div>
  );
}


/* ============================================================
   2. WORKSPACE TEMPLATE
   Purpose: Daily operational pages â€” Candidates, Interviews, etc.
   Grid: Full width, dense content.
   Structure: PageHeader â†’ Toolbar (Search/Filters/Actions) â†’ Content.
   ============================================================ */
interface WorkspaceTemplateProps {
  header: React.ReactNode;
  toolbar?: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export function WorkspaceTemplate({ header, toolbar, content, className }: WorkspaceTemplateProps) {
  return (
    <div className={cn("w-full flex flex-col gap-0 page-enter", className)}>
      {/* Page Header â€” always first */}
      <div className="pb-5 border-b border-[var(--border-default)]">
        {header}
      </div>

      {/* Toolbar: Search, Filters, Actions */}
      {toolbar && (
        <div className="py-4 flex items-center gap-3 flex-wrap border-b border-[var(--border-divider)]">
          {toolbar}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 pt-5">
        {content}
      </div>
    </div>
  );
}


/* ============================================================
   3. MASTER-DETAIL TEMPLATE (30/70 SPLIT)
   Purpose: Candidate Workspace â€” no page reloads, continuous flow.
   Left: Compact scrollable list (30%).
   Right: Rich detail panel (70%).
   Spec Vol 3.8 / 5.8 / 6.6.
   ============================================================ */
interface MasterDetailTemplateProps {
  header: React.ReactNode;
  listPanel: React.ReactNode;
  detailPanel: React.ReactNode;
  className?: string;
}

export function MasterDetailTemplate({ header, listPanel, detailPanel, className }: MasterDetailTemplateProps) {
  return (
    <div className={cn("w-full h-full flex flex-col page-enter", className)}>
      {/* Page Header */}
      <div className="pb-5 border-b border-[var(--border-default)] shrink-0">
        {header}
      </div>

      {/* Master-Detail Split */}
      <div className="flex flex-1 overflow-hidden mt-0">
        {/* Left Panel: 30% */}
        <div
          className="w-[30%] min-w-[280px] max-w-[380px] flex flex-col border-r border-[var(--border-default)] overflow-y-auto bg-[var(--bg-base)] shrink-0"
          aria-label="Candidate list"
        >
          {listPanel}
        </div>

        {/* Right Panel: 70% */}
        <div
          className="flex-1 overflow-y-auto bg-[var(--bg-base)]"
          aria-label="Candidate details"
        >
          {detailPanel}
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   4. DETAIL TEMPLATE
   Purpose: Single object deep view â€” Candidate Profile, Report.
   Max width: 960px centered.
   Structure: Back link â†’ PageHeader â†’ Tabbed/Sectioned content.
   ============================================================ */
interface DetailTemplateProps {
  backLink?: React.ReactNode;
  header: React.ReactNode;
  sidebar?: React.ReactNode;   /* Optional sticky sidebar (profile card etc.) */
  content: React.ReactNode;
  className?: string;
}

export function DetailTemplate({ backLink, header, sidebar, content, className }: DetailTemplateProps) {
  return (
    <div className={cn("w-full max-w-[1200px] mx-auto flex flex-col gap-5 page-enter", className)}>
      {/* Back link */}
      {backLink && (
        <div className="flex items-center">{backLink}</div>
      )}

      {/* Header */}
      <div>{header}</div>

      {/* Content */}
      {sidebar ? (
        <div className="flex gap-6 items-start">
          {/* Sticky sidebar */}
          <div className="w-[280px] shrink-0">
            <div className="sticky top-6 flex flex-col gap-4">{sidebar}</div>
          </div>
          {/* Main content */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">{content}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">{content}</div>
      )}
    </div>
  );
}


/* ============================================================
   5. SETTINGS TEMPLATE
   Purpose: Configuration pages. Calm, distraction-free.
   Layout: Optional left nav (220px) + Right content, OR simple single-column.
   Max width: 960px.
   ============================================================ */
interface SettingsItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface SettingsTemplateProps {
  /** Full left-nav mode: requires items + activeItem + onItemChange */
  header: React.ReactNode;
  items?: SettingsItem[];
  activeItem?: string;
  onItemChange?: (id: string) => void;
  content: React.ReactNode;
  className?: string;
}

export function SettingsTemplate({
  header, items, activeItem, onItemChange, content, className
}: SettingsTemplateProps) {
  const hasNav = items && items.length > 1 && onItemChange;

  return (
    <div className={cn("w-full max-w-[960px] mx-auto page-enter", className)}>
      {/* Page Header */}
      <div className="pb-6 border-b border-[var(--border-default)] mb-6">
        {header}
      </div>

      {hasNav ? (
        /* Two-column layout with left nav */
        <div className="flex gap-10 items-start">
          <nav className="w-[200px] shrink-0 flex flex-col gap-0.5" aria-label="Settings navigation">
            {items!.map((item) => {
              const isActive = item.id === activeItem;
              return (
                <button
                  key={item.id}
                  onClick={() => onItemChange!(item.id)}
                  className={cn(
                    "flex items-center gap-2.5 w-full text-left px-3 h-9 rounded-[var(--radius-default)]",
                    "text-sm font-medium transition-colors duration-[var(--ease-base)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                    isActive
                      ? "bg-[var(--accent-muted)] text-[var(--accent)] font-semibold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  )}
                >
                  {item.icon && (
                    <span className="flex shrink-0 opacity-70">{item.icon}</span>
                  )}
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="flex-1 min-w-0">{content}</div>
        </div>
      ) : (
        /* Simple single-column layout */
        <div className="w-full">{content}</div>
      )}
    </div>
  );
}



/* ============================================================
   6. AI WORKSPACE TEMPLATE
   Purpose: Resume Parser, Question Generator, AI Feedback.
   Pattern: Action â†’ Processing â†’ Result â†’ Accept.
   Never chat-first.
   ============================================================ */
interface AIWorkspaceTemplateProps {
  header: React.ReactNode;
  inputPanel: React.ReactNode;     /* Left: Upload / Config */
  outputPanel: React.ReactNode;    /* Right: Results */
  outputEmpty?: React.ReactNode;   /* Placeholder before results */
  hasOutput?: boolean;
  className?: string;
}

export function AIWorkspaceTemplate({
  header, inputPanel, outputPanel, outputEmpty, hasOutput = false, className
}: AIWorkspaceTemplateProps) {
  return (
    <div className={cn("w-full max-w-[1200px] mx-auto flex flex-col gap-5 page-enter", className)}>
      {/* Page Header */}
      <div className="pb-5 border-b border-[var(--border-default)]">
        {header}
      </div>

      {/* Two-column: Input (40%) + Output (60%) */}
      <div className="flex gap-6 items-start">
        {/* Input Panel */}
        <div className="w-[40%] max-w-[480px] shrink-0 sticky top-6">
          {inputPanel}
        </div>

        {/* Output Panel */}
        <div className="flex-1 min-w-0">
          {hasOutput ? outputPanel : (outputEmpty || outputPanel)}
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   7. CODING WORKSPACE TEMPLATE
   Purpose: Live technical interviews. Full-bleed, no shell.
   Layout: Left(notes/problems 25%) + Editor(50%) + Output/Video(25%).
   No sidebar. No topbar. Editor dominates.
   ============================================================ */
interface CodingTemplateProps {
  header: React.ReactNode;          /* Thin header bar: candidate, timer, controls */
  leftPanel: React.ReactNode;       /* Notes, AI Questions, Problem */
  editorPanel: React.ReactNode;     /* Monaco Editor (50%) */
  rightPanel?: React.ReactNode;     /* Output / Console / Video (25%) */
  className?: string;
}

export function CodingTemplate({ header, leftPanel, editorPanel, rightPanel, className }: CodingTemplateProps) {
  return (
    <div className={cn("flex h-screen w-full flex-col bg-[#1E1E1E] overflow-hidden", className)}>
      {/* Thin header bar */}
      <div className="h-[52px] shrink-0 border-b border-[#333] bg-[#252526] flex items-center px-4">
        {header}
      </div>

      {/* Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Notes / Questions / Problem â€” 25% */}
        <div className="w-1/4 min-w-[240px] border-r border-[#333] flex flex-col overflow-hidden bg-[#1E1E1E]">
          {leftPanel}
        </div>

        {/* Center: Editor â€” 50% */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {editorPanel}
        </div>

        {/* Right: Output + Video â€” 25% */}
        {rightPanel && (
          <div className="w-1/4 min-w-[200px] border-l border-[#333] flex flex-col overflow-hidden bg-[#1E1E1E]">
            {rightPanel}
          </div>
        )}
      </div>
    </div>
  );
}


/* ============================================================
   SHARED: Back Link component
   ============================================================ */
interface BackLinkProps {
  onClick?: () => void;
  href?: string;
  label?: string;
  className?: string;
}

export function BackLink({ onClick, href, label = "Back", className }: BackLinkProps) {
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-[var(--ease-base)] cursor-pointer group",
          className
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="group-hover:-translate-x-0.5 transition-transform">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>{label}</span>
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-[var(--ease-base)] cursor-pointer group bg-transparent border-0 p-0",
        className
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="group-hover:-translate-x-0.5 transition-transform">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      <span>{label}</span>
    </button>
  );
}

/* ============================================================
   SHARED: Section Divider
   ============================================================ */
export function SectionDivider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-[var(--border-default)] my-8", className)} />;
}

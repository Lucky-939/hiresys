"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface StructuredResumeViewProps {
  resumeText: string;
  candidateName?: string;
  candidateEmail?: string;
  maxHeight?: string;
}

interface ParsedSection {
  title: string;
  type: "experience" | "projects" | "skills" | "education" | "certifications" | "achievements" | "general";
  content: string;
}

export function StructuredResumeView({
  resumeText,
  candidateName,
  candidateEmail,
  maxHeight = "max-h-[620px]",
}: StructuredResumeViewProps) {
  const parsed = useMemo(() => {
    if (!resumeText) return null;

    // 1. Extract contact information
    const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = resumeText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/);
    const githubMatch = resumeText.match(/github\.com\/([a-zA-Z0-9_.-]+)/i);
    const linkedinMatch = resumeText.match(/linkedin\.com\/in\/([a-zA-Z0-9_.-]+)/i);
    const locationMatch = resumeText.match(/\b(Mumbai|Bengaluru|Bangalore|Pune|Delhi|Hyderabad|Chennai|Kolkata|San Francisco|New York|London|Remote)\b/i);

    // 2. Extract Candidate Full Name
    const nameMatch = resumeText.match(/^\s*([A-Za-z\s]{3,35})(?=[„Ñ§ï#🗎|•\d+]|\+?\d{8,}|\bMumbai\b|\bDelhi\b|\bPune\b|\bemail\b|\bgithub\b|\blinkedin\b)/i);
    let resolvedName = candidateName || "Candidate";
    if (nameMatch && nameMatch[1].trim().length > 3) {
      resolvedName = nameMatch[1]
        .trim()
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }

    // 3. Identify Section Headers
    const sectionPatterns: { type: ParsedSection["type"]; label: string; regex: RegExp }[] = [
      { type: "experience", label: "Professional Experience", regex: /P\s*R\s*O\s*F\s*E\s*S\s*S\s*I\s*O\s*N\s*A\s*L\s*E\s*X\s*P\s*E\s*R\s*I\s*E\s*N\s*C\s*E|W\s*O\s*R\s*K\s*E\s*X\s*P\s*E\s*R\s*I\s*E\s*N\s*C\s*E|E\s*X\s*P\s*E\s*R\s*I\s*E\s*N\s*C\s*E/i },
      { type: "projects", label: "Projects & Applications", regex: /P\s*R\s*O\s*J\s*E\s*C\s*T\s*S/i },
      { type: "skills", label: "Technical Skills & Competencies", regex: /T\s*E\s*C\s*H\s*N\s*I\s*C\s*A\s*L\s*S\s*K\s*I\s*L\s*L\s*S|S\s*K\s*I\s*L\s*L\s*S/i },
      { type: "education", label: "Education & Academics", regex: /E\s*D\s*U\s*C\s*A\s*T\s*I\s*O\s*N/i },
      { type: "certifications", label: "Certifications & Training", regex: /C\s*E\s*R\s*T\s*I\s*F\s*I\s*C\s*A\s*T\s*I\s*O\s*N\s*S?(?:\s*&\s*T\s*R\s*A\s*I\s*N\s*I\s*N\s*G)?|L\s*I\s*C\s*E\s*N\s*S\s*E\s*S/i },
      { type: "achievements", label: "Achievements & Leadership", regex: /A\s*C\s*H\s*I\s*E\s*V\s*E\s*M\s*E\s*N\s*T\s*S(?:\s*&\s*R\s*O\s*L\s*E\s*S\s*O\s*F\s*R\s*E\s*S\s*P\s*O\s*N\s*S\s*I\s*B\s*I\s*L\s*I\s*T\s*Y)?|A\s*W\s*A\s*R\s*D\s*S/i },
    ];

    const matches: { type: ParsedSection["type"]; label: string; index: number; length: number }[] = [];
    for (const p of sectionPatterns) {
      const m = p.regex.exec(resumeText);
      if (m) {
        matches.push({ type: p.type, label: p.label, index: m.index, length: m[0].length });
      }
    }
    matches.sort((a, b) => a.index - b.index);

    // 4. Extract Headline / Summary without candidate's name fragments
    let headlineSummary = "";
    if (matches.length > 0) {
      const headerRaw = resumeText.slice(0, matches[0].index);
      const cleanHeader = headerRaw
        .replace(/[„Ñ§ï#🗎|]/g, " ")
        .replace(/\b\d{10}\b/g, "")
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "")
        .replace(/github\.com\/[^\s]+/gi, "")
        .replace(/linkedin\.com\/[^\s]+/gi, "")
        .replace(/\b(Mumbai|Bengaluru|Bangalore|Pune|Delhi|Hyderabad|Chennai|Kolkata|Remote)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      // Look for the actual summary starting with common developer roles
      const summaryRegex = /(?:Full-stack|Software|Backend|Frontend|Web|Mobile|DevOps|Systems|Passionate|Experienced|Motivated|Results-driven)[\s\S]+/i;
      const sm = cleanHeader.match(summaryRegex);
      if (sm) {
        headlineSummary = sm[0].trim();
      }
    }

    // 5. Extract Section Chunks
    const sections: ParsedSection[] = [];
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const next = matches[i + 1];
      const start = cur.index + cur.length;
      const end = next ? next.index : resumeText.length;
      const rawChunk = resumeText.slice(start, end).trim();
      sections.push({
        title: cur.label,
        type: cur.type,
        content: rawChunk,
      });
    }

    return {
      fullName: resolvedName,
      email: emailMatch?.[0] || candidateEmail,
      phone: phoneMatch?.[0],
      github: githubMatch ? `https://${githubMatch[0]}` : undefined,
      githubUser: githubMatch?.[1],
      linkedin: linkedinMatch ? `https://${linkedinMatch[0]}` : undefined,
      linkedinUser: linkedinMatch?.[1],
      location: locationMatch?.[0],
      headlineSummary,
      sections,
    };
  }, [resumeText, candidateName, candidateEmail]);

  // Helper to split bullet points
  const parseBulletItems = (text: string) => {
    const rawItems = text
      .split(/(?:•|\n-|\n\*|\n·)/)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    if (rawItems.length <= 1) {
      return text
        .split(/(?:;\s+|\.\s+(?=[A-Z]))/)
        .map(s => s.trim())
        .filter(s => s.length > 10);
    }
    return rawItems;
  };

  // Helper to parse skill categories
  const parseSkillCategories = (text: string) => {
    const categories: { name: string; skills: string[] }[] = [];
    const lines = text.split(/(?=[A-Z][a-zA-Z\s]+:)/g);
    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0 && colonIdx < 30) {
        const catName = line.slice(0, colonIdx).trim();
        const skillList = line
          .slice(colonIdx + 1)
          .split(/[,;•|]/)
          .map(s => s.trim().replace(/\.$/, ""))
          .filter(s => s.length > 0 && s.length < 35);
        if (skillList.length > 0) {
          categories.push({ name: catName, skills: skillList });
        }
      }
    }
    return categories;
  };

  if (!parsed) {
    return (
      <div className="p-4 text-xs text-[var(--text-muted)] text-center">
        No extractable text profile available.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 overflow-y-auto pr-1 select-text", maxHeight)}>
      {/* Header: Candidate Identity & Clean Contact Grid */}
      <div className="p-3.5 rounded-[var(--radius-default)] bg-[var(--bg-elevated)] border border-[var(--border-default)] space-y-2.5">
        <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
          {parsed.fullName}
        </h3>

        {/* Compact Contact Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {parsed.location && (
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)] shrink-0">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="truncate">{parsed.location}</span>
            </div>
          )}

          {parsed.phone && (
            <a href={`tel:${parsed.phone}`} className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)] shrink-0">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span className="truncate">{parsed.phone}</span>
            </a>
          )}

          {parsed.email && (
            <a href={`mailto:${parsed.email}`} className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)] shrink-0">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <span className="truncate">{parsed.email}</span>
            </a>
          )}

          <div className="flex items-center gap-3">
            {parsed.github && (
              <a href={parsed.github} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[var(--accent)] hover:underline font-medium">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                </svg>
                <span>GitHub ↗</span>
              </a>
            )}

            {parsed.linkedin && (
              <a href={parsed.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#0077b5] hover:underline font-medium">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
                </svg>
                <span>LinkedIn ↗</span>
              </a>
            )}
          </div>
        </div>

        {/* Clean Summary Quote Callout */}
        {parsed.headlineSummary && (
          <div className="p-3 bg-[var(--bg-surface)] border-l-2 border-[var(--accent)] rounded-[var(--radius-default)] text-xs text-[var(--text-secondary)] leading-relaxed italic">
            "{parsed.headlineSummary}"
          </div>
        )}
      </div>

      {/* Render Structured Sections */}
      {parsed.sections.map((sec, idx) => {
        if (sec.type === "skills") {
          const categories = parseSkillCategories(sec.content);
          return (
            <div key={idx} className="p-3.5 rounded-[var(--radius-default)] bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent)]">
                  <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
                </svg>
                {sec.title}
              </h4>
              {categories.length > 0 ? (
                <div className="space-y-2">
                  {categories.map((cat, cIdx) => (
                    <div key={cIdx} className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                        {cat.name}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.skills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-[var(--radius-default)] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {sec.content}
                </p>
              )}
            </div>
          );
        }

        const bullets = parseBulletItems(sec.content);

        return (
          <div key={idx} className="p-3.5 rounded-[var(--radius-default)] bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              {sec.type === "experience" && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent)]"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              )}
              {sec.type === "projects" && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent)]"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              )}
              {sec.type === "education" && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent)]"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              )}
              {sec.type === "certifications" && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent)]"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
              )}
              {sec.type === "achievements" && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              )}
              <span>{sec.title}</span>
            </h4>

            <div className="space-y-1.5">
              {bullets.map((b, bIdx) => (
                <div key={bIdx} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                  <span className="flex-1">{b}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

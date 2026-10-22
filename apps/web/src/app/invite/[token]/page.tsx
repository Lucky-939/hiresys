"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

import Image from "next/image";

/* ——— Icons ——— */
const Icons = {
  check: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
};

export default function InvitePage() {
  const { token } = useParams() as { token: string };
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    // Fetch invite details (public endpoint)
    api.get(`/organizations/invite/${token}`)
      .then((res) => {
        setInvite(res.data.data);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Invalid or expired invite link.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError("");
    try {
      await api.post(`/organizations/invite/${token}/accept`);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to accept invite.");
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="invite-layout">
        <div className="spinner" style={{ width: "32px", height: "32px", border: "3px solid var(--border-default)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="invite-layout">
        <div className="invite-card">
          <div style={{ color: "var(--danger-text)", marginBottom: "16px" }}>
            {Icons.error}
          </div>
          <h1 className="invite-title">Invite Error</h1>
          <p className="invite-desc">{error}</p>
          <Button onClick={() => router.push("/")} style={{ width: "100%", marginTop: "16px" }}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-layout">
      <div className="invite-card">
        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
          <Image
            src="/branding/logo-icon.svg"
            alt="HireSys Logo"
            width={48}
            height={48}
            className="object-contain"
          />
        </div>
        <h1 className="invite-title">
          You have been invited!
        </h1>
        <p className="invite-desc">
          You have been invited to join <strong>{invite?.organization?.name}</strong> on HireSys as an <strong>{invite?.role}</strong>.
        </p>

        {error && (
          <div style={{ background: "var(--danger-bg)", color: "var(--danger-text)", padding: "12px", borderRadius: "var(--radius-default)", fontSize: "13px", marginTop: "16px" }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: "32px" }}>
          {!user ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center", marginBottom: "4px" }}>
                To join this organization, create your password or log in.
              </p>
              <Link href={`/register?redirect=/invite/${token}${invite?.email ? `&email=${encodeURIComponent(invite.email)}` : ""}`} style={{ textDecoration: "none" }}>
                <Button style={{ width: "100%" }}>Create Account &amp; Set Password</Button>
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0" }}>
                <div style={{ flex: 1, height: "1px", background: "var(--border-default)" }} />
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Already registered?</span>
                <div style={{ flex: 1, height: "1px", background: "var(--border-default)" }} />
              </div>
              <Link href={`/login?redirect=/invite/${token}${invite?.email ? `&email=${encodeURIComponent(invite.email)}` : ""}`} style={{ textDecoration: "none" }}>
                <Button variant="secondary" style={{ width: "100%" }}>Log In</Button>
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Signed in as <strong>{user.email}</strong>
              </div>
              <Button onClick={handleAccept} loading={accepting} style={{ width: "100%" }}>
                Accept Invitation
              </Button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .invite-layout {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-base);
          padding: 24px;
        }
        .invite-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-default);
          padding: 40px 32px;
          max-width: 420px;
          width: 100%;
          text-align: center;
        }
        .invite-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 12px;
          letter-spacing: -0.02em;
        }
        .invite-desc {
          font-size: 15px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

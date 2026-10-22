"use client";

import { use, useEffect, useState, useRef } from "react";
import axios from "axios";

interface PublicJob {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  description: string;
  organizationName: string;
}

export default function PublicJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [job, setJob] = useState<PublicJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    axios
      .get(`${apiUrl}/public/jobs/${id}`)
      .then((res) => {
        if (res.data.success && res.data.data) {
          setJob(res.data.data);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMsg("");
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setErrorMsg("Please upload a resume in PDF format.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("Resume file size cannot exceed 5 MB.");
        return;
      }
      setResume(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (!resume) {
      setErrorMsg("Please upload your resume (PDF, max 5 MB).");
      return;
    }

    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const formData = new FormData();
      formData.append("fullName", fullName.trim());
      formData.append("email", email.trim().toLowerCase());
      if (phone.trim()) formData.append("phone", phone.trim());
      formData.append("resume", resume);
      if (honeypot) formData.append("_honeypot_trap", honeypot);

      const res = await axios.post(`${apiUrl}/public/jobs/${id}/apply`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setSuccess(true);
      } else {
        setErrorMsg(res.data.message || "Failed to submit application.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "An unexpected error occurred.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#141413] flex items-center justify-center p-6 text-[#201F1D] dark:text-[#E8E6DF]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#D8D5CC] dark:border-[#383734] border-t-[#0F6E56] rounded-full animate-spin" />
          <p className="text-sm font-sans text-[#706E6A]">Loading position...</p>
        </div>
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#141413] flex items-center justify-center p-6 text-[#201F1D] dark:text-[#E8E6DF]">
        <div className="max-w-md w-full text-center space-y-4 p-8 border border-[#E8E6DF] dark:border-[#2A2926] rounded-lg bg-[#FFFFFF] dark:bg-[#1C1B19] shadow-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F4F3EF] dark:bg-[#262522] text-[#706E6A] mb-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-xl font-serif font-bold text-[#201F1D] dark:text-[#E8E6DF]">Position Closed</h2>
          <p className="text-sm text-[#706E6A] dark:text-[#9C9A94] leading-relaxed">
            This job is no longer accepting applications. Please check back later or explore other open opportunities.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#141413] text-[#201F1D] dark:text-[#E8E6DF] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* Header Branding */}
        <div className="border-b border-[#E8E6DF] dark:border-[#2A2926] pb-8">
          <span className="text-xs uppercase font-mono tracking-widest text-[#706E6A] dark:text-[#9C9A94]">
            {job.organizationName}
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-[#201F1D] dark:text-[#F4F3EF] mt-2 mb-4">
            {job.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {job.department && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-[#F4F3EF] dark:bg-[#262522] text-[#4A4844] dark:text-[#C2C0B8] border border-[#E8E6DF] dark:border-[#33322E]">
                {job.department}
              </span>
            )}
            {job.location && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-[#F4F3EF] dark:bg-[#262522] text-[#4A4844] dark:text-[#C2C0B8] border border-[#E8E6DF] dark:border-[#33322E]">
                {job.location}
              </span>
            )}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-[#E8F5E9] dark:bg-[#132A1C] text-[#0F6E56] dark:text-[#4ADE80] border border-[#C8E6C9] dark:border-[#1E462B]">
              Active Opening
            </span>
          </div>
        </div>

        {/* Job Description */}
        <div className="space-y-4">
          <h2 className="text-sm uppercase font-mono tracking-wider text-[#706E6A] dark:text-[#9C9A94]">
            About the Role
          </h2>
          <div className="text-base text-[#3B3A36] dark:text-[#C2C0B8] leading-relaxed whitespace-pre-wrap font-sans">
            {job.description}
          </div>
        </div>

        {/* Apply Section */}
        <div className="border-t border-[#E8E6DF] dark:border-[#2A2926] pt-10">
          <div className="bg-[#FFFFFF] dark:bg-[#1C1B19] border border-[#E8E6DF] dark:border-[#2A2926] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
            
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#201F1D] dark:text-[#F4F3EF]">
                Apply for this Position
              </h2>
              <p className="text-sm text-[#706E6A] dark:text-[#9C9A94] mt-1">
                Submit your details and resume directly to the hiring team.
              </p>
            </div>

            {success ? (
              <div className="p-6 rounded-lg bg-[#E8F5E9] dark:bg-[#132A1C] border border-[#C8E6C9] dark:border-[#1E462B] text-center space-y-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#0F6E56] text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 className="text-lg font-serif font-bold text-[#0F6E56] dark:text-[#4ADE80]">
                  Application Received
                </h3>
                <p className="text-sm text-[#1B4332] dark:text-[#A7F3D0] max-w-md mx-auto leading-relaxed">
                  Thank you for applying to <strong>{job.title}</strong> at <strong>{job.organizationName}</strong>. A confirmation email has been dispatched to your inbox.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMsg && (
                  <div className="p-3.5 rounded-lg bg-[#FEE2E2] dark:bg-[#2C1515] border border-[#FECACA] dark:border-[#4B2222] text-sm text-[#991B1B] dark:text-[#FCA5A5]">
                    {errorMsg}
                  </div>
                )}

                {/* Honeypot field for bot trapping */}
                <input
                  type="text"
                  name="_honeypot_trap"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="new-password"
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#4A4844] dark:text-[#C2C0B8]">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md border border-[#D8D5CC] dark:border-[#383734] bg-[#FFFFFF] dark:bg-[#141413] text-sm text-[#201F1D] dark:text-[#E8E6DF] focus:outline-none focus:ring-1 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#4A4844] dark:text-[#C2C0B8]">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md border border-[#D8D5CC] dark:border-[#383734] bg-[#FFFFFF] dark:bg-[#141413] text-sm text-[#201F1D] dark:text-[#E8E6DF] focus:outline-none focus:ring-1 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#4A4844] dark:text-[#C2C0B8]">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md border border-[#D8D5CC] dark:border-[#383734] bg-[#FFFFFF] dark:bg-[#141413] text-sm text-[#201F1D] dark:text-[#E8E6DF] focus:outline-none focus:ring-1 focus:ring-[#0F6E56] focus:border-[#0F6E56]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#4A4844] dark:text-[#C2C0B8]">
                    Resume (PDF, max 5 MB) *
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#D8D5CC] dark:border-[#383734] hover:border-[#0F6E56] dark:hover:border-[#0F6E56] rounded-lg p-6 text-center cursor-pointer transition-colors bg-[#FAFAF8] dark:bg-[#181716]"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="application/pdf"
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-1.5 text-sm text-[#706E6A] dark:text-[#9C9A94]">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                      {resume ? (
                        <span className="font-medium text-[#0F6E56] dark:text-[#4ADE80]">
                          {resume.name} ({(resume.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      ) : (
                        <span>
                          <strong className="text-[#0F6E56] dark:text-[#4ADE80] font-medium">Click to upload</strong> or drag and drop your PDF resume
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Disclosure Sentence required by policy */}
                <div className="rounded-md bg-[#F4F3EF] dark:bg-[#201F1D] p-3 text-xs text-[#5C5A55] dark:text-[#9C9A94] leading-relaxed border border-[#E8E6DF] dark:border-[#2A2926]">
                  ℹ️ Your resume may be analysed by AI to help the hiring team. Hiring decisions are made by people.
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-md bg-[#0F6E56] hover:bg-[#08503E] disabled:opacity-50 text-white font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </button>
              </form>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

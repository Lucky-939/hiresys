export function escapeHtml(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;
let testTransporter: nodemailer.Transporter | null = null;

export function __setTestTransporter(custom: nodemailer.Transporter | null) {
  testTransporter = custom;
}

function getFromAddress(): string {
  const user = process.env.SMTP_USER;
  if (user && user.includes("@")) {
    return `"HireSys" <${user}>`;
  }
  return `"HireSys" <no-reply@hiresys.com>`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function formatDateTimeWithTimezone(date?: Date | string | null): string {
  if (!date) return "Date and time to be confirmed";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Date and time to be confirmed";
  
  return d.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "UTC",
  });
}

async function initTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 465;
    const cleanPass = process.env.SMTP_PASS.replace(/\s+/g, "");
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      connectionTimeout: 8000,
      socketTimeout: 8000,
      auth: {
        user: process.env.SMTP_USER,
        pass: cleanPass,
      },
    });
    console.log(`[Email Service] Initialized Real SMTP transport (${process.env.SMTP_HOST || "smtp.gmail.com"})`);
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("[Email Service] Initialized Ethereal Email transport");
  }

  return transporter;
}

async function getActiveTransporter(): Promise<nodemailer.Transporter> {
  if (testTransporter) {
    return testTransporter;
  }
  return initTransporter();
}

export async function sendVerificationEmail(to: string, otp: string) {
  console.log(`[Email Service] 🔑 Verification code for ${to}: ${otp}`);
  try {
    const t = await getActiveTransporter();
    const info = await t.sendMail({
      from: getFromAddress(),
      to,
      subject: "Verify your Email Address - HireSys",
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px 0; background-color: #f7f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e5e5e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <tr>
            <td style="padding: 24px 32px; background-color: #0F6E56; color: #ffffff;">
              <span style="font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">HireSys</span>
              <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">Verify your Email</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">Welcome to HireSys! Please enter the verification code below to verify your email address and activate your workspace.</p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #166534; font-family: monospace;">${otp}</span>
              </div>
              <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">This code will expire in 10 minutes. If you did not create a HireSys account, please safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">HireSys &bull; Modern Recruitment & Evaluation</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log(`[Email Service] Verification email sent to ${maskEmail(to)}`);
  } catch (err: any) {
    console.error(`[Email Service] Failed to send verification email to ${maskEmail(to)}:`, err?.message || err);
  }
}

export async function sendPasswordResetEmail(to: string, token: string) {
  try {
    const t = await getActiveTransporter();
    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    const info = await t.sendMail({
      from: getFromAddress(),
      to,
      subject: "Reset your Password - HireSys",
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px 0; background-color: #f7f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e5e5e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <tr>
            <td style="padding: 24px 32px; background-color: #0F6E56; color: #ffffff;">
              <span style="font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">HireSys</span>
              <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">Password Reset Request</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">We received a request to reset your password. Click the button below to choose a new password.</p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #0F6E56; color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
              </div>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; line-height: 1.5;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">HireSys &bull; Modern Recruitment & Evaluation</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log(`[Email Service] Password reset email sent to ${maskEmail(to)}`);
  } catch (err: any) {
    console.error(`[Email Service] Failed to send password reset email to ${maskEmail(to)}:`, err?.message || err);
  }
}

export async function sendInviteEmail(to: string, token: string, inviterName: string, orgName: string) {
  try {
    const safeInviterName = escapeHtml(inviterName);
    const safeOrgName = escapeHtml(orgName);
    const t = await getActiveTransporter();
    const inviteLink = `${process.env.CLIENT_URL || "http://localhost:3000"}/invite/${encodeURIComponent(token)}`;
    
    const info = await t.sendMail({
      from: getFromAddress(),
      to,
      subject: `You've been invited to join ${safeOrgName} on HireSys`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px 0; background-color: #f7f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e5e5e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <tr>
            <td style="padding: 24px 32px; background-color: #0F6E56; color: #ffffff;">
              <span style="font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">HireSys</span>
              <h1 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">You're Invited!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;"><strong>${safeInviterName}</strong> has invited you to collaborate with their team at <strong>${safeOrgName}</strong> on HireSys.</p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${inviteLink}" style="background-color: #0F6E56; color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">Accept Team Invitation</a>
              </div>
              <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">This invite link will expire in 7 days.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">HireSys &bull; AI-Powered Recruitment Platform</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log(`[Email Service] Invite email sent to ${maskEmail(to)}`);
  } catch (err: any) {
    console.error(`[Email Service] Failed to send invite email to ${maskEmail(to)}:`, err?.message || err);
  }
}

export async function sendApplicationConfirmationEmail({
  to,
  candidateName,
  jobTitle,
  orgName,
}: {
  to: string;
  candidateName: string;
  jobTitle: string;
  orgName: string;
}) {
  try {
    const safeCandidateName = escapeHtml(candidateName);
    const safeJobTitle = escapeHtml(jobTitle);
    const safeOrgName = escapeHtml(orgName);
    const t = await getActiveTransporter();
    const info = await t.sendMail({
      from: getFromAddress(),
      to,
      subject: `Application Confirmed: ${jobTitle} at ${orgName}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Application Received</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f7f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e5e5e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <tr>
            <td style="padding: 24px 32px; background-color: #0F6E56; color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; background: rgba(255,255,255,0.18); border-radius: 6px; padding: 5px 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; color: #ffffff;">
                      HireSys
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Application Status</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 18px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">Application Submitted Successfully</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                Hello <strong>${safeCandidateName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">
                Thank you for applying for the <strong>${safeJobTitle}</strong> position at <strong>${safeOrgName}</strong>! We have successfully received your application and resume.
              </p>
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 14px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">Application Details</h3>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; width: 35%;">Role</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #111827;">${safeJobTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Company</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #111827;">${safeOrgName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Status</td>
                    <td style="padding: 6px 0;">
                      <span style="display: inline-block; background-color: #ecfdf5; color: #065f46; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 12px; border: 1px solid #a7f3d0;">Received &bull; Under Review</span>
                    </td>
                  </tr>
                </table>
              </div>
              <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #111827;">What to Expect Next</h3>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
                Our hiring team is currently evaluating applicant profiles. If your background matches what we're looking for, we will reach out directly with next steps for scheduling an interview.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #374151;">
                Warm regards,<br />
                <strong>The Hiring Team at ${safeOrgName}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                This automated confirmation was sent via HireSys on behalf of ${safeOrgName}.<br />
                Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log(`[Email Service] Application confirmation delivered to ${maskEmail(to)}`);
  } catch (err: any) {
    console.error(`[Email Service] Failed to send confirmation email to ${maskEmail(to)}:`, err?.message || err);
  }
}

export async function sendNewApplicationNotificationEmail({
  to,
  recruiterName,
  candidateName,
  candidateEmail,
  candidatePhone,
  candidateId,
  jobTitle,
  orgName,
}: {
  to: string;
  recruiterName: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string | null;
  candidateId: string;
  jobTitle: string;
  orgName: string;
}) {
  try {
    const safeRecruiterName = escapeHtml(recruiterName);
    const safeCandidateName = escapeHtml(candidateName);
    const safeCandidateEmail = escapeHtml(candidateEmail);
    const safeCandidatePhone = escapeHtml(candidatePhone || "");
    const safeJobTitle = escapeHtml(jobTitle);
    const safeOrgName = escapeHtml(orgName);
    const t = await getActiveTransporter();
    const candidateUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/dashboard/candidates/${candidateId}`;

    const info = await t.sendMail({
      from: getFromAddress(),
      to,
      subject: `New Application: ${candidateName} applied for ${jobTitle}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>New Applicant</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f7f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e5e5e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <tr>
            <td style="padding: 24px 32px; background-color: #0F6E56; color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; background: rgba(255,255,255,0.18); border-radius: 6px; padding: 5px 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; color: #ffffff;">
                      HireSys
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Candidate Notification</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 18px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">New Candidate Applied</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                Hello <strong>${recruiterName || "Hiring Team"}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">
                A new candidate has submitted an application for your open role: <strong>${jobTitle}</strong> at <strong>${orgName}</strong>.
              </p>
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 14px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">Applicant Details</h3>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; width: 35%;">Candidate</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #111827;">${safeCandidateName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Email</td>
                    <td style="padding: 6px 0; color: #111827;">
                      <a href="mailto:${candidateEmail}" style="color: #0F6E56; text-decoration: none; font-weight: 500;">${candidateEmail}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Phone</td>
                    <td style="padding: 6px 0; color: #111827;">${candidatePhone || "Not provided"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Target Job</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #111827;">${safeJobTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Pipeline Stage</td>
                    <td style="padding: 6px 0;">
                      <span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 12px; border: 1px solid #bae6fd;">Applied</span>
                    </td>
                  </tr>
                </table>
              </div>
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${candidateUrl}" style="display: inline-block; background-color: #0F6E56; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(15,110,86,0.2);">
                  Review Candidate in HireSys &rarr;
                </a>
              </div>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6b7280; text-align: center;">
                The submitted resume has been parsed and queued for automated AI analysis.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                You are receiving this notification because you created or manage the <strong>${jobTitle}</strong> requisition in HireSys.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log(`[Email Service] Recruiter notification delivered to ${maskEmail(to)}`);
  } catch (err: any) {
    console.error(`[Email Service] Failed to send recruiter notification to ${maskEmail(to)}:`, err?.message || err);
  }
}

/**
 * Candidate Interview Invite Email
 * Sent during interview scheduling or rescheduling. Includes credentials ONLY if a new account was provisioned.
 */
export async function sendCandidateInterviewInviteEmail({
  to,
  candidateName,
  interviewTitle,
  orgName,
  scheduledAt,
  roomId,
  credentials,
  isRescheduled = false,
}: {
  to: string;
  candidateName: string;
  interviewTitle: string;
  orgName: string;
  scheduledAt?: Date | string | null;
  roomId: string;
  credentials?: { email: string; password: string };
  isRescheduled?: boolean;
}) {
  const t = await getActiveTransporter();
  const safeCandidateName = escapeHtml(candidateName);
  const safeInterviewTitle = escapeHtml(interviewTitle);
  const safeOrgName = escapeHtml(orgName);
  const roomUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/room/${roomId}`;
  const timeFormatted = formatDateTimeWithTimezone(scheduledAt);
  const subjectPrefix = isRescheduled ? "Updated Interview Schedule: " : "Interview Invitation: ";
  const heading = isRescheduled ? "Your Interview Has Been Rescheduled" : "Your Interview is Scheduled";

  const credentialsHtml = credentials
    ? `
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #4b5563;">Your Candidate Account Credentials</h3>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #374151;">An account has been created for you to access the live interview coding room:</p>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #6b7280; width: 35%;">Login Email:</td>
            <td style="padding: 4px 0; font-weight: 600; color: #111827;">${credentials.email}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280;">Temporary Password:</td>
            <td style="padding: 4px 0; font-weight: 600; color: #111827;">
              <code style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 15px; color: #111827;">${credentials.password}</code>
            </td>
          </tr>
        </table>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #6b7280;">You can change your password anytime in your settings after signing in.</p>
      </div>
    `
    : `
      <p style="margin: 16px 0; font-size: 14px; line-height: 1.5; color: #4b5563;">
        Please sign in with your existing <strong>HireSys</strong> account credentials to access your interview room.
      </p>
    `;

  await t.sendMail({
    from: getFromAddress(),
    to,
    subject: `${subjectPrefix}${interviewTitle} with ${orgName}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f7f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e5e5e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <tr>
            <td style="padding: 24px 32px; background-color: #0F6E56; color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; background: rgba(255,255,255,0.18); border-radius: 6px; padding: 5px 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; color: #ffffff;">
                      HireSys
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Technical Interview</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 18px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                Hello <strong>${safeCandidateName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">
                Your technical interview session for <strong>${interviewTitle}</strong> at <strong>${orgName}</strong> is confirmed.
              </p>

              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 14px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">Interview Schedule</h3>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; width: 35%;">Date & Time</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #111827;">${timeFormatted}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Organization</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #111827;">${safeOrgName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Session Type</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #111827;">Live Coding & Technical Interview</td>
                  </tr>
                </table>
              </div>

              ${credentialsHtml}

              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${roomUrl}" style="display: inline-block; background-color: #0F6E56; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(15,110,86,0.2);">
                  Enter Coding Room &rarr;
                </a>
              </div>

              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6b7280; text-align: center;">
                If you are not signed in, opening the link will guide you to log in first and then automatically redirect you to the coding room.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                This invitation was sent via HireSys on behalf of ${safeOrgName}.<br />
                Good luck with your interview!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  console.log(`[Email Service] Candidate interview invite sent to ${maskEmail(to)}`);
}

/**
 * Interviewer Interview Invite Email
 * Sent during interview scheduling or rescheduling to the assigned interviewer.
 */
export async function sendInterviewerInterviewInviteEmail({
  to,
  interviewerName,
  candidateName,
  interviewTitle,
  orgName,
  scheduledAt,
  roomId,
  isRescheduled = false,
}: {
  to: string;
  interviewerName: string;
  candidateName: string;
  interviewTitle: string;
  orgName: string;
  scheduledAt?: Date | string | null;
  roomId: string;
  isRescheduled?: boolean;
}) {
  const t = await getActiveTransporter();
  const safeInterviewerName = escapeHtml(interviewerName);
  const safeCandidateName = escapeHtml(candidateName);
  const safeInterviewTitle = escapeHtml(interviewTitle);
  const safeOrgName = escapeHtml(orgName);
  const roomUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/room/${roomId}`;
  const timeFormatted = formatDateTimeWithTimezone(scheduledAt);
  const subjectPrefix = isRescheduled ? "Updated Interview Schedule: " : "Interview Scheduled: ";
  const heading = isRescheduled ? "Interview Rescheduled" : "Upcoming Interview Scheduled";

  await t.sendMail({
    from: getFromAddress(),
    to,
    subject: `${subjectPrefix}${candidateName} - ${interviewTitle} (${orgName})`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f7f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e5e5e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <tr>
            <td style="padding: 24px 32px; background-color: #0F6E56; color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; background: rgba(255,255,255,0.18); border-radius: 6px; padding: 5px 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; color: #ffffff;">
                      HireSys
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Interviewer Assignment</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 18px 0 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                Hello <strong>${safeInterviewerName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">
                You have been assigned to conduct an interview for <strong>${candidateName}</strong> for <strong>${interviewTitle}</strong> at <strong>${orgName}</strong>.
              </p>

              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 14px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">Session Details</h3>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; width: 35%;">Candidate</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #111827;">${safeCandidateName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Role</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #111827;">${safeInterviewTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Date & Time</td>
                    <td style="padding: 6px 0; font-weight: 600; color: #111827;">${timeFormatted}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${roomUrl}" style="display: inline-block; background-color: #0F6E56; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(15,110,86,0.2);">
                  Open Interview Room &rarr;
                </a>
              </div>

              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6b7280; text-align: center;">
                You will have access to real-time coding execution, AI question assistance, and private evaluation notes during the session.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                This notification was sent via HireSys on behalf of ${orgName}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  console.log(`[Email Service] Interviewer interview invite sent to ${maskEmail(to)}`);
}


export interface OutcomeEmailOptions {
  to: string;
  candidateName: string;
  jobTitle?: string | null;
  orgName: string;
  subject: string;
  message: string;
}

export function generateOutcomeEmailHtml(options: OutcomeEmailOptions): string {
  const safeCandidateName = escapeHtml(options.candidateName);
  const safeJobTitle = options.jobTitle ? escapeHtml(options.jobTitle) : null;
  const safeOrgName = escapeHtml(options.orgName || "HireSys");
  const safeSubject = escapeHtml(options.subject);

  // SEC-05: Escape message first, then convert newlines to <br/>
  const escapedMessage = escapeHtml(options.message);
  const formattedMessage = escapedMessage
    .split("\n\n")
    .map(p => `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${safeSubject}</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f7f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e5e5e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <!-- Header Banner (Ledger Style Flat Solid Colour, No Gradients) -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0F6E56; color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: rgba(255,255,255,0.18); border-radius: 6px; padding: 5px 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; color: #ffffff;">
                      ${safeOrgName}
                    </div>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Application Update</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 18px 0 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">${safeJobTitle ? `${safeJobTitle} Update` : "Application Update"}</h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              ${formattedMessage}

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />

              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #374151;">
                Warm regards,<br />
                <strong>The Hiring Team at ${safeOrgName}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                This message was sent by ${safeOrgName} via HireSys.<br />
                &copy; ${new Date().getFullYear()} ${safeOrgName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOutcomeEmail(options: OutcomeEmailOptions): Promise<{ success: boolean; messageId?: string }> {
  const { to, subject, message } = options;
  try {
    const t = await getActiveTransporter();
    const html = generateOutcomeEmailHtml(options);
    const info = await t.sendMail({
      from: getFromAddress(),
      to,
      subject,
      text: message,
      html,
    });
    console.log(`[Email Service] Outcome email sent to ${maskEmail(to)}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email Service] Failed to send outcome email to ${maskEmail(to)}:`, err?.message || err);
    throw err;
  }
}

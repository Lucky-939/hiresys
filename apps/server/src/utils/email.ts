import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

async function initTransporter() {
  if (transporter) return transporter;

  // If SMTP credentials are provided in .env, use them (Real Gmail)
  // Otherwise fallback to Ethereal mock for local dev without credentials
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log("[Email Service] Initialized Real SMTP transport");
  } else {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    console.log("[Email Service] Initialized Ethereal Email transport");
  }

  return transporter;
}

export async function sendVerificationEmail(to: string, otp: string) {
  try {
    const t = await initTransporter();
    const info = await t.sendMail({
      from: '"HireSys" <no-reply@hiresys.com>',
      to,
      subject: "Verify your Email Address",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; padding: 24px;">
          <h2 style="color: #333; margin-top: 0;">Welcome to HireSys!</h2>
          <p style="color: #555;">Please enter the following code to verify your email address:</p>
          <div style="background-color: #f5f5f5; border-radius: 6px; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111; margin: 24px 0;">
            ${otp}
          </div>
          <p style="color: #555; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`\n==============================================`);
      console.log(`✉️ Email sent to ${to}`);
      console.log(`👉 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      console.log(`==============================================\n`);
    }
  } catch (err) {
    console.error(`[Email Service] Failed to send email to ${to}:`, err);
    console.log(`[Email Service Fallback] OTP for ${to} is: ${otp}`);
  }
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const t = await initTransporter();
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  
  const info = await t.sendMail({
    from: '"HireSys" <no-reply@hiresys.com>',
    to,
    subject: "Reset your Password",
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; padding: 24px;">
        <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #555;">You requested to reset your password. Click the button below to set a new password:</p>
        <div style="margin: 32px 0;">
          <a href="${resetLink}" style="background-color: #0ea5e9; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #555; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n==============================================`);
    console.log(`✉️ Password reset email sent to ${to}`);
    console.log(`👉 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log(`==============================================\n`);
  }
}

export async function sendInviteEmail(to: string, token: string, inviterName: string, orgName: string) {
  const t = await initTransporter();
  const inviteLink = `${process.env.CLIENT_URL}/invite/${token}`;
  
  const info = await t.sendMail({
    from: '"HireSys" <no-reply@hiresys.com>',
    to,
    subject: `You've been invited to join ${orgName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; padding: 24px;">
        <h2 style="color: #333; margin-top: 0;">You're Invited!</h2>
        <p style="color: #555;"><strong>${inviterName}</strong> has invited you to join their team at <strong>${orgName}</strong> on HireSys.</p>
        <div style="margin: 32px 0;">
          <a href="${inviteLink}" style="background-color: #0ea5e9; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">Accept Invitation</a>
        </div>
        <p style="color: #555; font-size: 14px;">This link will expire in 7 days.</p>
      </div>
    `,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n==============================================`);
    console.log(`✉️ Invite email sent to ${to}`);
    console.log(`👉 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log(`==============================================\n`);
  }
}

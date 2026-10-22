import { InterviewRepository } from "./interview.repository";
import { OrgRepository } from "../organizations/org.repository";
import { AppError } from "../../utils/errors";
import { InterviewStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { redis } from "../../config/redis";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  sendCandidateInterviewInviteEmail,
  sendInterviewerInterviewInviteEmail,
} from "../../utils/email";
import { assertTeamMember, assertOrgMember } from "../../utils/rbac";

const repo = new InterviewRepository();
const orgRepo = new OrgRepository();

export class InterviewService {
  async create(data: {
    title: string;
    description?: string;
    scheduledAt?: string;
    organizationId: string;
    userId: string;
    candidateId?: string;
    interviewerId?: string;
  }) {
    const member = await assertTeamMember(data.organizationId, data.userId);
    if (!["OWNER", "ADMIN", "RECRUITER"].includes(member.role)) {
      throw new AppError("Insufficient permissions to create interview", 403);
    }

    let candidate: any = null;
    let interviewer: any = null;
    let candEmailTrimmed = "";

    // 1. Candidate lookup & collision checks
    if (data.candidateId) {
      candidate = await prisma.candidate.findUnique({
        where: { id: data.candidateId },
        include: { job: true },
      });
      if (!candidate) {
        throw new AppError("Candidate not found", 404);
      }
      candEmailTrimmed = candidate.email.trim().toLowerCase();

      // Check team-member email collision:
      // If candidate's email matches an existing team member (OWNER, ADMIN, RECRUITER, INTERVIEWER) in this org, refuse
      const teamMemberCollision = await prisma.user.findFirst({
        where: {
          email: { equals: candidate.email.trim(), mode: "insensitive" },
          organizations: {
            some: {
              organizationId: data.organizationId,
              role: { in: ["OWNER", "ADMIN", "RECRUITER", "INTERVIEWER"] },
            },
          },
        },
      });

      if (teamMemberCollision) {
        throw new AppError(
          "Candidate email conflicts with an existing team member in this organization",
          400
        );
      }
    }

    // 2. Interviewer lookup & candidate-equals-interviewer check
    if (data.interviewerId) {
      interviewer = await prisma.user.findUnique({
        where: { id: data.interviewerId },
      });
      if (!interviewer) {
        throw new AppError("Interviewer not found", 404);
      }

      if (candidate) {
        const intEmailTrimmed = interviewer.email.trim().toLowerCase();
        if (candEmailTrimmed === intEmailTrimmed) {
          throw new AppError(
            "Candidate and interviewer cannot be the same person",
            400
          );
        }
      }
    }

    // 3. Provision candidate account at scheduling time if candidate has no login
    let isNewAccount = false;
    let tempPassword = "";

    if (candidate) {
      let existingUser = await prisma.user.findFirst({
        where: {
          email: { equals: candidate.email.trim(), mode: "insensitive" },
        },
      });

      if (!existingUser) {
        // Create new candidate account with random 12-char hex password
        isNewAccount = true;
        tempPassword = crypto.randomBytes(6).toString("hex");
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        existingUser = await prisma.user.create({
          data: {
            name: candidate.name,
            email: candEmailTrimmed,
            password: hashedPassword,
            emailVerified: new Date(),
          },
        });
      }

      // Ensure CANDIDATE membership exists for this organization
      const existingMembership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: data.organizationId,
          },
        },
      });

      if (!existingMembership) {
        await prisma.organizationMember.create({
          data: {
            userId: existingUser.id,
            organizationId: data.organizationId,
            role: "CANDIDATE",
          },
        });
      }
    }

    // 4. Create the interview record in DB
    const scheduledDate = data.scheduledAt ? new Date(data.scheduledAt) : undefined;
    const interview = await repo.create({
      title: data.title,
      description: data.description,
      scheduledAt: scheduledDate,
      organizationId: data.organizationId,
      createdById: data.userId,
      candidateId: data.candidateId,
      interviewerId: data.interviewerId,
    });

    // 5. Dispatch candidate & interviewer invite emails
    const org = await orgRepo.findById(data.organizationId);
    const orgName = org?.name || "HireSys";

    let candidateInviteSentAt: Date | null = null;
    let candidateInviteFailed = false;
    let interviewerInviteSentAt: Date | null = null;
    let interviewerInviteFailed = false;

    if (candidate) {
      try {
        await sendCandidateInterviewInviteEmail({
          to: candidate.email.trim(),
          candidateName: candidate.name,
          interviewTitle: data.title,
          orgName,
          scheduledAt: scheduledDate,
          roomId: interview.id,
          credentials: isNewAccount && tempPassword
            ? { email: candidate.email.trim(), password: tempPassword }
            : undefined,
        });
        candidateInviteSentAt = new Date();
      } catch (err) {
        candidateInviteFailed = true;
      }
    }

    if (interviewer) {
      try {
        await sendInterviewerInterviewInviteEmail({
          to: interviewer.email.trim(),
          interviewerName: interviewer.name,
          candidateName: candidate ? candidate.name : "Candidate",
          interviewTitle: data.title,
          orgName,
          scheduledAt: scheduledDate,
          roomId: interview.id,
        });
        interviewerInviteSentAt = new Date();
      } catch (err) {
        interviewerInviteFailed = true;
      }
    }

    // If candidate email failed for a new account, set needsPasswordReset
    const needsPasswordReset = isNewAccount && candidateInviteFailed;

    // Update interview with invite tracking
    const updatedInterview = await prisma.interview.update({
      where: { id: interview.id },
      data: {
        candidateInviteSentAt,
        interviewerInviteSentAt,
        candidateInviteFailed,
        interviewerInviteFailed,
        needsPasswordReset,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        candidate: { select: { id: true, name: true, email: true } },
        interviewer: { select: { id: true, name: true, email: true } },
      },
    });

    // Construct warning message for recruiter if any invite failed
    let warning: string | undefined = undefined;
    if (candidateInviteFailed && interviewerInviteFailed) {
      warning = "Interview was scheduled, but invite emails to both the candidate and interviewer failed to send. You can resend the invites later.";
    } else if (candidateInviteFailed) {
      warning = "Interview was scheduled, but the invite email to the candidate failed to send. You can resend the invite later.";
    } else if (interviewerInviteFailed) {
      warning = "Interview was scheduled, but the invite email to the interviewer failed to send. You can resend the invite later.";
    }

    return { interview: updatedInterview, warning };
  }

  async getByOrg(organizationId: string, userId: string) {
    const member = await assertTeamMember(organizationId, userId);
    const interviews = await repo.findByOrg(organizationId);

    if (["OWNER", "ADMIN", "RECRUITER"].includes(member.role)) {
      return interviews;
    } else if (member.role === "INTERVIEWER") {
      return interviews.filter((i) => i.interviewerId === userId);
    }

    throw new AppError("Insufficient permissions to view interviews", 403);
  }

  async assertInterviewer(id: string, userId: string) {
    const interview = await repo.findById(id);
    if (!interview) throw new AppError("Interview not found", 404);
    const member = await assertOrgMember(interview.organizationId, userId);

    const isGlobalViewer = ["OWNER", "ADMIN", "RECRUITER"].includes(member.role);
    const isAssignedInterviewer = userId === interview.interviewerId;

    if (!isGlobalViewer && !isAssignedInterviewer) {
      throw new AppError("Access denied: You are not assigned to this interview", 403);
    }
    return interview;
  }

  async getById(id: string, userId: string) {
    const interview = await repo.findById(id);
    if (!interview) throw new AppError("Interview not found", 404);
    const member = await assertOrgMember(interview.organizationId, userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    const candEmail = interview.candidate?.email?.trim().toLowerCase();
    const userEmail = user.email?.trim().toLowerCase();
    const isCandidate = Boolean(candEmail && userEmail && candEmail === userEmail);
    const isGlobalViewer = ["OWNER", "ADMIN", "RECRUITER"].includes(member.role);
    const isAssignedInterviewer = user.id === interview.interviewerId;

    if (isCandidate) {
      // Scrub private interviewer data before returning
      return {
        ...interview,
        isCandidate: true,
        userRole: "CANDIDATE",
        currentUserName: user.name,
        currentUserEmail: user.email,
        interviewNotes: null,
        report: null,
      };
    } else if (!isGlobalViewer && !isAssignedInterviewer) {
      throw new AppError("Access denied: You are not assigned to this interview", 403);
    }

    return {
      ...interview,
      isCandidate: false,
      userRole: member.role,
      currentUserName: user.name,
      currentUserEmail: user.email,
    };
  }

  async assertCanExecuteCode(id: string, userId: string) {
    const interview = await repo.findById(id);
    if (!interview) throw new AppError("Interview not found", 404);
    const member = await assertOrgMember(interview.organizationId, userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    const candEmail = interview.candidate?.email?.trim().toLowerCase();
    const userEmail = user.email?.trim().toLowerCase();
    const isCandidate = Boolean(candEmail && userEmail && candEmail === userEmail);
    const isAssignedInterviewer = user.id === interview.interviewerId;
    const isGlobalViewer = ["OWNER", "ADMIN", "RECRUITER"].includes(member.role);

    if (!isCandidate && !isAssignedInterviewer && !isGlobalViewer) {
      throw new AppError(
        "Access denied: Only the assigned interviewer, candidate, or recruiter can execute code",
        403
      );
    }

    return interview;
  }

  async update(
    id: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      status?: InterviewStatus;
      scheduledAt?: string;
      candidateId?: string | null;
      codeSubmitted?: string;
      language?: string;
      interviewNotes?: string;
      interviewerId?: string | null;
    }
  ) {
    const interview = await repo.findById(id);
    if (!interview) throw new AppError("Interview not found", 404);
    const member = await assertOrgMember(interview.organizationId, userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    const candEmail = interview.candidate?.email?.trim().toLowerCase();
    const userEmail = user.email?.trim().toLowerCase();
    const isCandidate = Boolean(candEmail && userEmail && candEmail === userEmail);
    const isGlobalViewer = ["OWNER", "ADMIN", "RECRUITER"].includes(member.role);
    const isAssignedInterviewer = user.id === interview.interviewerId;

    if (!isCandidate && !isGlobalViewer && !isAssignedInterviewer) {
      throw new AppError("Access denied: You are not assigned to this interview", 403);
    }

    if (interview.status === "COMPLETED") {
      throw new AppError("Completed interviews cannot be modified.", 409);
    }

    // Candidates can ONLY update their code and language
    if (isCandidate) {
      const updated = await repo.update(id, {
        codeSubmitted: data.codeSubmitted,
        language: data.language,
      });
      return { interview: updated };
    }

    // Check if interview is being rescheduled
    const isReschedule = Boolean(
      data.scheduledAt &&
        (!interview.scheduledAt ||
          new Date(data.scheduledAt).getTime() !== interview.scheduledAt.getTime())
    );

    const scheduledDate = data.scheduledAt ? new Date(data.scheduledAt) : undefined;
    let candidateInviteSentAt = interview.candidateInviteSentAt;
    let interviewerInviteSentAt = interview.interviewerInviteSentAt;
    let candidateInviteFailed = interview.candidateInviteFailed;
    let interviewerInviteFailed = interview.interviewerInviteFailed;
    let warning: string | undefined = undefined;

    if (isReschedule) {
      const org = await orgRepo.findById(interview.organizationId);
      const orgName = org?.name || "HireSys";

      if (interview.candidate) {
        try {
          await sendCandidateInterviewInviteEmail({
            to: interview.candidate.email.trim(),
            candidateName: interview.candidate.name,
            interviewTitle: data.title || interview.title,
            orgName,
            scheduledAt: scheduledDate,
            roomId: interview.id,
            credentials: undefined, // Never touch or reset password on reschedule
            isRescheduled: true,
          });
          candidateInviteSentAt = new Date();
          candidateInviteFailed = false;
        } catch {
          candidateInviteFailed = true;
        }
      }

      const interviewerUser = data.interviewerId
        ? await prisma.user.findUnique({ where: { id: data.interviewerId } })
        : interview.interviewer;

      if (interviewerUser && interviewerUser.email) {
        try {
          await sendInterviewerInterviewInviteEmail({
            to: interviewerUser.email.trim(),
            interviewerName: interviewerUser.name,
            candidateName: interview.candidate ? interview.candidate.name : "Candidate",
            interviewTitle: data.title || interview.title,
            orgName,
            scheduledAt: scheduledDate,
            roomId: interview.id,
            isRescheduled: true,
          });
          interviewerInviteSentAt = new Date();
          interviewerInviteFailed = false;
        } catch {
          interviewerInviteFailed = true;
        }
      }

      if (candidateInviteFailed && interviewerInviteFailed) {
        warning = "Interview was rescheduled, but updated invite emails to both candidate and interviewer failed to send.";
      } else if (candidateInviteFailed) {
        warning = "Interview was rescheduled, but updated invite email to candidate failed to send.";
      } else if (interviewerInviteFailed) {
        warning = "Interview was rescheduled, but updated invite email to interviewer failed to send.";
      }
    } else {
      // Handle interviewer change/assignment when not rescheduling
      if (data.interviewerId !== undefined && data.interviewerId !== interview.interviewerId) {
        if (data.interviewerId) {
          const interviewerUser = await prisma.user.findUnique({
            where: { id: data.interviewerId },
          });
          if (!interviewerUser) {
            throw new AppError("Interviewer not found", 404);
          }

          if (interview.candidate && interviewerUser.email) {
            const candEmailTrimmed = interview.candidate.email.trim().toLowerCase();
            const intEmailTrimmed = interviewerUser.email.trim().toLowerCase();
            if (candEmailTrimmed === intEmailTrimmed) {
              throw new AppError(
                "Candidate and interviewer cannot be the same person",
                400
              );
            }
          }

          const org = await orgRepo.findById(interview.organizationId);
          const orgName = org?.name || "HireSys";

          try {
            await sendInterviewerInterviewInviteEmail({
              to: interviewerUser.email.trim(),
              interviewerName: interviewerUser.name,
              candidateName: interview.candidate ? interview.candidate.name : "Candidate",
              interviewTitle: data.title || interview.title,
              orgName,
              scheduledAt: scheduledDate || (interview.scheduledAt ?? undefined),
              roomId: interview.id,
              isRescheduled: false,
            });
            interviewerInviteSentAt = new Date();
            interviewerInviteFailed = false;
          } catch {
            interviewerInviteFailed = true;
            warning = "Interviewer was assigned, but the invite email failed to send.";
          }
        } else {
          interviewerInviteSentAt = null;
          interviewerInviteFailed = false;
        }
      }

      // Handle candidate change/assignment when not rescheduling
      if (data.candidateId !== undefined && data.candidateId !== interview.candidateId) {
        if (data.candidateId) {
          const candidateRecord = await prisma.candidate.findUnique({
            where: { id: data.candidateId },
          });
          if (candidateRecord) {
            const org = await orgRepo.findById(interview.organizationId);
            const orgName = org?.name || "HireSys";

            try {
              await sendCandidateInterviewInviteEmail({
                to: candidateRecord.email.trim(),
                candidateName: candidateRecord.name,
                interviewTitle: data.title || interview.title,
                orgName,
                scheduledAt: scheduledDate || (interview.scheduledAt ?? undefined),
                roomId: interview.id,
                credentials: undefined,
                isRescheduled: false,
              });
              candidateInviteSentAt = new Date();
              candidateInviteFailed = false;
            } catch {
              candidateInviteFailed = true;
              warning = warning
                ? `${warning} Candidate invite email failed to send.`
                : "Candidate was assigned, but the invite email failed to send.";
            }
          }
        } else {
          candidateInviteSentAt = null;
          candidateInviteFailed = false;
        }
      }
    }

    const safeData: any = {};
    if (data.title !== undefined) safeData.title = data.title;
    if (data.description !== undefined) safeData.description = data.description;
    if (data.status !== undefined) safeData.status = data.status;
    if (data.candidateId !== undefined) safeData.candidateId = data.candidateId;
    if (data.interviewerId !== undefined) safeData.interviewerId = data.interviewerId;
    if (data.interviewNotes !== undefined) safeData.interviewNotes = data.interviewNotes;
    if (data.codeSubmitted !== undefined) safeData.codeSubmitted = data.codeSubmitted;
    if (data.language !== undefined) safeData.language = data.language;

    const updated = await repo.update(id, {
      ...safeData,
      scheduledAt: scheduledDate,
      candidateInviteSentAt,
      interviewerInviteSentAt,
      candidateInviteFailed,
      interviewerInviteFailed,
    });

    return { interview: updated, warning };
  }

  async resendInvite(id: string, userId: string) {
    const interview = await repo.findById(id);
    if (!interview) throw new AppError("Interview not found", 404);

    const member = await assertTeamMember(interview.organizationId, userId);
    if (!["OWNER", "ADMIN", "RECRUITER"].includes(member.role)) {
      throw new AppError("Insufficient permissions to resend invite", 403);
    }

    // Rate limiting: 3 per hour per interview in Redis
    const rateKey = `ratelimit:resend_invite:${id}`;
    const count = await redis.incr(rateKey);
    if (count === 1) {
      await redis.expire(rateKey, 3600);
    }
    if (count > 3) {
      throw new AppError(
        "Rate limit exceeded: You can only resend invites 3 times per hour for this interview",
        429
      );
    }

    const org = await orgRepo.findById(interview.organizationId);
    const orgName = org?.name || "HireSys";

    let candidateInviteSentAt = interview.candidateInviteSentAt;
    let candidateInviteFailed = interview.candidateInviteFailed;
    let interviewerInviteSentAt = interview.interviewerInviteSentAt;
    let interviewerInviteFailed = interview.interviewerInviteFailed;
    let needsPasswordReset = interview.needsPasswordReset;

    let candEmailSent = false;
    let intEmailSent = false;

    // Resend to candidate
    if (interview.candidate) {
      let credentials: { email: string; password: string } | undefined = undefined;

      // If needsPasswordReset is true (i.e. new account whose initial email failed)
      if (needsPasswordReset) {
        const freshPassword = crypto.randomBytes(6).toString("hex");
        const hashedPassword = await bcrypt.hash(freshPassword, 12);

        await prisma.user.update({
          where: { email: interview.candidate.email.trim().toLowerCase() },
          data: { password: hashedPassword },
        });

        credentials = {
          email: interview.candidate.email.trim(),
          password: freshPassword,
        };
      }

      try {
        await sendCandidateInterviewInviteEmail({
          to: interview.candidate.email.trim(),
          candidateName: interview.candidate.name,
          interviewTitle: interview.title,
          orgName,
          scheduledAt: interview.scheduledAt,
          roomId: interview.id,
          credentials,
        });
        candidateInviteSentAt = new Date();
        candidateInviteFailed = false;
        needsPasswordReset = false;
        candEmailSent = true;
      } catch (err) {
        candidateInviteFailed = true;
      }
    }

    // Resend to interviewer
    if (interview.interviewer && interview.interviewer.email) {
      try {
        await sendInterviewerInterviewInviteEmail({
          to: interview.interviewer.email.trim(),
          interviewerName: interview.interviewer.name,
          candidateName: interview.candidate ? interview.candidate.name : "Candidate",
          interviewTitle: interview.title,
          orgName,
          scheduledAt: interview.scheduledAt,
          roomId: interview.id,
        });
        interviewerInviteSentAt = new Date();
        interviewerInviteFailed = false;
        intEmailSent = true;
      } catch (err) {
        interviewerInviteFailed = true;
      }
    }

    const updated = await prisma.interview.update({
      where: { id },
      data: {
        candidateInviteSentAt,
        interviewerInviteSentAt,
        candidateInviteFailed,
        interviewerInviteFailed,
        needsPasswordReset,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        candidate: { select: { id: true, name: true, email: true } },
        interviewer: { select: { id: true, name: true, email: true } },
      },
    });

    let warning: string | undefined = undefined;
    if (candidateInviteFailed && interviewerInviteFailed) {
      warning = "Resend attempted, but both emails failed to deliver.";
    } else if (candidateInviteFailed) {
      warning = "Resend attempted, but candidate invite email failed to deliver.";
    } else if (interviewerInviteFailed) {
      warning = "Resend attempted, but interviewer invite email failed to deliver.";
    }

    return {
      message: "Invites resent successfully",
      interview: updated,
      warning,
    };
  }

  async getCandidateRoomLink(id: string, userId: string) {
    const interview = await repo.findById(id);
    if (!interview) throw new AppError("Interview not found", 404);

    const member = await assertTeamMember(interview.organizationId, userId);
    if (!["OWNER", "ADMIN", "RECRUITER", "INTERVIEWER"].includes(member.role)) {
      throw new AppError("Insufficient permissions to get candidate room link", 403);
    }

    if (!interview.candidate) {
      throw new AppError("No candidate assigned to this interview", 400);
    }

    const candEmail = interview.candidate.email.trim().toLowerCase();

    // Ensure candidate user exists in database
    let candidateUser = await prisma.user.findFirst({
      where: { email: { equals: candEmail, mode: "insensitive" } },
    });

    if (!candidateUser) {
      const randomPassword = crypto.randomBytes(8).toString("hex");
      candidateUser = await prisma.user.create({
        data: {
          name: interview.candidate.name,
          email: candEmail,
          password: await bcrypt.hash(randomPassword, 12),
          emailVerified: new Date(),
        },
      });
    }

    // Ensure candidate has membership in organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: candidateUser.id,
          organizationId: interview.organizationId,
        },
      },
    });

    if (!membership) {
      await prisma.organizationMember.create({
        data: {
          userId: candidateUser.id,
          organizationId: interview.organizationId,
          role: "CANDIDATE",
        },
      });
    }

    // Generate JWT token valid for 7 days
    const token = jwt.sign(
      { sub: candidateUser.id, email: candidateUser.email, role: "CANDIDATE" },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const roomUrl = `${clientUrl}/room/${interview.id}?token=${token}`;

    return {
      roomUrl,
      token,
      candidateName: interview.candidate.name,
      candidateEmail: interview.candidate.email,
      interviewTitle: interview.title,
    };
  }

  async delete(id: string, userId: string) {
    const interview = await repo.findById(id);
    if (!interview) throw new AppError("Interview not found", 404);
    const member = await assertTeamMember(interview.organizationId, userId);

    if (!["OWNER", "ADMIN", "RECRUITER"].includes(member.role)) {
      throw new AppError("Insufficient permissions to delete interview", 403);
    }

    return repo.delete(id);
  }
}

import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { InterviewService } from "./interview.service";

const service = new InterviewService();

export async function createInterview(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await service.create({
      ...req.body,
      userId: req.userId!,
    });
    res.status(201).json({
      success: true,
      data: result.interview,
      warning: result.warning,
    });
  } catch (err) {
    next(err);
  }
}

export async function getInterviews(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const interviews = await service.getByOrg(
      req.params.orgId as string,
      req.userId!,
    );
    res.json({ success: true, data: interviews });
  } catch (err) {
    next(err);
  }
}

export async function getInterview(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const interview = await service.getById(
      req.params.id as string,
      req.userId!,
    );
    res.json({ success: true, data: interview });
  } catch (err) {
    next(err);
  }
}

export async function updateInterview(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await service.update(
      req.params.id as string,
      req.userId!,
      req.body,
    );
    res.json({
      success: true,
      data: result.interview,
      warning: result.warning,
    });
  } catch (err) {
    next(err);
  }
}

export async function resendInvite(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await service.resendInvite(
      req.params.id as string,
      req.userId!,
    );
    res.json({
      success: true,
      message: result.message,
      data: result.interview,
      warning: result.warning,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCandidateRoomLink(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await service.getCandidateRoomLink(
      req.params.id as string,
      req.userId!,
    );
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteInterview(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await service.delete(req.params.id as string, req.userId!);
    res.json({ success: true, message: "Interview deleted" });
  } catch (err) {
    next(err);
  }
}

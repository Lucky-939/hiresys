import { OrgRepository } from "./org.repository";
import { AppError } from "../../utils/errors";

const repo = new OrgRepository();

export class OrgService {
  async createOrg(name: string, ownerId: string) {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const existing = await repo.findBySlug(slug);
    if (existing) {
      throw new AppError("An organization with this name already exists", 409);
    }

    return repo.create({ name, slug, ownerId });
  }

  async getUserOrgs(userId: string) {
    return repo.findUserOrgs(userId);
  }

  async getOrgById(id: string, userId: string) {
    const org = await repo.findById(id);
    if (!org) throw new AppError("Organization not found", 404);

    const isMember = org.members.some((m) => m.userId === userId);
    if (!isMember) throw new AppError("Access denied", 403);

    return org;
  }
}

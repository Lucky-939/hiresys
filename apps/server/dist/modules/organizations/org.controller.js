"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrg = createOrg;
exports.getMyOrgs = getMyOrgs;
exports.getOrgById = getOrgById;
exports.getMembers = getMembers;
exports.inviteMember = inviteMember;
exports.updateMemberRole = updateMemberRole;
exports.removeMember = removeMember;
exports.getInvite = getInvite;
exports.acceptInvite = acceptInvite;
const org_service_1 = require("./org.service");
const service = new org_service_1.OrgService();
async function createOrg(req, res, next) {
    try {
        const { name } = req.body;
        const org = await service.createOrg(name, req.userId);
        res.status(201).json({ success: true, data: org });
    }
    catch (err) {
        next(err);
    }
}
async function getMyOrgs(req, res, next) {
    try {
        const orgs = await service.getUserOrgs(req.userId);
        res.json({ success: true, data: orgs });
    }
    catch (err) {
        next(err);
    }
}
async function getOrgById(req, res, next) {
    try {
        const org = await service.getOrgById(req.params.id, req.userId);
        res.json({ success: true, data: org });
    }
    catch (err) {
        next(err);
    }
}
// --- Members ---
async function getMembers(req, res, next) {
    try {
        const members = await service.getMembers(req.params.orgId);
        res.json({ success: true, data: members });
    }
    catch (err) {
        next(err);
    }
}
async function inviteMember(req, res, next) {
    try {
        const { email, role } = req.body;
        const invite = await service.inviteMember(req.params.orgId, email, role, req.userId);
        res.json({ success: true, data: invite });
    }
    catch (err) {
        next(err);
    }
}
async function updateMemberRole(req, res, next) {
    try {
        const { role } = req.body;
        const member = await service.updateMemberRole(req.params.orgId, req.params.userId, role, req.userId);
        res.json({ success: true, data: member });
    }
    catch (err) {
        next(err);
    }
}
async function removeMember(req, res, next) {
    try {
        await service.removeMember(req.params.orgId, req.params.userId, req.userId);
        res.json({ success: true, data: null });
    }
    catch (err) {
        next(err);
    }
}
// --- Invites ---
async function getInvite(req, res, next) {
    try {
        const invite = await service.getInviteByToken(req.params.token);
        res.json({ success: true, data: invite });
    }
    catch (err) {
        next(err);
    }
}
async function acceptInvite(req, res, next) {
    try {
        const result = await service.acceptInvite(req.params.token, req.userId);
        res.json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
}

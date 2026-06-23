"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCandidateDecision = exports.updateCandidateStage = exports.deleteCandidate = exports.updateCandidate = exports.getCandidateById = exports.getCandidatesByOrg = exports.createCandidate = exports.exportCandidatesCSV = void 0;
const candidate_service_1 = require("./candidate.service");
const candidateService = new candidate_service_1.CandidateService();
const exportCandidatesCSV = async (req, res, next) => {
    try {
        const userId = req.userId;
        const orgId = req.params.orgId;
        const csvData = await candidateService.exportCandidatesCSV(orgId, userId);
        res.header("Content-Type", "text/csv");
        res.attachment(`candidates-${orgId}-${new Date().toISOString().split("T")[0]}.csv`);
        res.send(csvData);
    }
    catch (err) {
        next(err);
    }
};
exports.exportCandidatesCSV = exportCandidatesCSV;
const createCandidate = async (req, res) => {
    const data = req.body;
    const candidate = await candidateService.createCandidate({
        ...data,
        userId: req.userId,
    });
    res.status(201).json({ success: true, data: candidate });
};
exports.createCandidate = createCandidate;
const getCandidatesByOrg = async (req, res) => {
    const orgId = req.params.orgId;
    const candidates = await candidateService.getCandidatesByOrg(orgId, req.userId);
    res.json({ success: true, data: candidates });
};
exports.getCandidatesByOrg = getCandidatesByOrg;
const getCandidateById = async (req, res) => {
    const id = req.params.id;
    const data = await candidateService.getCandidateById(id, req.userId);
    res.json({ success: true, data });
};
exports.getCandidateById = getCandidateById;
const updateCandidate = async (req, res) => {
    const id = req.params.id;
    const data = req.body;
    const candidate = await candidateService.updateCandidate(id, req.userId, data);
    res.json({ success: true, data: candidate });
};
exports.updateCandidate = updateCandidate;
const deleteCandidate = async (req, res) => {
    const id = req.params.id;
    await candidateService.deleteCandidate(id, req.userId);
    res.json({ success: true, message: "Candidate deleted successfully" });
};
exports.deleteCandidate = deleteCandidate;
const updateCandidateStage = async (req, res) => {
    const id = req.params.id;
    const { stage } = req.body;
    const candidate = await candidateService.moveCandidateStage(id, stage, req.userId);
    res.json({ success: true, data: candidate });
};
exports.updateCandidateStage = updateCandidateStage;
const updateCandidateDecision = async (req, res) => {
    const id = req.params.id;
    const { decision, notes } = req.body;
    const candidate = await candidateService.makeHiringDecision(id, decision, notes, req.userId);
    res.json({ success: true, data: candidate });
};
exports.updateCandidateDecision = updateCandidateDecision;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
exports.analyzeResume = analyzeResume;
exports.getResumeStatus = getResumeStatus;
const errors_1 = require("../../utils/errors");
const cache_1 = require("../../config/cache");
const resume_queue_1 = require("../../queues/resume.queue");
const multer_1 = __importDefault(require("multer"));
const crypto_1 = require("crypto");
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        }
        else {
            cb(new Error("Only PDF files are allowed"));
        }
    },
});
async function extractTextFromPDF(buffer) {
    try {
        // Magic number validation for PDF (%PDF-)
        if (buffer.length < 5 || buffer.toString('utf8', 0, 5) !== '%PDF-') {
            throw new errors_1.AppError("Invalid file signature. Only actual PDF files are allowed.", 400);
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "";
        const uint8Array = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true,
        });
        const pdfDoc = await loadingTask.promise;
        let fullText = "";
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((item) => item.str || "")
                .join(" ");
            fullText += pageText + "\n";
        }
        return fullText.trim();
    }
    catch (err) {
        console.error("PDF extraction error:", err);
        throw new errors_1.AppError("Failed to read PDF file. Please try a different PDF.", 400);
    }
}
async function analyzeResume(req, res, next) {
    try {
        if (!req.file)
            throw new errors_1.AppError("No PDF file uploaded", 400);
        const resumeText = await extractTextFromPDF(req.file.buffer);
        if (!resumeText || resumeText.trim().length < 50) {
            throw new errors_1.AppError("Could not extract text from PDF. Make sure it has selectable text and is not a scanned image.", 400);
        }
        const jobId = (0, crypto_1.randomUUID)();
        const candidateId = req.body.candidateId;
        await (0, cache_1.setCache)(`resume-result:${jobId}`, { status: "processing" }, 3600);
        await resume_queue_1.resumeQueue.add("analyze", { jobId, resumeText, candidateId });
        res.json({
            success: true,
            jobId,
            message: "Resume analysis started.",
        });
    }
    catch (err) {
        next(err);
    }
}
async function getResumeStatus(req, res, next) {
    try {
        const { jobId } = req.params;
        const result = await (0, cache_1.getCache)(`resume-result:${jobId}`);
        if (!result) {
            throw new errors_1.AppError("Job not found or expired", 404);
        }
        res.json({ success: true, ...result });
    }
    catch (err) {
        next(err);
    }
}

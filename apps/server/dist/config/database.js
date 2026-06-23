"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
exports.prisma = new client_1.PrismaClient({
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
    ],
});
const SLOW_QUERY_THRESHOLD_MS = 100; // 100ms
exports.prisma.$on('query', (e) => {
    if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
        console.warn(`[SLOW QUERY] ${e.duration}ms: ${e.query}`);
    }
});

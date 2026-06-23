import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

const SLOW_QUERY_THRESHOLD_MS = 100; // 100ms

prisma.$on('query', (e) => {
  if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
    console.warn(`[SLOW QUERY] ${e.duration}ms: ${e.query}`);
  }
});

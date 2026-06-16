import { prisma } from "../../lib/prisma.js";

export const labResultsRepo = {
  list: ({ siteId, status } = {}) =>
    prisma.labResult.findMany({
      where: { siteId, status },
      include: { site: { select: { name: true, customer: { select: { name: true } } } } },
      orderBy: { sampledAt: "desc" },
    }),

  get: (id) =>
    prisma.labResult.findUnique({
      where: { id },
      include: { site: true, visit: true, review: true, tasks: true },
    }),

  create: (data) => prisma.labResult.create({ data }),

  /**
   * Persist the AI review and the validated structured readings atomically.
   * Atomicity matters: if validation persisted but the raw AI record didn't,
   * we'd lose the audit trail; if the AI record persisted but readings didn't,
   * the UI would show a "reviewed" lab with no readings.
   */
  persistReview: async ({ labResultId, ai, validation, derivedStatus }) =>
    prisma.$transaction(async (tx) => {
      const updated = await tx.labResult.update({
        where: { id: labResultId },
        data: {
          ph: validation.readings.ph,
          conductivity: validation.readings.conductivity,
          chlorine: validation.readings.chlorine,
          turbidity: validation.readings.turbidity,
          iron: validation.readings.iron,
          hardness: validation.readings.hardness,
          anomalies: validation.anomalies,
          suggestedActions: validation.suggestedActions,
          status: derivedStatus,
        },
      });
      await tx.aiReview.upsert({
        where: { labResultId },
        create: {
          labResultId,
          provider: ai.provider,
          model: ai.model,
          promptTokens: ai.usage?.promptTokens,
          outputTokens: ai.usage?.outputTokens,
          latencyMs: ai.latencyMs,
          rawResponse: { text: ai.raw },
          parsed: ai.parsed ?? null,
          confidence: validation.confidence,
          validationErrors: validation.errors,
        },
        update: {
          provider: ai.provider,
          model: ai.model,
          rawResponse: { text: ai.raw },
          parsed: ai.parsed ?? null,
          confidence: validation.confidence,
          validationErrors: validation.errors,
        },
      });
      return updated;
    }),
};

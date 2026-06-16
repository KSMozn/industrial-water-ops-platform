import { z } from "zod";
import { labResultsRepo } from "./repository.js";
import { reviewLabResult } from "../../ai/agents/labReviewAgent.js";
import { notFound, validationFailed } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

const createSchema = z.object({
  siteId: z.string().min(1),
  visitId: z.string().optional().nullable(),
  sampledAt: z.coerce.date(),
  rawInput: z.string().min(10, "Raw lab text is required"),
});

export const labResultsService = {
  list: (filters) => labResultsRepo.list(filters),

  get: async (id) => {
    const r = await labResultsRepo.get(id);
    if (!r) throw notFound("LabResult", id);
    return r;
  },

  /**
   * Create a lab result AND immediately review it. Single-call UX: technician
   * uploads transcription, sees structured + flagged results in one round-trip.
   * If the AI provider fails (network, key, parse), we still persist the raw
   * input with status REVIEW_FAILED so a human can re-run later.
   */
  createAndReview: async (input, { providerName } = {}) => {
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) throw validationFailed(parsed.error.flatten());

    const created = await labResultsRepo.create(parsed.data);

    try {
      const { ai, validation } = await reviewLabResult({ rawInput: parsed.data.rawInput, providerName });
      const derivedStatus = !validation.ok
        ? "REVIEW_FAILED"
        : validation.anomalies.length > 0 ? "REVIEWED_ANOMALY" : "REVIEWED_OK";
      const updated = await labResultsRepo.persistReview({ labResultId: created.id, ai, validation, derivedStatus });

      // Auto-create tasks for each anomaly. Source = LAB_ANOMALY so we can
      // trace the chain back to the offending lab result.
      if (validation.anomalies.length > 0) {
        await prisma.task.createMany({
          data: validation.anomalies.map((a, i) => ({
            siteId: created.siteId,
            labResultId: created.id,
            title: `Lab anomaly: ${a.parameter} ${a.severity}`,
            description: a.message + (validation.suggestedActions[i] ? `\nSuggested: ${validation.suggestedActions[i].action}` : ""),
            priority: a.severity === "critical" ? "URGENT" : a.severity === "high" ? "HIGH" : "MEDIUM",
            source: "LAB_ANOMALY",
            dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * (a.severity === "critical" ? 1 : 7)),
          })),
        });
      }

      return labResultsRepo.get(created.id);
    } catch (err) {
      await prisma.labResult.update({ where: { id: created.id }, data: { status: "REVIEW_FAILED" } });
      // Persist a failure-row AiReview so the operations team sees the attempt
      // and can re-run, rather than silently re-querying providers.
      await prisma.aiReview.create({
        data: {
          labResultId: created.id,
          provider: providerName ?? "unknown",
          model: "unknown",
          rawResponse: { error: String(err?.message ?? err) },
          confidence: 0,
          validationErrors: [{ path: "", message: String(err?.message ?? err) }],
        },
      });
      return labResultsRepo.get(created.id);
    }
  },

  /**
   * Re-review an existing lab result. Useful when the model or prompt
   * changes — we don't lose the original input.
   */
  rereview: async (id, { providerName } = {}) => {
    const existing = await labResultsRepo.get(id);
    if (!existing) throw notFound("LabResult", id);

    const { ai, validation } = await reviewLabResult({ rawInput: existing.rawInput, providerName });
    const derivedStatus = !validation.ok
      ? "REVIEW_FAILED"
      : validation.anomalies.length > 0 ? "REVIEWED_ANOMALY" : "REVIEWED_OK";
    await labResultsRepo.persistReview({ labResultId: id, ai, validation, derivedStatus });
    return labResultsRepo.get(id);
  },
};

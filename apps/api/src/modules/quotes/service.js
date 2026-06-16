import { z } from "zod";
import { quotesRepo } from "./repository.js";
import { prisma } from "../../lib/prisma.js";
import { notFound, validationFailed, conflict } from "../../lib/errors.js";

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  unitPriceAud: z.number().min(0),
});

const createSchema = z.object({
  customerId: z.string().min(1),
  reference: z.string().min(1),
  validUntil: z.coerce.date().optional().nullable(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

const QUOTE_TRANSITIONS = {
  DRAFT:     ["SENT", "REJECTED", "EXPIRED"],
  SENT:      ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED:  ["CONVERTED"],
  REJECTED:  [],
  CONVERTED: [],
  EXPIRED:   [],
};

const STATION_TEMPLATE = ["FRAME", "PLUMBING", "ELECTRICAL", "QA", "DISPATCH"];

export const quotesService = {
  list: (filters) => quotesRepo.list(filters),
  customers: () => quotesRepo.customers(),

  get: async (id) => {
    const q = await quotesRepo.get(id);
    if (!q) throw notFound("Quote", id);
    return q;
  },

  create: async (input) => {
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) throw validationFailed(parsed.error.flatten());
    const totalAud = parsed.data.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceAud, 0);
    return quotesRepo.create({
      customerId: parsed.data.customerId,
      reference:  parsed.data.reference,
      validUntil: parsed.data.validUntil,
      notes:      parsed.data.notes,
      totalAud,
      lines: { create: parsed.data.lines },
    });
  },

  transition: async (id, { status }) => {
    const q = await quotesRepo.get(id);
    if (!q) throw notFound("Quote", id);
    const allowed = QUOTE_TRANSITIONS[q.status] ?? [];
    if (!allowed.includes(status)) throw conflict(`Illegal quote transition ${q.status} → ${status}`, { allowed });
    const patch = { status };
    if (status === "SENT") patch.sentAt = new Date();
    if (status === "ACCEPTED" || status === "REJECTED") patch.decidedAt = new Date();
    return quotesRepo.update(id, patch);
  },

  /**
   * Convert an ACCEPTED quote into one or more WorkOrders.
   * Brief callout: "Convert quote to work order or service task" — for the
   * POC we always produce work orders, one per quote line that maps to a
   * model. A real impl would let the user choose per-line.
   */
  convertToWorkOrders: async (id, { modelMap }) => {
    const q = await quotesRepo.get(id);
    if (!q) throw notFound("Quote", id);
    if (q.status !== "ACCEPTED") throw conflict("Only ACCEPTED quotes can be converted", { currentStatus: q.status });

    // modelMap is { quoteLineId: modelId } — caller chooses the WO model per line.
    const lines = q.lines.filter((l) => modelMap[l.id]);
    if (lines.length === 0) throw validationFailed({ formErrors: ["No modelMap entries provided"] });

    const refPrefix = q.reference.replace(/^Q-/, "WO-");

    const workOrders = await prisma.$transaction(
      lines.flatMap((line, i) => {
        const woRef = `${refPrefix}-${String(i + 1).padStart(2, "0")}`;
        return Array.from({ length: line.quantity }).map((_, j) =>
          prisma.workOrder.create({
            data: {
              reference: `${woRef}-${String(j + 1).padStart(2, "0")}`,
              modelId: modelMap[line.id],
              quoteId: q.id,
              stations: { create: STATION_TEMPLATE.map((s, idx) => ({ station: s, sequence: idx })) },
            },
          }),
        );
      }),
    );

    await quotesRepo.update(id, { status: "CONVERTED" });
    return { workOrders, count: workOrders.length };
  },
};

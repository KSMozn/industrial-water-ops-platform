import { z } from "zod";
import { tasksRepo } from "./repository.js";
import { notFound, validationFailed, conflict } from "../../lib/errors.js";

const createSchema = z.object({
  siteId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  source: z.enum(["SERVICE_VISIT", "LAB_ANOMALY", "MANUAL", "WORKSHOP", "QUOTE"]).optional(),
  visitId: z.string().optional().nullable(),
  labResultId: z.string().optional().nullable(),
  technicianId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

// Allowed lifecycle transitions. Keeping the map explicit (rather than just
// "any to any") prevents the UI / external integrations from skipping states
// — e.g. you can't mark a REQUESTED task COMPLETED without first approving it.
const TRANSITIONS = {
  REQUESTED:   ["APPROVED", "CANCELLED"],
  APPROVED:    ["ASSIGNED", "CANCELLED"],
  ASSIGNED:    ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED:   [],
  CANCELLED:   [],
};

const transitionSchema = z.object({
  status: z.enum(["REQUESTED", "APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  technicianId: z.string().optional().nullable(),
});

export const tasksService = {
  list: (filters) => tasksRepo.list(filters),
  board: () => tasksRepo.board(),

  get: async (id) => {
    const t = await tasksRepo.get(id);
    if (!t) throw notFound("Task", id);
    return t;
  },

  create: async (input) => {
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) throw validationFailed(parsed.error.flatten());
    return tasksRepo.create({ ...parsed.data, source: parsed.data.source ?? "MANUAL" });
  },

  transition: async (id, input) => {
    const parsed = transitionSchema.safeParse(input);
    if (!parsed.success) throw validationFailed(parsed.error.flatten());

    const current = await tasksRepo.get(id);
    if (!current) throw notFound("Task", id);

    const allowed = TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      throw conflict(`Illegal transition ${current.status} → ${parsed.data.status}`, { allowed });
    }

    const patch = { status: parsed.data.status };
    if (parsed.data.technicianId !== undefined) patch.technicianId = parsed.data.technicianId;
    if (parsed.data.status === "ASSIGNED" && !patch.technicianId && !current.technicianId) {
      throw validationFailed({ formErrors: ["ASSIGNED requires a technicianId"] });
    }
    if (parsed.data.status === "COMPLETED") patch.completedAt = new Date();
    return tasksRepo.update(id, patch);
  },
};

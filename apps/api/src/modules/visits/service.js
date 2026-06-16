import { z } from "zod";
import { visitsRepo } from "./repository.js";
import { notFound, validationFailed } from "../../lib/errors.js";

const createSchema = z.object({
  siteId: z.string().min(1),
  technicianId: z.string().optional().nullable(),
  scheduledFor: z.coerce.date(),
  findings: z.string().optional(),
});

const transitionSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  findings: z.string().optional(),
});

export const visitsService = {
  list: (filters) => visitsRepo.list(filters),

  get: async (id) => {
    const v = await visitsRepo.get(id);
    if (!v) throw notFound("ServiceVisit", id);
    return v;
  },

  create: async (input) => {
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) throw validationFailed(parsed.error.flatten());
    return visitsRepo.create(parsed.data);
  },

  transition: async (id, input) => {
    const parsed = transitionSchema.safeParse(input);
    if (!parsed.success) throw validationFailed(parsed.error.flatten());
    const patch = { ...parsed.data };
    if (parsed.data.status === "COMPLETED") patch.completedAt = new Date();
    return visitsRepo.update(id, patch);
  },

  technicians: () => visitsRepo.technicians(),
};

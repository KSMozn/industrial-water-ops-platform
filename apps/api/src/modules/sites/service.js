import { sitesRepo } from "./repository.js";
import { notFound, validationFailed } from "../../lib/errors.js";
import { createSiteSchema, updateSiteSchema } from "./schema.js";

export const sitesService = {
  list: (filters) => sitesRepo.list(filters),

  get: async (id) => {
    const site = await sitesRepo.get(id);
    if (!site) throw notFound("Site", id);
    return site;
  },

  create: async (input) => {
    const parsed = createSiteSchema.safeParse(input);
    if (!parsed.success) throw validationFailed(parsed.error.flatten());
    return sitesRepo.create(parsed.data);
  },

  update: async (id, input) => {
    const parsed = updateSiteSchema.safeParse(input);
    if (!parsed.success) throw validationFailed(parsed.error.flatten());
    return sitesRepo.update(id, parsed.data);
  },

  remove: (id) => sitesRepo.remove(id),

  dashboard: () => sitesRepo.dashboardSummary(),
};

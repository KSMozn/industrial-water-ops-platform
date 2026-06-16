import { sitesService } from "./service.js";

export const sitesController = {
  list:      async (req)        => sitesService.list({ state: req.query.state }),
  get:       async (req)        => sitesService.get(req.params.id),
  create:    async (req, reply) => reply.code(201).send(await sitesService.create(req.body)),
  update:    async (req)        => sitesService.update(req.params.id, req.body),
  remove:    async (req, reply) => { await sitesService.remove(req.params.id); reply.code(204).send(); },
  dashboard: async ()           => sitesService.dashboard(),
};

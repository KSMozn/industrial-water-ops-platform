import { visitsService } from "./service.js";

export async function visitsRoutes(app) {
  app.get("/technicians", async () => visitsService.technicians());

  app.get("/",       async (req) => visitsService.list({ siteId: req.query.siteId, status: req.query.status, technicianId: req.query.technicianId }));
  app.post("/",      async (req, reply) => reply.code(201).send(await visitsService.create(req.body)));
  app.get("/:id",    async (req) => visitsService.get(req.params.id));
  app.patch("/:id/transition", async (req) => visitsService.transition(req.params.id, req.body));
}

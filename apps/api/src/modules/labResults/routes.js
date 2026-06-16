import { labResultsService } from "./service.js";

export async function labResultsRoutes(app) {
  app.get("/",       async (req) => labResultsService.list({ siteId: req.query.siteId, status: req.query.status }));
  app.post("/",      async (req, reply) => reply.code(201).send(await labResultsService.createAndReview(req.body, { providerName: req.query.provider })));
  app.get("/:id",    async (req) => labResultsService.get(req.params.id));
  app.post("/:id/rereview", async (req) => labResultsService.rereview(req.params.id, { providerName: req.query.provider }));
}

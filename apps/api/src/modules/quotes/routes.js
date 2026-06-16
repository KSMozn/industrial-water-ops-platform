import { quotesService } from "./service.js";

export async function quotesRoutes(app) {
  app.get("/customers", async () => quotesService.customers());

  app.get("/",   async (req) => quotesService.list({ status: req.query.status, customerId: req.query.customerId }));
  app.post("/",  async (req, reply) => reply.code(201).send(await quotesService.create(req.body)));
  app.get("/:id", async (req) => quotesService.get(req.params.id));
  app.patch("/:id/transition", async (req) => quotesService.transition(req.params.id, req.body));
  app.post("/:id/convert",     async (req) => quotesService.convertToWorkOrders(req.params.id, req.body));
}

import { workshopService } from "./service.js";

export async function workshopRoutes(app) {
  app.get("/board",        async () => workshopService.board());
  app.get("/work-orders",  async (req) => workshopService.list({ status: req.query.status }));
  app.get("/work-orders/:id", async (req) => workshopService.get(req.params.id));
  app.patch("/stations/:id", async (req) => workshopService.updateStation(req.params.id, req.body));
}

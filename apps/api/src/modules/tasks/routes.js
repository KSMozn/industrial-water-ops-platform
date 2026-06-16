import { tasksService } from "./service.js";

export async function tasksRoutes(app) {
  app.get("/board", async () => tasksService.board());

  app.get("/", async (req) => tasksService.list({
    status: req.query.status, siteId: req.query.siteId, technicianId: req.query.technicianId, priority: req.query.priority,
  }));
  app.post("/",    async (req, reply) => reply.code(201).send(await tasksService.create(req.body)));
  app.get("/:id",  async (req) => tasksService.get(req.params.id));
  app.patch("/:id/transition", async (req) => tasksService.transition(req.params.id, req.body));
}

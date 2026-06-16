import { sitesController } from "./controller.js";

export async function sitesRoutes(app) {
  // Dashboard sits under /api/sites/dashboard intentionally — the dashboard is
  // a sites-shaped projection (per-site health), so it belongs here rather than
  // in a separate /dashboard prefix that would need its own module.
  app.get("/dashboard", sitesController.dashboard);

  app.get("/",        sitesController.list);
  app.post("/",       sitesController.create);
  app.get("/:id",     sitesController.get);
  app.patch("/:id",   sitesController.update);
  app.delete("/:id",  sitesController.remove);
}

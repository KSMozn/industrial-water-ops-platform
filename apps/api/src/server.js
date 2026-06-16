import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";

import { env } from "./config/env.js";
import { AppError } from "./lib/errors.js";

import { sitesRoutes } from "./modules/sites/routes.js";
import { visitsRoutes } from "./modules/visits/routes.js";
import { labResultsRoutes } from "./modules/labResults/routes.js";
import { tasksRoutes } from "./modules/tasks/routes.js";
import { inventoryRoutes } from "./modules/inventory/routes.js";
import { workshopRoutes } from "./modules/workshop/routes.js";
import { quotesRoutes } from "./modules/quotes/routes.js";

export async function buildServer() {
  const app = Fastify({
    logger: { level: env.logLevel },
    disableRequestLogging: env.nodeEnv === "test",
  });

  await app.register(cors, { origin: true });
  await app.register(sensible);

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.status).send({
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    if (err.validation) {
      return reply.code(400).send({
        error: { code: "BAD_REQUEST", message: err.message, details: err.validation },
      });
    }
    req.log.error({ err }, "unhandled");
    return reply.code(500).send({ error: { code: "INTERNAL", message: "Internal server error" } });
  });

  app.get("/health", async () => ({ ok: true, version: "0.1.0" }));

  // Modules — each registers under a path prefix.
  await app.register(sitesRoutes,       { prefix: "/api/sites" });
  await app.register(visitsRoutes,      { prefix: "/api/visits" });
  await app.register(labResultsRoutes,  { prefix: "/api/lab-results" });
  await app.register(tasksRoutes,       { prefix: "/api/tasks" });
  await app.register(inventoryRoutes,   { prefix: "/api/inventory" });
  await app.register(workshopRoutes,    { prefix: "/api/workshop" });
  await app.register(quotesRoutes,      { prefix: "/api/quotes" });

  return app;
}

// Only auto-start when invoked as `node server.js`. Tests import buildServer
// directly and never bind a port.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = await buildServer();
  app.listen({ port: env.port, host: env.host }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}

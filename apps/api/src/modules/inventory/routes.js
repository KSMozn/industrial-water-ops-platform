import { inventoryService } from "./service.js";

export async function inventoryRoutes(app) {
  app.get("/items",     async () => inventoryService.items());
  app.get("/models",    async () => inventoryService.models());
  app.get("/units",     async (req) => inventoryService.units({ status: req.query.status, modelId: req.query.modelId, siteId: req.query.siteId }));
  app.get("/shipments", async () => inventoryService.shipments());
  app.get("/shipments/:id/reconciliation", async (req) => inventoryService.reconciliation(req.params.id));
  app.post("/shipment-lines/:id/receive",  async (req) => inventoryService.recordReceipt(req.params.id, req.body));
}

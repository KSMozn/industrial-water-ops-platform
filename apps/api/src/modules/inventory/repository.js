import { prisma } from "../../lib/prisma.js";

export const inventoryRepo = {
  items: () => prisma.inventoryItem.findMany({ orderBy: { name: "asc" } }),

  models: () =>
    prisma.equipmentModel.findMany({
      include: { _count: { select: { units: true } } },
      orderBy: { modelCode: "asc" },
    }),

  units: ({ status, modelId, siteId } = {}) =>
    prisma.equipment.findMany({
      where: { status, modelId, siteId },
      include: { model: true, site: { select: { name: true } } },
      orderBy: { serialNumber: "asc" },
    }),

  shipments: () =>
    prisma.shipment.findMany({
      include: { lines: true, _count: { select: { lines: true } } },
      orderBy: { expectedAt: "desc" },
    }),

  shipmentDetail: (id) =>
    prisma.shipment.findUnique({
      where: { id },
      include: { lines: { include: { model: true, equipment: true } } },
    }),
};

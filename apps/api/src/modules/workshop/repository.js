import { prisma } from "../../lib/prisma.js";

const STATION_ORDER = ["FRAME", "PLUMBING", "ELECTRICAL", "QA", "DISPATCH"];

export const workshopRepo = {
  workOrders: ({ status } = {}) =>
    prisma.workOrder.findMany({
      where: { status },
      include: { model: true, stations: { orderBy: { sequence: "asc" } }, quote: { select: { reference: true } } },
      orderBy: { createdAt: "desc" },
    }),

  workOrder: (id) =>
    prisma.workOrder.findUnique({
      where: { id },
      include: { model: true, stations: { orderBy: { sequence: "asc" } }, quote: true },
    }),

  /**
   * Big-screen progress board view. One row per WO, plus per-station status
   * for the workshop overhead display.
   */
  board: async () => {
    const orders = await prisma.workOrder.findMany({
      where: { status: { notIn: ["DISPATCHED", "CANCELLED"] } },
      include: { model: true, stations: { orderBy: { sequence: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    return {
      stations: STATION_ORDER,
      orders: orders.map((o) => ({
        id: o.id, reference: o.reference, model: o.model.modelCode, status: o.status, serialNumber: o.serialNumber,
        progress: STATION_ORDER.map((s) => {
          const row = o.stations.find((st) => st.station === s);
          return { station: s, status: row?.status ?? "PENDING", operator: row?.operatorName, blocker: row?.blockedReason };
        }),
      })),
    };
  },

  updateStation: (id, data) => prisma.workOrderStation.update({ where: { id }, data }),
  getStation: (id) => prisma.workOrderStation.findUnique({ where: { id }, include: { workOrder: { include: { stations: true } } } }),
  updateWorkOrder: (id, data) => prisma.workOrder.update({ where: { id }, data }),
};

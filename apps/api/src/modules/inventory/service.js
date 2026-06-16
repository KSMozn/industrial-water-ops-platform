import { inventoryRepo } from "./repository.js";
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/errors.js";
import { reconcileShipment } from "./reconcile.js";

export const inventoryService = {
  items:   () => inventoryRepo.items(),
  models:  () => inventoryRepo.models(),
  units:   (filters) => inventoryRepo.units(filters),
  shipments: () => inventoryRepo.shipments(),

  reconciliation: async (id) => {
    const s = await inventoryRepo.shipmentDetail(id);
    if (!s) throw notFound("Shipment", id);
    return reconcileShipment(s);
  },

  /**
   * Record a received serial against a shipment line. Auto-promotes the
   * shipment to RECONCILED when every line is accounted for and matched, or
   * DISCREPANCY when receipt completes but there are mismatches/missing.
   */
  recordReceipt: async (shipmentLineId, { receivedSerial, notes }) => {
    const line = await prisma.shipmentLine.update({
      where: { id: shipmentLineId },
      data: { receivedSerial, receivedAt: new Date(), notes },
      include: { shipment: { include: { lines: true } } },
    });

    const allReceived = line.shipment.lines.every((l) => l.id === line.id || l.receivedSerial);
    if (allReceived) {
      const hasIssue = line.shipment.lines.some(
        (l) => !l.receivedSerial || (l.id !== line.id && l.receivedSerial !== l.expectedSerial)
              || (l.id === line.id && receivedSerial !== l.expectedSerial),
      );
      await prisma.shipment.update({
        where: { id: line.shipmentId },
        data: { status: hasIssue ? "DISCREPANCY" : "RECONCILED", receivedAt: new Date() },
      });
    } else if (line.shipment.status === "EXPECTED") {
      await prisma.shipment.update({ where: { id: line.shipmentId }, data: { status: "RECEIVED" } });
    }
    return line;
  },
};

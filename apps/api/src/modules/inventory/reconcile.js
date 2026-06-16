/**
 * Pure reconciliation function — no DB, no I/O — so it's directly unit testable.
 *
 * Given a shipment object with eager-loaded `lines` (each line carrying
 * `expectedSerial`, optional `receivedSerial`, and an inflated `model`),
 * returns the bucketed reconciliation report.
 */
export function reconcileShipment(shipment) {
  const matched = [];
  const mismatch = [];
  const missing = [];

  for (const line of shipment.lines) {
    if (!line.receivedSerial) {
      missing.push({ expectedSerial: line.expectedSerial, model: line.model.modelCode });
    } else if (line.receivedSerial === line.expectedSerial) {
      matched.push({ serial: line.receivedSerial, model: line.model.modelCode });
    } else {
      mismatch.push({
        expectedSerial: line.expectedSerial,
        receivedSerial: line.receivedSerial,
        model: line.model.modelCode,
        notes: line.notes,
      });
    }
  }

  const expectedSet = new Set(shipment.lines.map((l) => l.expectedSerial));
  const extra = [];
  for (const line of shipment.lines) {
    if (line.receivedSerial && !expectedSet.has(line.receivedSerial)) {
      extra.push({ serial: line.receivedSerial, model: line.model.modelCode });
    }
  }

  return {
    shipmentId: shipment.id,
    reference: shipment.reference,
    origin: shipment.origin,
    expectedAt: shipment.expectedAt,
    receivedAt: shipment.receivedAt,
    status: shipment.status,
    counts: {
      expected: shipment.lines.length,
      received: shipment.lines.filter((l) => l.receivedSerial).length,
      matched: matched.length,
      mismatch: mismatch.length,
      missing: missing.length,
      extra: extra.length,
    },
    matched, mismatch, missing, extra,
  };
}

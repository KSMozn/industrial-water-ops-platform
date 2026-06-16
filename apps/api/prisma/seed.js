/**
 * Seed data for the Industrial Water Ops POC.
 *
 * Idempotent — wipes everything in dependency-safe order then re-creates. Safe
 * to re-run during development; never run against production.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AU_SITES = [
  { name: "Sydney Brewery — Alexandria", city: "Sydney", state: "NSW", postcode: "2015", industry: "Food & Beverage" },
  { name: "Hunter Valley Coal Wash", city: "Singleton", state: "NSW", postcode: "2330", industry: "Mining" },
  { name: "Newcastle Steel Cooling", city: "Newcastle", state: "NSW", postcode: "2300", industry: "Heavy Industry" },
  { name: "Wollongong Paper Mill", city: "Wollongong", state: "NSW", postcode: "2500", industry: "Pulp & Paper" },
  { name: "Melbourne Dairy Processing", city: "Melbourne", state: "VIC", postcode: "3000", industry: "Food & Beverage" },
  { name: "Geelong Refinery Cooling Tower", city: "Geelong", state: "VIC", postcode: "3220", industry: "Petrochemical" },
  { name: "Latrobe Power Cooling", city: "Morwell", state: "VIC", postcode: "3840", industry: "Power Generation" },
  { name: "Brisbane Beverage Plant", city: "Brisbane", state: "QLD", postcode: "4000", industry: "Food & Beverage" },
  { name: "Gladstone Alumina Wash", city: "Gladstone", state: "QLD", postcode: "4680", industry: "Mining" },
  { name: "Mackay Sugar Mill", city: "Mackay", state: "QLD", postcode: "4740", industry: "Food & Beverage" },
  { name: "Townsville Mine Site WTP", city: "Townsville", state: "QLD", postcode: "4810", industry: "Mining" },
  { name: "Perth Brewery", city: "Perth", state: "WA", postcode: "6000", industry: "Food & Beverage" },
  { name: "Pilbara Iron Ore WTP", city: "Karratha", state: "WA", postcode: "6714", industry: "Mining" },
  { name: "Kwinana Refinery", city: "Kwinana", state: "WA", postcode: "6167", industry: "Petrochemical" },
  { name: "Kalgoorlie Gold Process", city: "Kalgoorlie", state: "WA", postcode: "6430", industry: "Mining" },
  { name: "Adelaide Wine Co-op", city: "Adelaide", state: "SA", postcode: "5000", industry: "Food & Beverage" },
  { name: "Whyalla Steel Cooling", city: "Whyalla", state: "SA", postcode: "5600", industry: "Heavy Industry" },
  { name: "Hobart Salmon Processing", city: "Hobart", state: "TAS", postcode: "7000", industry: "Food & Beverage" },
  { name: "Darwin LNG Cooling", city: "Darwin", state: "NT", postcode: "0800", industry: "Petrochemical" },
  { name: "Canberra Wastewater Polish", city: "Canberra", state: "ACT", postcode: "2600", industry: "Wastewater" },
];

const CUSTOMERS = [
  { name: "Goldfields Mining Ltd", abn: "12345678901" },
  { name: "Sunburnt Breweries Pty Ltd", abn: "23456789012" },
  { name: "Pacific Power Generation", abn: "34567890123" },
  { name: "Coastal Refining Australia", abn: "45678901234" },
  { name: "Murray Dairy Co-op", abn: "56789012345" },
];

const TECHNICIANS = [
  { name: "Aisha Okafor",      email: "aisha@waterops.example",   region: "NSW/ACT" },
  { name: "Lachlan Brennan",   email: "lachlan@waterops.example", region: "VIC/TAS" },
  { name: "Mei Chen",          email: "mei@waterops.example",     region: "QLD" },
  { name: "Daniel Yiminga",    email: "daniel@waterops.example",  region: "WA/NT" },
  { name: "Pia Andersson",     email: "pia@waterops.example",     region: "SA" },
];

const EQUIPMENT_MODELS = [
  { modelCode: "RO-2000", description: "Reverse osmosis skid, 2000 L/h" },
  { modelCode: "RO-5000", description: "Reverse osmosis skid, 5000 L/h" },
  { modelCode: "SOFT-DUPLEX-300", description: "Duplex softener, 300 m³/d" },
  { modelCode: "DOSE-CL-S",       description: "Chlorine dosing skid (small)" },
  { modelCode: "UF-1500",         description: "Ultrafiltration unit, 1500 L/h" },
];

const INVENTORY_ITEMS = [
  { sku: "CHEM-NaOH-25KG", name: "Sodium hydroxide pellet, 25 kg", kind: "CHEMICAL", unit: "kg", stockOnHand: 480, reorderLevel: 100 },
  { sku: "CHEM-HCL-30L",   name: "Hydrochloric acid 32%, 30 L drum", kind: "CHEMICAL", unit: "L", stockOnHand: 12, reorderLevel: 5 },
  { sku: "CHEM-CL2-20L",   name: "Sodium hypochlorite 12.5%, 20 L", kind: "CHEMICAL", unit: "L", stockOnHand: 80, reorderLevel: 20 },
  { sku: "SP-RO-MEMB-4040",name: "RO membrane 4040", kind: "SPARE_PART", unit: "ea", stockOnHand: 6, reorderLevel: 2 },
  { sku: "SP-DOSE-PUMP-25",name: "Dosing pump head, 25 L/h", kind: "SPARE_PART", unit: "ea", stockOnHand: 3, reorderLevel: 1 },
];

const LAB_NORMAL = `Customer: %CUSTOMER%
Site: %SITE%
Sample date: %DATE%
pH: 7.4
Conductivity: 920 µS/cm
Free chlorine: 0.8 mg/L
Turbidity: 0.6 NTU
Iron: 0.05 mg/L
Hardness: 110 mg/L CaCO3
Comments: All parameters within range.`;

const LAB_ANOMALY = `Site: %SITE%
Sample date: %DATE%
pH: 5.9
Conductivity: 1820 µS/cm
Chlorine: 0.05 mg/L
Turbidity: 8.4 NTU
Iron: 0.92 mg/L
Hardness: 360 mg/L CaCO3
Comments: Filtrate looks discoloured.`;

const STATION_TEMPLATE = ["FRAME", "PLUMBING", "ELECTRICAL", "QA", "DISPATCH"];

async function wipe() {
  // Order matters — children before parents.
  await prisma.aiReview.deleteMany();
  await prisma.task.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.serviceVisit.deleteMany();
  await prisma.workOrderStation.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.shipmentLine.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.equipmentModel.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.quoteLine.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.site.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.technician.deleteMany();
}

async function main() {
  console.log("Seeding…");
  await wipe();

  const customers = [];
  for (const c of CUSTOMERS) customers.push(await prisma.customer.create({ data: c }));

  const technicians = [];
  for (const t of TECHNICIANS) technicians.push(await prisma.technician.create({ data: t }));

  const items = [];
  for (const i of INVENTORY_ITEMS) items.push(await prisma.inventoryItem.create({ data: i }));

  const models = [];
  for (const m of EQUIPMENT_MODELS) {
    models.push(await prisma.equipmentModel.create({
      data: { ...m, inventoryItemId: items[0].id }, // arbitrary parts link
    }));
  }

  // 20 sites, distributed across customers.
  const sites = [];
  for (let i = 0; i < AU_SITES.length; i++) {
    const meta = AU_SITES[i];
    sites.push(await prisma.site.create({
      data: {
        ...meta,
        addressLine: `${100 + i} Industrial Rd`,
        customerId: customers[i % customers.length].id,
      },
    }));
  }

  // Deploy 2-3 pieces of equipment per site.
  let serialCounter = 1000;
  for (const site of sites) {
    const count = 2 + (serialCounter % 2);
    for (let k = 0; k < count; k++) {
      await prisma.equipment.create({
        data: {
          serialNumber: `WX-${++serialCounter}`,
          modelId: models[(serialCounter) % models.length].id,
          siteId: site.id,
          status: "DEPLOYED",
          commissionedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (30 + (serialCounter % 365))),
        },
      });
    }
  }

  // Service visits + lab results.
  const now = Date.now();
  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    const tech = technicians[i % technicians.length];

    // A completed visit ~2 weeks ago.
    const past = await prisma.serviceVisit.create({
      data: {
        siteId: site.id, technicianId: tech.id,
        scheduledFor: new Date(now - 1000 * 60 * 60 * 24 * 14),
        completedAt:  new Date(now - 1000 * 60 * 60 * 24 * 14 + 1000 * 60 * 90),
        status: "COMPLETED",
        findings: "Routine quarterly service. Replaced cartridge filters. All parameters within spec.",
      },
    });

    // An upcoming scheduled visit.
    await prisma.serviceVisit.create({
      data: {
        siteId: site.id, technicianId: tech.id,
        scheduledFor: new Date(now + 1000 * 60 * 60 * 24 * (3 + (i % 14))),
        status: "SCHEDULED",
      },
    });

    // Normal lab result.
    await prisma.labResult.create({
      data: {
        siteId: site.id, visitId: past.id,
        sampledAt: past.completedAt,
        rawInput: LAB_NORMAL.replaceAll("%SITE%", site.name).replaceAll("%CUSTOMER%", customers[0].name).replaceAll("%DATE%", past.completedAt.toISOString().slice(0, 10)),
        status: "REVIEWED_OK",
        ph: 7.4, conductivity: 920, chlorine: 0.8, turbidity: 0.6, iron: 0.05, hardness: 110,
        anomalies: [], suggestedActions: [],
      },
    });

    // Every 4th site gets an anomaly lab + tasks.
    if (i % 4 === 0) {
      const sampledAt = new Date(now - 1000 * 60 * 60 * 24 * 2);
      const lab = await prisma.labResult.create({
        data: {
          siteId: site.id,
          sampledAt,
          rawInput: LAB_ANOMALY.replaceAll("%SITE%", site.name).replaceAll("%DATE%", sampledAt.toISOString().slice(0, 10)),
          status: "REVIEWED_ANOMALY",
          ph: 5.9, conductivity: 1820, chlorine: 0.05, turbidity: 8.4, iron: 0.92, hardness: 360,
          anomalies: [
            { parameter: "ph",       value: 5.9,  severity: "high",     message: "pH 5.9 below operating min 6.5" },
            { parameter: "chlorine", value: 0.05, severity: "high",     message: "Free Cl 0.05 below 0.2 mg/L" },
            { parameter: "iron",     value: 0.92, severity: "critical", message: "Fe 0.92 above 0.3 mg/L" },
          ],
          suggestedActions: [
            { action: "Increase alkalinity dosing (soda ash)", rationale: "pH below 6.5" },
            { action: "Increase chlorine dosing; investigate residual demand", rationale: "Free Cl below 0.2 mg/L" },
            { action: "Schedule iron removal media regen / replacement", rationale: "Fe above 0.3 mg/L" },
          ],
        },
      });
      await prisma.task.create({
        data: {
          siteId: site.id, labResultId: lab.id,
          title: "Lab anomaly: iron critical",
          description: "Fe 0.92 above 0.3 mg/L. Suggested: schedule iron removal media regen.",
          priority: "URGENT", source: "LAB_ANOMALY", status: "REQUESTED",
          dueDate: new Date(now + 1000 * 60 * 60 * 24),
        },
      });
    }

    // Routine manual task per site.
    await prisma.task.create({
      data: {
        siteId: site.id, technicianId: tech.id,
        title: "Quarterly probe calibration",
        description: "Calibrate pH and conductivity probes against reference standards.",
        priority: i % 3 === 0 ? "HIGH" : "MEDIUM",
        source: "MANUAL",
        status: i % 5 === 0 ? "ASSIGNED" : "REQUESTED",
        dueDate: new Date(now + 1000 * 60 * 60 * 24 * (7 + i % 14)),
      },
    });
  }

  // Shipment + reconciliation: one perfect, one with mismatch/missing.
  const goodShipment = await prisma.shipment.create({
    data: {
      reference: "PO-2026-1001", origin: "Offshore — Shenzhen",
      expectedAt: new Date(now - 1000 * 60 * 60 * 24 * 7), receivedAt: new Date(now - 1000 * 60 * 60 * 24 * 5),
      status: "RECONCILED",
      lines: { create: [
        { modelId: models[0].id, expectedSerial: "WX-9001", receivedSerial: "WX-9001", receivedAt: new Date() },
        { modelId: models[0].id, expectedSerial: "WX-9002", receivedSerial: "WX-9002", receivedAt: new Date() },
        { modelId: models[1].id, expectedSerial: "WX-9003", receivedSerial: "WX-9003", receivedAt: new Date() },
      ] },
    },
  });
  void goodShipment;

  await prisma.shipment.create({
    data: {
      reference: "PO-2026-1014", origin: "Offshore — Vietnam",
      expectedAt: new Date(now - 1000 * 60 * 60 * 24 * 2),
      status: "DISCREPANCY",
      receivedAt: new Date(now - 1000 * 60 * 60 * 24),
      lines: { create: [
        { modelId: models[2].id, expectedSerial: "WX-9101", receivedSerial: "WX-9101" },
        { modelId: models[2].id, expectedSerial: "WX-9102", receivedSerial: "WX-9999", notes: "Serial label appears relabelled in transit" },
        { modelId: models[3].id, expectedSerial: "WX-9103", receivedSerial: null,       notes: "Crate missing on arrival" },
        { modelId: models[4].id, expectedSerial: "WX-9104", receivedSerial: "WX-9104" },
      ] },
    },
  });

  // Workshop work orders — varying progress states.
  for (let i = 0; i < 6; i++) {
    const model = models[i % models.length];
    const wo = await prisma.workOrder.create({
      data: {
        reference: `WO-2026-${String(40 + i).padStart(4, "0")}`,
        modelId: model.id,
        status: i === 0 ? "QUEUED" : i < 3 ? "IN_PROGRESS" : i === 3 ? "BLOCKED" : "DISPATCHED",
        startedAt: i > 0 ? new Date(now - 1000 * 60 * 60 * 24 * (5 - i)) : null,
        completedAt: i >= 4 ? new Date(now - 1000 * 60 * 60 * 24 * (5 - i)) : null,
        serialNumber: i >= 4 ? `WX-${1100 + i}` : null,
        stations: { create: STATION_TEMPLATE.map((s, idx) => ({
          station: s, sequence: idx,
          status: i === 0 ? "PENDING"
                : i === 3 && s === "ELECTRICAL" ? "BLOCKED"
                : i === 3 && idx < 2 ? "DONE"
                : i < 3 && idx <= i ? (idx === i ? "IN_PROGRESS" : "DONE")
                : i >= 4 ? "DONE"
                : "PENDING",
          blockedReason: i === 3 && s === "ELECTRICAL" ? "Awaiting replacement contactor (SP-DOSE-PUMP-25 stockout)" : null,
          operatorName: idx <= i ? technicians[idx % technicians.length].name : null,
          startedAt: idx <= i && i > 0 ? new Date(now - 1000 * 60 * 60 * 24 * (5 - idx)) : null,
          completedAt: (i >= 4 || (i < 4 && idx < i)) ? new Date(now - 1000 * 60 * 60 * 24 * (5 - idx)) : null,
        })) },
      },
    });
    void wo;
  }

  // Quotes — one of each major status.
  for (let i = 0; i < 4; i++) {
    const status = ["DRAFT", "SENT", "ACCEPTED", "REJECTED"][i];
    await prisma.quote.create({
      data: {
        reference: `Q-2026-${String(100 + i).padStart(4, "0")}`,
        customerId: customers[i % customers.length].id,
        status,
        totalAud: 0,
        validUntil: new Date(now + 1000 * 60 * 60 * 24 * 30),
        sentAt: status !== "DRAFT" ? new Date(now - 1000 * 60 * 60 * 24 * 10) : null,
        decidedAt: status === "ACCEPTED" || status === "REJECTED" ? new Date(now - 1000 * 60 * 60 * 24 * 2) : null,
        notes: "POC-seeded quote.",
        lines: { create: [
          { description: `${models[0].description}`, quantity: 1, unitPriceAud: 48500 },
          { description: "Installation & commissioning", quantity: 1, unitPriceAud: 6200 },
          { description: "12 month service contract",    quantity: 1, unitPriceAud: 9800 },
        ] },
      },
    });
  }
  // Patch quote totals (couldn't compute inline above without re-reading).
  const allQuotes = await prisma.quote.findMany({ include: { lines: true } });
  for (const q of allQuotes) {
    const total = q.lines.reduce((s, l) => s + l.quantity * l.unitPriceAud, 0);
    await prisma.quote.update({ where: { id: q.id }, data: { totalAud: total } });
  }

  console.log(`Seeded ${sites.length} sites, ${customers.length} customers, ${technicians.length} technicians.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

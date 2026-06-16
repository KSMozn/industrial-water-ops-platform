import { z } from "zod";
import { workshopRepo } from "./repository.js";
import { notFound, validationFailed, conflict } from "../../lib/errors.js";

const stationUpdateSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "BLOCKED", "DONE", "SKIPPED"]),
  operatorName: z.string().optional(),
  blockedReason: z.string().optional(),
  notes: z.string().optional(),
});

const STATION_STATUS_TRANSITIONS = {
  PENDING:     ["IN_PROGRESS", "SKIPPED"],
  IN_PROGRESS: ["BLOCKED", "DONE", "SKIPPED"],
  BLOCKED:     ["IN_PROGRESS", "SKIPPED"],
  DONE:        [],
  SKIPPED:     [],
};

export const workshopService = {
  list: (filters) => workshopRepo.workOrders(filters),
  get: async (id) => {
    const wo = await workshopRepo.workOrder(id);
    if (!wo) throw notFound("WorkOrder", id);
    return wo;
  },
  board: () => workshopRepo.board(),

  /**
   * Per-station tablet action: an operator advances their station's status.
   * Side effects:
   *   - sets startedAt the first time the station leaves PENDING
   *   - sets completedAt on DONE
   *   - rolls the parent WO to IN_PROGRESS / BLOCKED / DISPATCHED as appropriate
   */
  updateStation: async (stationId, input) => {
    const parsed = stationUpdateSchema.safeParse(input);
    if (!parsed.success) throw validationFailed(parsed.error.flatten());

    const existing = await workshopRepo.getStation(stationId);
    if (!existing) throw notFound("WorkOrderStation", stationId);

    const allowed = STATION_STATUS_TRANSITIONS[existing.status] ?? [];
    if (existing.status !== parsed.data.status && !allowed.includes(parsed.data.status)) {
      throw conflict(`Illegal station transition ${existing.status} → ${parsed.data.status}`, { allowed });
    }

    const patch = { ...parsed.data };
    if (parsed.data.status === "IN_PROGRESS" && !existing.startedAt) patch.startedAt = new Date();
    if (parsed.data.status === "DONE") patch.completedAt = new Date();
    if (parsed.data.status !== "BLOCKED") patch.blockedReason = null;

    const updated = await workshopRepo.updateStation(stationId, patch);

    // Roll up parent WO status.
    const woStations = (await workshopRepo.getStation(stationId)).workOrder.stations;
    const allDone = woStations.every((s) => s.id === stationId ? parsed.data.status === "DONE" || parsed.data.status === "SKIPPED"
                                                                : s.status === "DONE" || s.status === "SKIPPED");
    const anyBlocked = parsed.data.status === "BLOCKED" || woStations.some((s) => s.id !== stationId && s.status === "BLOCKED");
    const woId = existing.workOrderId;
    if (allDone) {
      await workshopRepo.updateWorkOrder(woId, { status: "DISPATCHED", completedAt: new Date() });
    } else if (anyBlocked) {
      await workshopRepo.updateWorkOrder(woId, { status: "BLOCKED" });
    } else {
      await workshopRepo.updateWorkOrder(woId, { status: "IN_PROGRESS", startedAt: existing.workOrder.startedAt ?? new Date() });
    }

    return updated;
  },
};

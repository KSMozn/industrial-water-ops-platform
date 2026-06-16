<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api.js";

const board = ref(null);

async function refresh() { board.value = await api.workshopBoard(); }
onMounted(refresh);

const NEXT_STATION_STATUS = {
  PENDING:     "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  BLOCKED:     "IN_PROGRESS",
};

async function advance(order, cellIdx) {
  // cellIdx maps directly to station sequence in the WO. We need the station
  // record id — fetch the workshop detail to get it. (board response only
  // exposes status, not station ids, intentionally — the bigboard is read-only.)
  const detail = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"}/api/workshop/work-orders/${order.id}`).then(r => r.json());
  const station = detail.stations[cellIdx];
  const next = NEXT_STATION_STATUS[station.status];
  if (!next) return;
  await api.updateStation(station.id, { status: next, operatorName: "Tablet operator" });
  await refresh();
}
</script>

<template>
  <h2>Workshop Manufacturing</h2>
  <p class="subtle">Big-screen build progress. Each row is a work order moving through frame → plumbing → electrical → QA → dispatch. Tap a cell from a tablet to advance the station.</p>

  <div v-if="!board" class="subtle">Loading…</div>
  <div v-else class="panel">
    <div class="station-grid">
      <div class="head">Work Order</div>
      <div class="head" v-for="s in board.stations" :key="s">{{ s }}</div>

      <template v-for="o in board.orders" :key="o.id">
        <div>
          <div style="font-weight: 600">{{ o.reference }}</div>
          <div class="subtle" style="font-size: 0.72rem">{{ o.model }}</div>
          <div><span class="badge" :class="o.status === 'BLOCKED' ? 'critical' : o.status === 'IN_PROGRESS' ? 'warning' : 'muted'">{{ o.status }}</span></div>
        </div>
        <div v-for="(p, idx) in o.progress" :key="p.station" class="station-cell" :class="p.status" @click="advance(o, idx)" style="cursor: pointer">
          <div><strong>{{ p.status }}</strong></div>
          <div v-if="p.operator" class="subtle">{{ p.operator }}</div>
          <div v-if="p.blocker" style="color: var(--crit); font-size: 0.7rem; margin-top: 0.2rem">{{ p.blocker }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

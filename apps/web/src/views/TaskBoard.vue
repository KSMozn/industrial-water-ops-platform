<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api.js";

const board = ref(null);
const technicians = ref([]);

async function refresh() {
  [board.value, technicians.value] = await Promise.all([api.taskBoard(), api.technicians()]);
}
onMounted(refresh);

const NEXT = {
  REQUESTED:   { status: "APPROVED",    label: "Approve" },
  APPROVED:    { status: "ASSIGNED",    label: "Assign" },
  ASSIGNED:    { status: "IN_PROGRESS", label: "Start" },
  IN_PROGRESS: { status: "COMPLETED",   label: "Complete" },
};

async function advance(task) {
  const next = NEXT[task.status];
  if (!next) return;
  const payload = { status: next.status };
  if (next.status === "ASSIGNED" && !task.technicianId) {
    const tech = technicians.value[0];
    if (!tech) return alert("No technicians configured.");
    payload.technicianId = tech.id;
  }
  await api.transitionTask(task.id, payload);
  await refresh();
}
</script>

<template>
  <h2>Task Board</h2>
  <p class="subtle">Tasks raised from service findings, AI lab anomalies, and manual requests. Lifecycle: REQUESTED → APPROVED → ASSIGNED → IN_PROGRESS → COMPLETED.</p>

  <div v-if="!board" class="subtle">Loading…</div>
  <div v-else class="board tasks">
    <div v-for="col in ['REQUESTED', 'APPROVED', 'ASSIGNED', 'IN_PROGRESS']" :key="col" class="column">
      <h4>{{ col.replace('_', ' ') }} <span style="float: right">{{ board[col]?.length || 0 }}</span></h4>
      <div v-for="t in (board[col] || [])" :key="t.id" class="task-card" :class="t.priority">
        <div class="title">{{ t.title }}</div>
        <div class="meta">
          {{ t.site?.name }} · {{ t.priority }}
          <span v-if="t.dueDate"> · due {{ new Date(t.dueDate).toLocaleDateString() }}</span>
          <span v-if="t.technician"> · {{ t.technician.name }}</span>
        </div>
        <button v-if="NEXT[t.status]" class="btn small" style="margin-top: 0.4rem" @click="advance(t)">
          {{ NEXT[t.status].label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api.js";

const data = ref(null);
const error = ref(null);

onMounted(async () => {
  try { data.value = await api.dashboard(); } catch (e) { error.value = e.message; }
});
</script>

<template>
  <h2>Service Operations</h2>
  <p class="subtle">Health roll-up across all deployed sites. Critical = anomalies + overdue urgent tasks.</p>

  <div v-if="error">Error: {{ error }}</div>
  <div v-else-if="!data" class="subtle">Loading…</div>

  <template v-else>
    <div class="cards">
      <div class="card">
        <div class="label">Sites</div><div class="value">{{ data.totals.siteCount }}</div>
      </div>
      <div class="card">
        <div class="label">Open Tasks</div><div class="value">{{ data.totals.openTasks }}</div>
      </div>
      <div class="card">
        <div class="label">Overdue</div><div class="value" style="color: var(--crit)">{{ data.totals.overdueTasks }}</div>
      </div>
      <div class="card">
        <div class="label">Pending Lab Review</div><div class="value">{{ data.totals.pendingLabs }}</div>
      </div>
      <div class="card">
        <div class="label">Anomaly Labs</div><div class="value" style="color: var(--warn)">{{ data.totals.anomalyLabs }}</div>
      </div>
    </div>

    <div class="panel">
      <h3>Site health</h3>
      <table>
        <thead>
          <tr><th>Site</th><th>Customer</th><th>State</th><th>Open</th><th>Overdue</th><th>Anomalies</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in data.sites" :key="s.id">
            <td>{{ s.name }}</td>
            <td>{{ s.customer }}</td>
            <td>{{ s.state }}</td>
            <td>{{ s.openTasks }}</td>
            <td :style="s.overdueTasks > 0 ? 'color: var(--crit)' : ''">{{ s.overdueTasks }}</td>
            <td>{{ s.anomalies }}</td>
            <td><span class="badge" :class="s.health">{{ s.health }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
</template>

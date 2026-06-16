<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api.js";

const shipments = ref([]);
const selected = ref(null);
const recon = ref(null);

onMounted(async () => {
  shipments.value = await api.shipments();
  if (shipments.value.length) await pick(shipments.value[0]);
});

async function pick(s) {
  selected.value = s;
  recon.value = await api.reconciliation(s.id);
}
</script>

<template>
  <h2>Inventory & Offshore Shipment Reconciliation</h2>
  <p class="subtle">For every received shipment, surface: matched, mismatched-serial, missing, and unexpected (extra) units.</p>

  <div class="row cols-2">
    <div class="panel">
      <h3>Shipments</h3>
      <table>
        <thead><tr><th>Ref</th><th>Origin</th><th>Status</th><th>Lines</th></tr></thead>
        <tbody>
          <tr v-for="s in shipments" :key="s.id" @click="pick(s)" style="cursor: pointer">
            <td>{{ s.reference }}</td>
            <td>{{ s.origin }}</td>
            <td><span class="badge" :class="s.status === 'RECONCILED' ? 'ok' : s.status === 'DISCREPANCY' ? 'critical' : 'muted'">{{ s.status }}</span></td>
            <td>{{ s._count.lines }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel">
      <h3>Reconciliation: {{ selected?.reference }}</h3>
      <div v-if="!recon" class="subtle">Select a shipment.</div>
      <template v-else>
        <div class="cards" style="margin-bottom: 0.8rem">
          <div class="card"><div class="label">Expected</div><div class="value">{{ recon.counts.expected }}</div></div>
          <div class="card"><div class="label">Matched</div><div class="value" style="color: var(--ok)">{{ recon.counts.matched }}</div></div>
          <div class="card"><div class="label">Mismatch</div><div class="value" style="color: var(--warn)">{{ recon.counts.mismatch }}</div></div>
          <div class="card"><div class="label">Missing</div><div class="value" style="color: var(--crit)">{{ recon.counts.missing }}</div></div>
        </div>

        <div v-if="recon.mismatch.length">
          <h3>Mismatches</h3>
          <table>
            <thead><tr><th>Model</th><th>Expected</th><th>Received</th><th>Notes</th></tr></thead>
            <tbody>
              <tr v-for="m in recon.mismatch" :key="m.expectedSerial">
                <td>{{ m.model }}</td><td>{{ m.expectedSerial }}</td>
                <td style="color: var(--warn)">{{ m.receivedSerial }}</td>
                <td>{{ m.notes }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="recon.missing.length" style="margin-top: 1rem">
          <h3>Missing</h3>
          <table>
            <thead><tr><th>Model</th><th>Expected serial</th></tr></thead>
            <tbody>
              <tr v-for="m in recon.missing" :key="m.expectedSerial">
                <td>{{ m.model }}</td><td>{{ m.expectedSerial }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>

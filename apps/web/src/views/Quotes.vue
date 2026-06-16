<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api.js";

const quotes = ref([]);
const selected = ref(null);

async function refresh() { quotes.value = await api.quotes(); }
onMounted(refresh);

async function open(q) { selected.value = await api.quote(q.id); }

async function transition(status) {
  await api.transitionQuote(selected.value.id, { status });
  await refresh();
  selected.value = await api.quote(selected.value.id);
}

const NEXT = {
  DRAFT: [{ to: "SENT", label: "Send" }],
  SENT: [{ to: "ACCEPTED", label: "Mark accepted" }, { to: "REJECTED", label: "Mark rejected" }],
};
</script>

<template>
  <h2>Quotes</h2>
  <p class="subtle">Quote pipeline replacing the Salesforce flow. Accepted quotes convert to workshop work orders.</p>

  <div class="row cols-2">
    <div class="panel">
      <h3>Pipeline</h3>
      <table>
        <thead><tr><th>Ref</th><th>Customer</th><th>Total (AUD)</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="q in quotes" :key="q.id" @click="open(q)" style="cursor: pointer">
            <td>{{ q.reference }}</td>
            <td>{{ q.customer.name }}</td>
            <td>{{ q.totalAud.toLocaleString() }}</td>
            <td>
              <span class="badge" :class="q.status === 'ACCEPTED' ? 'ok' : q.status === 'REJECTED' ? 'critical' : 'muted'">
                {{ q.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel">
      <h3>Detail</h3>
      <div v-if="!selected" class="subtle">Select a quote.</div>
      <template v-else>
        <p>
          <strong>{{ selected.reference }}</strong> · {{ selected.customer.name }} ·
          <span class="badge muted">{{ selected.status }}</span>
        </p>
        <table>
          <thead><tr><th>Line</th><th>Qty</th><th>Unit (AUD)</th><th>Subtotal</th></tr></thead>
          <tbody>
            <tr v-for="l in selected.lines" :key="l.id">
              <td>{{ l.description }}</td><td>{{ l.quantity }}</td>
              <td>{{ l.unitPriceAud.toLocaleString() }}</td>
              <td>{{ (l.quantity * l.unitPriceAud).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top: 0.6rem"><strong>Total: AUD {{ selected.totalAud.toLocaleString() }}</strong></p>

        <div v-if="NEXT[selected.status]" style="margin-top: 1rem; display: flex; gap: 0.4rem">
          <button v-for="opt in NEXT[selected.status]" :key="opt.to" class="btn" @click="transition(opt.to)">
            {{ opt.label }}
          </button>
        </div>
        <div v-if="selected.status === 'ACCEPTED'" class="subtle" style="margin-top: 0.8rem">
          Use POST /api/quotes/:id/convert with a {{ '{ modelMap }' }} payload to spawn work orders for each line.
        </div>
      </template>
    </div>
  </div>
</template>

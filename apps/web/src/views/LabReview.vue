<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api.js";

const sites = ref([]);
const labs = ref([]);
const rawInput = ref(`Site: Sydney Brewery — Alexandria
Sample date: 2026-06-15
pH: 5.8
Conductivity: 1750 µS/cm
Chlorine: 0.05 mg/L
Turbidity: 7.2 NTU
Iron: 0.71 mg/L
Hardness: 280 mg/L CaCO3
Comments: Sample collected at outlet of softener bypass.`);
const siteId = ref("");
const reviewing = ref(false);
const result = ref(null);
const error = ref(null);

async function refresh() {
  [sites.value, labs.value] = await Promise.all([api.sites(), api.labResults()]);
  if (!siteId.value && sites.value.length) siteId.value = sites.value[0].id;
}
onMounted(refresh);

async function submit() {
  reviewing.value = true; error.value = null; result.value = null;
  try {
    const created = await api.reviewLab({
      siteId: siteId.value,
      sampledAt: new Date().toISOString(),
      rawInput: rawInput.value,
    });
    result.value = created;
    await refresh();
  } catch (e) { error.value = e.message; }
  finally { reviewing.value = false; }
}
</script>

<template>
  <h2>Lab Review (AI)</h2>
  <p class="subtle">
    Submit a raw lab transcription. The AI agent extracts readings; the platform
    then runs deterministic validation (plausibility → thresholds → severity →
    suggested actions → confidence) and persists both the raw model response
    and the validated result.
  </p>

  <div class="row cols-2">
    <div class="panel">
      <h3>Submit lab transcription</h3>
      <div class="field">
        <label>Site</label>
        <select v-model="siteId">
          <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>Raw lab text</label>
        <textarea v-model="rawInput"></textarea>
      </div>
      <button class="btn" @click="submit" :disabled="reviewing">
        {{ reviewing ? "Reviewing…" : "Run AI review" }}
      </button>
      <div v-if="error" style="color: var(--crit); margin-top: 0.8rem">{{ error }}</div>
    </div>

    <div class="panel">
      <h3>Last review</h3>
      <div v-if="!result" class="subtle">Submit a lab to see the structured result.</div>
      <template v-else>
        <p>
          Status:
          <span class="badge" :class="{ ok: result.status === 'REVIEWED_OK', warning: result.status === 'REVIEWED_ANOMALY', critical: result.status === 'REVIEW_FAILED' }">
            {{ result.status }}
          </span>
          <span v-if="result.review" class="subtle" style="margin-left: 0.8rem">
            provider: {{ result.review.provider }} · confidence {{ (result.review.confidence ?? 0).toFixed(2) }} · {{ result.review.latencyMs }}ms
          </span>
        </p>
        <table>
          <tbody>
            <tr><th>pH</th><td>{{ result.ph ?? '—' }}</td></tr>
            <tr><th>Conductivity (µS/cm)</th><td>{{ result.conductivity ?? '—' }}</td></tr>
            <tr><th>Chlorine (mg/L)</th><td>{{ result.chlorine ?? '—' }}</td></tr>
            <tr><th>Turbidity (NTU)</th><td>{{ result.turbidity ?? '—' }}</td></tr>
            <tr><th>Iron (mg/L)</th><td>{{ result.iron ?? '—' }}</td></tr>
            <tr><th>Hardness (mg/L)</th><td>{{ result.hardness ?? '—' }}</td></tr>
          </tbody>
        </table>
        <div v-if="result.anomalies?.length" style="margin-top: 1rem">
          <h3>Anomalies</h3>
          <ul>
            <li v-for="a in result.anomalies" :key="a.parameter">
              <span class="badge" :class="a.severity === 'critical' ? 'critical' : a.severity === 'high' ? 'warning' : 'muted'">{{ a.severity }}</span>
              {{ a.message }}
            </li>
          </ul>
        </div>
        <div v-if="result.suggestedActions?.length" style="margin-top: 1rem">
          <h3>Suggested actions</h3>
          <ul>
            <li v-for="(a, i) in result.suggestedActions" :key="i"><strong>{{ a.action }}</strong> — {{ a.rationale }}</li>
          </ul>
        </div>
      </template>
    </div>
  </div>

  <div class="panel">
    <h3>Recent lab results</h3>
    <table>
      <thead><tr><th>Sampled</th><th>Site</th><th>pH</th><th>Cl</th><th>Fe</th><th>Status</th></tr></thead>
      <tbody>
        <tr v-for="l in labs" :key="l.id">
          <td>{{ new Date(l.sampledAt).toLocaleDateString() }}</td>
          <td>{{ l.site.name }}</td>
          <td>{{ l.ph ?? '—' }}</td>
          <td>{{ l.chlorine ?? '—' }}</td>
          <td>{{ l.iron ?? '—' }}</td>
          <td><span class="badge" :class="{ ok: l.status === 'REVIEWED_OK', warning: l.status === 'REVIEWED_ANOMALY', critical: l.status === 'REVIEW_FAILED', muted: l.status === 'PENDING_REVIEW' }">{{ l.status }}</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

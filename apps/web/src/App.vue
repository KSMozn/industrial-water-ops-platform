<script setup>
const env = import.meta.env.MODE;
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <h1>WaterOps</h1>
      <nav>
        <router-link to="/dashboard">Operations</router-link>
        <router-link to="/lab-review">Lab Review (AI)</router-link>
        <router-link to="/tasks">Task Board</router-link>
        <router-link to="/inventory">Inventory & Shipments</router-link>
        <router-link to="/workshop">Workshop MES</router-link>
        <router-link to="/quotes">Quotes</router-link>
      </nav>
      <div class="env">build: {{ env }}</div>
    </aside>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

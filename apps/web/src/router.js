import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/",            redirect: "/dashboard" },
  { path: "/dashboard",   component: () => import("./views/Dashboard.vue"),   meta: { label: "Operations" } },
  { path: "/lab-review",  component: () => import("./views/LabReview.vue"),   meta: { label: "Lab Review" } },
  { path: "/tasks",       component: () => import("./views/TaskBoard.vue"),   meta: { label: "Tasks" } },
  { path: "/inventory",   component: () => import("./views/Inventory.vue"),   meta: { label: "Inventory" } },
  { path: "/workshop",    component: () => import("./views/Workshop.vue"),    meta: { label: "Workshop" } },
  { path: "/quotes",      component: () => import("./views/Quotes.vue"),      meta: { label: "Quotes" } },
];

export const router = createRouter({ history: createWebHistory(), routes });

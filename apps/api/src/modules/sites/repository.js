import { prisma } from "../../lib/prisma.js";

export const sitesRepo = {
  list: ({ state } = {}) =>
    prisma.site.findMany({
      where: state ? { state } : undefined,
      include: { customer: true, _count: { select: { equipment: true, visits: true, tasks: true } } },
      orderBy: { name: "asc" },
    }),

  get: (id) =>
    prisma.site.findUnique({
      where: { id },
      include: {
        customer: true,
        equipment: { include: { model: true } },
        visits: { orderBy: { scheduledFor: "desc" }, take: 10, include: { technician: true } },
        tasks:  { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, orderBy: { dueDate: "asc" } },
        labResults: { orderBy: { sampledAt: "desc" }, take: 5 },
      },
    }),

  create: (data) => prisma.site.create({ data }),
  update: (id, data) => prisma.site.update({ where: { id }, data }),
  remove: (id) => prisma.site.delete({ where: { id } }),

  // Dashboard aggregate — health roll-up for the operations view.
  dashboardSummary: async () => {
    const [siteCount, openTasks, overdueTasks, pendingLabs, anomalyLabs] = await Promise.all([
      prisma.site.count(),
      prisma.task.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
      prisma.task.count({
        where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, dueDate: { lt: new Date() } },
      }),
      prisma.labResult.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.labResult.count({ where: { status: "REVIEWED_ANOMALY" } }),
    ]);

    // Per-site health: derived from open anomaly labs + overdue tasks.
    const sites = await prisma.site.findMany({
      include: {
        customer: { select: { name: true } },
        tasks:      { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, select: { id: true, dueDate: true, priority: true } },
        labResults: { where: { status: "REVIEWED_ANOMALY" }, select: { id: true } },
      },
    });

    const sitesWithHealth = sites.map((s) => {
      const overdue = s.tasks.filter((t) => t.dueDate && t.dueDate < new Date()).length;
      const urgent  = s.tasks.filter((t) => t.priority === "URGENT").length;
      const anomalies = s.labResults.length;
      let health = "ok";
      if (anomalies > 0 || overdue > 0 || urgent > 0) health = "warning";
      if (anomalies > 1 || overdue > 2 || urgent > 1) health = "critical";
      return {
        id: s.id, name: s.name, customer: s.customer.name, state: s.state,
        openTasks: s.tasks.length, overdueTasks: overdue, anomalies, health,
      };
    });

    return {
      totals: { siteCount, openTasks, overdueTasks, pendingLabs, anomalyLabs },
      sites: sitesWithHealth,
    };
  },
};

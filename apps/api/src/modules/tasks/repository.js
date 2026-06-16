import { prisma } from "../../lib/prisma.js";

export const tasksRepo = {
  list: ({ status, siteId, technicianId, priority } = {}) =>
    prisma.task.findMany({
      where: { status, siteId, technicianId, priority },
      include: {
        site: { select: { name: true, customer: { select: { name: true } } } },
        technician: true,
        labResult: { select: { id: true, sampledAt: true } },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),

  get: (id) =>
    prisma.task.findUnique({
      where: { id },
      include: { site: true, technician: true, visit: true, labResult: true },
    }),

  create: (data) => prisma.task.create({ data }),
  update: (id, data) => prisma.task.update({ where: { id }, data }),

  board: async () => {
    const rows = await prisma.task.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      include: { site: { select: { name: true } }, technician: { select: { name: true } } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });
    return ["REQUESTED", "APPROVED", "ASSIGNED", "IN_PROGRESS"].reduce((acc, col) => {
      acc[col] = rows.filter((r) => r.status === col);
      return acc;
    }, {});
  },
};

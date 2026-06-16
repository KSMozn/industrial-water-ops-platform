import { prisma } from "../../lib/prisma.js";

export const visitsRepo = {
  list: ({ siteId, status, technicianId } = {}) =>
    prisma.serviceVisit.findMany({
      where: { siteId, status, technicianId },
      include: { site: { select: { name: true } }, technician: true, _count: { select: { tasks: true, labResults: true } } },
      orderBy: { scheduledFor: "desc" },
    }),

  get: (id) =>
    prisma.serviceVisit.findUnique({
      where: { id },
      include: { site: true, technician: true, labResults: true, tasks: true },
    }),

  create: (data) => prisma.serviceVisit.create({ data }),
  update: (id, data) => prisma.serviceVisit.update({ where: { id }, data }),

  technicians: () => prisma.technician.findMany({ orderBy: { name: "asc" } }),
};

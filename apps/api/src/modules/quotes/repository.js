import { prisma } from "../../lib/prisma.js";

export const quotesRepo = {
  list: ({ status, customerId } = {}) =>
    prisma.quote.findMany({
      where: { status, customerId },
      include: { customer: true, _count: { select: { lines: true, workOrders: true } } },
      orderBy: { createdAt: "desc" },
    }),

  get: (id) =>
    prisma.quote.findUnique({
      where: { id },
      include: { customer: true, lines: true, workOrders: true },
    }),

  create: (data) => prisma.quote.create({ data, include: { lines: true } }),
  update: (id, data) => prisma.quote.update({ where: { id }, data }),

  customers: () => prisma.customer.findMany({ orderBy: { name: "asc" } }),
};

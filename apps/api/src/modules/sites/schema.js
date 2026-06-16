import { z } from "zod";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export const createSiteSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1),
  addressLine: z.string().min(1),
  city: z.string().min(1),
  state: z.enum(AU_STATES),
  postcode: z.string().regex(/^\d{4}$/),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  industry: z.string().optional(),
});

export const updateSiteSchema = createSiteSchema.partial();

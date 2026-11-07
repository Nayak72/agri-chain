import { z } from "zod";

export const produceInputSchema = z.object({
  produce_type: z.string().min(1, "Choose a produce type"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().min(1, "Choose a category"),
  unit: z.string().min(1, "Enter a unit"),
  description: z.string().optional(),
});

export type ProduceInputValues = z.infer<typeof produceInputSchema>;

import { z } from "zod";

export const registerSchema = z.object({
  name:     z.string().min(2).max(60),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_.]+$/, "Lowercase letters, numbers, _ only"),
  email:    z.string().email(),
  password: z.string().min(8, "Min 8 characters"),
  city:     z.string().min(1, "City is required"),  // <-- ADD THIS
  state:    z.string().min(1, "State is required"), // <-- ADD THIS
});

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1, "Required"),
});

export const profileSchema = z.object({
  name:     z.string().min(2).max(60).optional(),
  bio:      z.string().max(300).optional(),
  location: z.string().max(100).optional(),
  city:     z.string().max(100).optional(),         // <-- ADD THIS
  state:    z.string().max(100).optional(),
  website:  z.string().url("Invalid URL").or(z.literal("")).optional(),
  category: z.enum(["Citizen","Politician","Professional","NGO","Volunteer","Organization"]).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput    = z.infer<typeof loginSchema>;
export type ProfileInput  = z.infer<typeof profileSchema>;

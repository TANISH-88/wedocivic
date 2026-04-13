import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...i: ClassValue[]) { return twMerge(clsx(i)); }

export function timeAgo(d?: string | Date): string {
  if (!d) return "";
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ""; }
}

export function formatDate(d?: string | Date): string {
  if (!d) return "";
  try { return format(new Date(d), "MMM d, yyyy"); } catch { return ""; }
}

export function fmtNum(n: number = 0): string {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(1)}K`;
  return String(n);
}

export function catColor(cat: string = ""): string {
  const m: Record<string,string> = {
    Citizen:"cat-citizen", Politician:"cat-politician",
    Professional:"cat-professional", NGO:"cat-ngo",
    Volunteer:"cat-volunteer", Organization:"cat-organization",
  };
  return m[cat] ?? "bg-slate-100 text-slate-600";
}

export function impactTier(score: number = 0) {
  if (score >= 500) return { label:"Legend",   color:"text-amber-500",  icon:"⭐" };
  if (score >= 200) return { label:"Champion",  color:"text-purple-500", icon:"🏆" };
  if (score >= 100) return { label:"Advocate",  color:"text-blue-500",   icon:"🎖️" };
  if (score >= 50)  return { label:"Activist",  color:"text-green-500",  icon:"🌱" };
  return               { label:"Newcomer",  color:"text-slate-400",  icon:"👋" };
}

export const IMPACT_TAGS = [
  "environment","education","healthcare","infrastructure","poverty",
  "human-rights","women-empowerment","youth","disability","agriculture",
  "water-sanitation","governance","disaster-relief","technology","arts-culture","other",
] as const;

export const CATEGORIES = ["Citizen","Politician","Professional","NGO","Volunteer","Organization"] as const;

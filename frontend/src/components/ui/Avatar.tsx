import Image from "next/image";
import { cn } from "@/lib/utils"; // Assuming you have a standard tailwind merge utility

interface AvatarProps {
  src?: string | null | any; // 'any' catches those weird DB objects
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function Avatar({ src, name, size = "md", className }: AvatarProps) {
  // Sizes dictionary
  const sz = {
    xs: "w-8 h-8 text-xs",
    sm: "w-10 h-10 text-sm",
    md: "w-14 h-14 text-lg",
    lg: "w-24 h-24 text-3xl",
    xl: "w-32 h-32 text-4xl"
  };

  // Generate initials safely
  const initials = name ? name.substring(0, 2).toUpperCase() : "??";

  // STRICT CHECK: Must be a string AND not be empty
  const isValidSrc = typeof src === "string" && src.trim() !== "";

  return (
    <div className={cn("rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-civic-100 to-emerald-100 flex items-center justify-center", sz[size], className)}>
      {isValidSrc ? (
        <Image 
          src={src} 
          alt={name || "User Avatar"} 
          width={112} 
          height={112} 
          className="w-full h-full object-cover" 
        />
      ) : (
        <span className="font-bold text-civic-600 tracking-widest">{initials}</span>
      )}
    </div>
  );
}
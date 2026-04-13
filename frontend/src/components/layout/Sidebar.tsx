"use client";
import Link from "next/link";
import { useState } from "react";
import { Zap, Flame } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import Avatar from "@/components/ui/Avatar";
import ConnectionsModal from "../modals/ConnectionsModal"; 
import { impactTier, fmtNum, cn } from "@/lib/utils";

export default function Sidebar() {
  const { user } = useAuthStore();
  
  // Modal State
  const [isConnOpen, setIsConnOpen] = useState(false);

  if (!user) return null;

  // Formatting score to 1 decimal place to fix the long decimal bug
  const score   = Number(user.impact_score || 0).toFixed(1);
  const posts   = user.posts_count    ?? 0;
  const foll    = user.followers_count ?? 0;
  const folling = user.following_count ?? 0;
  const streak  = user.claim_streak   ?? 0;
  const canClaim= user.can_claim_today ?? false;
  const tier    = impactTier(Number(score));

  return (
    <aside className="w-72 shrink-0 hidden lg:block sticky top-20 self-start space-y-3">
      {/* Profile card */}
      <div className="card overflow-hidden">
        <div className="h-14 bg-gradient-to-r from-civic-600 to-emerald-400" />
        <div className="px-4 pb-4">
          <div className="-mt-7 mb-3">
            <Link href={`/profile/${user.username}`}>
              <Avatar src={user.avatar?.url} name={user.name} size="lg" className="ring-4 ring-white shadow-soft" />
            </Link>
          </div>
          <Link href={`/profile/${user.username}`} className="group">
            <p className="font-bold text-slate-800 group-hover:text-civic-600 transition-colors">{user.name}</p>
            <p className="text-xs text-slate-400">@{user.username}</p>
          </Link>

          {/* Stats Grid: Clickable for Followers/Following */}
          <div className="grid grid-cols-3 gap-1 mt-3">
            {[["Posts", posts], ["Followers", foll], ["Following", folling]].map(([l, v]) => {
              const isClickable = l === "Followers" || l === "Following";
              return (
                <div 
                  key={l as string} 
                  onClick={isClickable ? () => setIsConnOpen(true) : undefined}
                  className={cn(
                    "text-center py-2 bg-slate-50 rounded-lg transition-all",
                    isClickable && "cursor-pointer hover:bg-civic-50 active:scale-95"
                  )}
                >
                  <p className={cn("font-bold text-sm", isClickable ? "text-civic-600" : "text-slate-800")}>
                    {fmtNum(v as number)}
                  </p>
                  <p className="text-[10px] text-slate-400">{l}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 p-3 bg-gradient-to-r from-civic-50 to-emerald-50 rounded-xl border border-civic-100">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-civic-600" /><span className="text-xs font-bold text-slate-600">Impact</span></div>
              <span className={cn("text-xs font-bold", tier.color)}>{tier.icon} {tier.label}</span>
            </div>
            {/* Cleaned up points display */}
            <p className={cn("text-xl font-bold", tier.color)}>{score} pts</p>
            <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-civic-400 to-civic-600 rounded-full transition-all"
                style={{width:`${Math.min((Number(score)%100)/100*100,100)}%`}} />
            </div>
          </div>
          {streak > 0 && (
            <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-xl border border-orange-100">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-bold text-orange-600">{streak} day streak!</span>
            </div>
          )}
          <Link href={`/profile/${user.username}`}
            className={cn("mt-3 w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
              canClaim ? "bg-gradient-to-r from-civic-500 to-emerald-500 text-white shadow-green hover:shadow-green-lg claim-pulse"
                       : "bg-slate-100 text-slate-400")}>
            <Zap className="h-4 w-4" />
            {canClaim ? "Claim Daily Points!" : "Points claimed ✓"}
          </Link>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 px-1">© 2026 CivicImpact · <Link href="/about" className="hover:underline">About</Link></p>
      
      {/* Connections Modal Component: Passing userId ensures it fetches data automatically */}
      <ConnectionsModal 
        isOpen={isConnOpen} 
        onClose={() => setIsConnOpen(false)} 
        userId={user.id || user._id} 
      />
    </aside>
  );
}

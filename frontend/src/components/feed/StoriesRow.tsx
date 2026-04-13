"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { userService } from "@/services/index"; 
import { useAuthStore } from "@/store/auth.store";
import Avatar from "@/components/ui/Avatar";

export default function StoriesRow() {
  const { user } = useAuthStore();
  const [following, setFollowing] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id && !user?._id) return; 
    const uid = user.id || user._id;

    userService.getFollowing(uid)
      .then(({ data }) => {
        if (data.success) setFollowing(data.following || data.users || []);
      })
      .catch((err) => console.error("Stories failed to load:", err));
  }, [user]);

  if (!user) return null;

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-[32px] p-5 mb-6 shadow-sm overflow-hidden">
      <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">

        {/* Your Story */}
        <div className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group">
          <div className="relative">
            <div className="w-[72px] h-[72px] rounded-full border-[2px] border-slate-200 bg-white p-[3px]">
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                <Avatar
                  src={user.avatar?.url}
                  name={user.name || "Me"}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="absolute bottom-0 right-0 bg-civic-600 rounded-full p-1 border-[3px] border-white text-white">
              <Plus className="h-3 w-3 stroke-[4]" />
            </div>
          </div>
          <span className="text-[11px] font-bold text-slate-500">Your Story</span>
        </div>

        {/* Following Stories */}
        {following.map((u) => (
          <Link
            key={u.id || u._id}
            href={`/profile/${u.username}`}
            className="flex flex-col items-center gap-2 shrink-0"
          >
            <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-tr from-amber-400 via-civic-500 to-emerald-400 p-[2.5px]">
              <div className="w-full h-full bg-white rounded-full p-[2px]">
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                  <Avatar
                    src={u.avatar?.url}
                    name={u.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-slate-600 truncate w-[72px] text-center">
              {u.name.split(" ")[0]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, CheckCheck } from "lucide-react";
import { notificationService } from "@/services/index";
import { useRequireAuth } from "@/hooks/index";
import Avatar from "@/components/ui/Avatar";
import { timeAgo, cn } from "@/lib/utils";
import api from "@/lib/api";

const typeIcon: Record<string,string> = { like:"❤️", comment:"💬", follow:"👤", mention:"🔔", event_join:"🙋", event_reminder:"📅" };

export default function NotificationsPage() {
  useRequireAuth();
  const [notifs,  setNotifs]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationService.getNotifications()
      .then(({ data }) => { setNotifs(data.notifications ?? []); api.put("/notifications/read-all").catch(()=>{}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unread = notifs.filter(n => !n.is_read).length;
  const notifLink = (n: any) => n.entity_type==="Post"?`/posts/${n.entity}`:n.entity_type==="User"?`/profile/${n.sender?.username}`:"#";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center relative">
            <Bell className="h-5 w-5 text-blue-600" />
            {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>}
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-slate-800">Notifications</h1>
            <p className="text-xs text-slate-400">{unread > 0 ? `${unread} unread` : "All caught up!"}</p>
          </div>
        </div>
        {unread > 0 && (
          <button onClick={() => setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-civic-600 font-semibold transition-colors">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-civic-400" /></div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-16"><p className="text-4xl mb-3">🔔</p><p className="text-sm text-slate-400">No notifications yet</p></div>
        ) : (
          notifs.map(n => (
            <Link key={n.id} href={notifLink(n)}
              className={cn("flex items-center gap-3 px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group",
                !n.is_read && "bg-civic-50/50 hover:bg-civic-50/70")}>
              <div className="relative shrink-0">
                <Avatar src={n.sender?.avatar?.url} name={n.sender?.name ?? "?"} size="sm" />
                <span className="absolute -bottom-0.5 -right-0.5 text-[11px] leading-none">{typeIcon[n.type] ?? "🔔"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm text-slate-700 leading-snug", !n.is_read && "font-semibold")}>{n.message}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
              </div>
              {!n.is_read && <div className="w-2 h-2 rounded-full bg-civic-500 shrink-0" />}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

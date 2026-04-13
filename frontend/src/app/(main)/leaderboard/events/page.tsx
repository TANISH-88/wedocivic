"use client";
import { useEffect, useState } from "react";
import { CalendarCheck, MapPin, Users, PlusCircle, Loader2, Clock } from "lucide-react";
import { eventService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";
import Avatar from "@/components/ui/Avatar";
import { formatDate, cn } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";
import CreateEventModal from "@/components/event/CreateEventModal";
import api from "@/lib/api";

export default function EventsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joiningId, setJoiningId] = useState<string|null>(null);

  const load = async () => { setLoading(true); try { const {data}=await eventService.getEvents(); setEvents(data.events??[]); } catch { toast.error("Failed to load events"); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const join = async (id: string) => {
    if (!isAuthenticated) { toast.error("Please log in"); return; }
    setJoiningId(id);
    try {
      const { data } = await api.post(`/events/${id}/join`);
      const uid = user?.id ?? user?._id ?? "";
      setEvents(prev => prev.map(e => e.id!==id?e:{...e,participants_count:e.participants_count+(data.joined?1:-1),
        participants:data.joined?[...(e.participants??[]),uid]:(e.participants??[]).filter((p:string)=>p!==uid)}));
      toast.success(data.message);
    } catch (e:any) { toast.error(e?.response?.data?.detail??"Failed"); }
    finally { setJoiningId(null); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800">Volunteer Events</h1>
          <p className="text-sm text-slate-400 mt-0.5">Join events making a difference near you</p>
        </div>
        {isAuthenticated && <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-civic-600 to-civic-500 text-white text-sm font-bold rounded-xl hover:from-civic-700 hover:to-civic-600 shadow-green transition-all"><PlusCircle className="h-4 w-4" />Create event</button>}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-civic-500 border-t-transparent rounded-full animate-spin" /></div>
      : events.length===0 ? (
        <div className="card text-center py-16"><p className="text-4xl mb-3">📅</p><p className="text-slate-400 text-sm">No upcoming events yet.</p></div>
      ) : (
        <div className="space-y-4">
          {events.map(e => {
            const uid = user?.id ?? user?._id ?? "";
            const joined = uid && (e.participants??[]).includes(uid);
            const full   = e.participants_count >= e.volunteers_required;
            const isOwn  = uid && e.organizer?.id === uid;
            const pct    = Math.min((e.participants_count/Math.max(e.volunteers_required,1))*100, 100);
            return (
              <div key={e.id} className="card-hover p-5">
                <div className="flex gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-civic-500 to-emerald-500 flex flex-col items-center justify-center text-white shadow-green">
                    <span className="text-[9px] font-bold uppercase opacity-80">{new Date(e.event_date).toLocaleString("default",{month:"short"})}</span>
                    <span className="text-xl font-bold leading-none">{new Date(e.event_date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{e.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{e.description}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{e.participants_count}/{e.volunteers_required}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(e.event_date)}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-civic-400 to-civic-600 rounded-full transition-all" style={{width:`${pct}%`}} />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <Link href={`/profile/${e.organizer?.username}`} className="flex items-center gap-1.5 group">
                        <Avatar src={e.organizer?.avatar?.url} name={e.organizer?.name} size="xs" />
                        <span className="text-xs text-slate-500 group-hover:text-civic-600 transition-colors">{e.organizer?.name}</span>
                      </Link>
                      {isAuthenticated && !isOwn && (
                        <button onClick={()=>join(e.id)} disabled={joiningId===e.id||(full&&!joined)}
                          className={cn("text-xs font-bold px-4 py-1.5 rounded-lg transition-all",
                            joined?"border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-500":full?"bg-slate-100 text-slate-400 cursor-not-allowed":"bg-civic-600 text-white hover:bg-civic-700 shadow-green")}>
                          {joiningId===e.id?<Loader2 className="h-3.5 w-3.5 animate-spin" />:joined?"Leave":full?"Full":"Join"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {e.impact_tags?.length>0 && <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap gap-1.5">{e.impact_tags.map((t:string)=><span key={t} className="text-[10px] bg-civic-50 text-civic-600 px-2 py-0.5 rounded-full font-medium">#{t}</span>)}</div>}
              </div>
            );
          })}
        </div>
      )}
      {showCreate && <CreateEventModal onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false);load();}} />}
    </div>
  );
}

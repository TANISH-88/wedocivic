"use client";
import { useState } from "react";
import { X, MapPin, Calendar, Users, Tag, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { eventService } from "@/services/index";
import { IMPACT_TAGS, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const schema = z.object({
  title:               z.string().min(3).max(120),
  description:         z.string().min(10).max(2000),
  location:            z.string().min(2).max(200),
  event_date:          z.string().min(1),
  volunteers_required: z.number().int().min(1).optional(),
});

export default function CreateEventModal({ onClose, onCreated }: { onClose:()=>void; onCreated?:()=>void }) {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState:{errors} } = useForm({ resolver: zodResolver(schema), defaultValues:{volunteers_required:10} });

  const onSubmit = async (v: any) => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(v).forEach(([k,val])=>fd.append(k,String(val)));
      fd.append("impact_tags", tags.join(","));
      await eventService.createEvent(fd);
      toast.success("Event created! +20 impact points 🏆");
      onCreated?.(); onClose();
    } catch (e:any) { toast.error(e?.response?.data?.detail ?? "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-medium animate-scale-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-slate-800">Create Volunteer Event</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto scrollbar-thin p-5 space-y-4 flex-1">
          <Field label="Title *" error={errors.title?.message as string}>
            <input {...register("title")} placeholder="Clean-up drive at Gomti Riverfront" className={iCls(!!errors.title)} />
          </Field>
          <Field label="Description *" error={errors.description?.message as string}>
            <textarea {...register("description")} rows={3} placeholder="What will volunteers do and what impact will it create?" className={cn(iCls(!!errors.description),"resize-none")} />
          </Field>
          <Field label="Location *" error={errors.location?.message as string}>
            <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input {...register("location")} placeholder="City or full address" className={cn(iCls(!!errors.location),"pl-9")} />
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Event date *" error={errors.event_date?.message as string}>
              <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input {...register("event_date")} type="datetime-local" className={cn(iCls(!!errors.event_date),"pl-9")} />
              </div>
            </Field>
            <Field label="Volunteers needed">
              <div className="relative"><Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input {...register("volunteers_required",{valueAsNumber:true})} type="number" min={1} placeholder="50" className={cn(iCls(false),"pl-9")} />
              </div>
            </Field>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2"><Tag className="h-4 w-4 text-slate-400" /><span className="text-xs font-semibold text-slate-500">Impact categories</span></div>
            <div className="flex flex-wrap gap-1.5">
              {IMPACT_TAGS.map(t => (
                <button key={t} type="button" onClick={()=>setTags(prev=>prev.includes(t)?prev.filter(x=>x!==t):[...prev,t])}
                  className={cn("text-[11px] px-2.5 py-1 rounded-full border transition-all",
                    tags.includes(t)?"bg-civic-600 text-white border-civic-600":"border-slate-200 text-slate-600 hover:border-civic-400")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 bg-civic-50 rounded-xl border border-civic-100 text-xs text-civic-700">
            🏆 Creating earns <strong>+20 pts</strong>. Each volunteer who joins earns <strong>+5 pts</strong>.
          </div>
        </form>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit(onSubmit)} disabled={loading}
            className="flex-1 py-2.5 bg-civic-600 text-white rounded-xl text-sm font-bold hover:bg-civic-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-green">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create Event
          </button>
        </div>
      </div>
    </div>
  );
}
function Field({label,error,children}:{label:string;error?:string;children:React.ReactNode}) {
  return <div><label className="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>{children}{error&&<p className="text-xs text-red-500 mt-1">{error}</p>}</div>;
}
function iCls(e:boolean) {
  return cn("w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all", e?"border-red-300 bg-red-50":"border-slate-200 bg-white focus:border-civic-400 focus:ring-2 focus:ring-civic-100");
}

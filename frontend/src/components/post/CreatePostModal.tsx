"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, ImagePlus, MapPin, Tag, Loader2 } from "lucide-react";
import { postService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";
import { IMPACT_TAGS, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Image from "next/image";

export default function CreatePostModal({ onClose, onCreated }: { onClose:()=>void; onCreated?:()=>void }) {
  const { user, setUser } = useAuthStore();
  const [files,    setFiles]    = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [tags,     setTags]     = useState<string[]>([]);
  const [caption,  setCaption]  = useState("");
  const [location, setLocation] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState<"media"|"details">("media");

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted.slice(0, 5);
    setFiles(f); setPreviews(f.map(x => URL.createObjectURL(x))); setStep("details");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*":[], "video/*":[] }, maxFiles: 5, maxSize: 50*1024*1024,
  });

  const submit = async () => {
    if (!files.length) { toast.error("Add at least one photo or video"); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("media", f));
      fd.append("caption", caption);
      fd.append("location", location);
      fd.append("impact_tags", tags.join(","));
      await postService.createPost(fd);
      if (user) setUser({ ...user, posts_count: (user.posts_count||0)+1, impact_score: (user.impact_score||0)+10 });
      toast.success("Posted! +10 impact points 🌱");
      onCreated?.(); onClose();
    } catch (err:any) {
      toast.error(err?.response?.data?.detail ?? "Failed to post");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-medium animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{step==="media"?"Create post":"Add details"}</h2>
          <div className="flex items-center gap-3">
            {step==="details" && (
              <button onClick={submit} disabled={loading}
                className="text-sm font-bold text-civic-600 hover:text-civic-700 disabled:opacity-50 flex items-center gap-1">
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Share
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        {step==="media" ? (
          <div {...getRootProps()} className={cn(
            "m-4 h-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
            isDragActive ? "border-civic-500 bg-civic-50" : "border-slate-200 hover:border-civic-400 hover:bg-slate-50"
          )}>
            <input {...getInputProps()} />
            <ImagePlus className={cn("h-12 w-12", isDragActive?"text-civic-500":"text-slate-300")} />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">{isDragActive?"Drop here":"Drag photos or videos"}</p>
              <p className="text-xs text-slate-400 mt-1">Up to 5 files · max 50MB each</p>
            </div>
            <button type="button" className="mt-1 px-5 py-2 bg-civic-600 text-white text-sm font-semibold rounded-xl hover:bg-civic-700 transition-colors shadow-green">
              Select from computer
            </button>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin p-5 space-y-4">
            {/* Previews */}
            <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
              {previews.map((p,i) => (
                <div key={i} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-slate-100">
                  <Image src={p} alt="" fill className="object-cover" />
                  <button onClick={()=>{
                    const nf=files.filter((_,j)=>j!==i), np=previews.filter((_,j)=>j!==i);
                    setFiles(nf); setPreviews(np); if(!nf.length) setStep("media");
                  }} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>

            {/* Caption */}
            <textarea value={caption} onChange={e=>setCaption(e.target.value)}
              placeholder={`Share what you're doing for your community…`} rows={3}
              className="w-full text-sm resize-none outline-none placeholder:text-slate-300 bg-transparent" />

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Add location"
                  className="flex-1 text-sm outline-none placeholder:text-slate-300" />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-500">Impact tags</span>
                </div>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

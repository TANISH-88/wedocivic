"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Loader2, Users, Hash, X } from "lucide-react";
import PostCard, { PostData } from "@/components/post/PostCard";
import Avatar from "@/components/ui/Avatar";
import Link from "next/link";
import { userService, postService } from "@/services/index";
import { catColor, IMPACT_TAGS, cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/index";

export default function ExplorePage() {
  const sp = useSearchParams();
  const [q,   setQ]   = useState(sp.get("q") ?? "");
  const [tab, setTab] = useState<"posts"|"people">("posts");
  const [tag, setTag] = useState(sp.get("tag") ?? "");
  const [posts, setPosts] = useState<PostData[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dq = useDebounce(q, 400);

  const loadPosts = useCallback(async (t: string) => {
    setLoading(true);
    try { const { data } = await postService.explorePosts(t); setPosts(data.posts ?? []); }
    catch { setPosts([]); } finally { setLoading(false); }
  }, []);

  const loadPeople = useCallback(async (query: string) => {
    setLoading(true);
    try { const { data } = await userService.searchUsers(query); setUsers(data.users ?? []); }
    catch { setUsers([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab==="posts") loadPosts(tag); else loadPeople(dq); }, [tab, tag, dq]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-fade-in">
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search people or topics…"
          className="w-full pl-11 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-civic-200 focus:border-civic-400 shadow-soft transition-all" />
        {q && <button onClick={()=>setQ("")} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-400" /></button>}
      </div>

      <div className="flex border-b border-slate-200 mb-5">
        {(["posts","people"] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)}
            className={cn("flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all",
              tab===t?"border-civic-600 text-civic-700":"border-transparent text-slate-400 hover:text-slate-600")}>
            {t==="posts"?<Hash className="h-4 w-4" />:<Users className="h-4 w-4" />}
            {t==="posts"?"Posts":"People"}
          </button>
        ))}
      </div>

      {tab==="posts" && (
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-3 mb-5">
          <Pill active={!tag} onClick={()=>setTag("")}>All</Pill>
          {IMPACT_TAGS.map(t => <Pill key={t} active={tag===t} onClick={()=>setTag(tag===t?"":t)}>#{t}</Pill>)}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-civic-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : tab==="people" ? (
        users.length===0 ? <Empty icon="👥" label={dq.length>1?`No results for "${dq}"`:"Search by name or username"} />
        : <div className="space-y-2">{users.map(u=>(
            <Link key={u.id} href={`/profile/${u.username}`} className="card-hover p-4 flex items-center gap-3 group">
              <Avatar src={u.avatar?.url} name={u.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 group-hover:text-civic-600 transition-colors">{u.name}</p>
                <p className="text-xs text-slate-400">@{u.username}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("impact-badge text-[10px]", catColor(u.category))}>{u.category}</span>
                <span className="text-xs font-bold text-civic-600">⚡ {u.impact_score??0}</span>
              </div>
            </Link>
          ))}</div>
      ) : (
        posts.length===0 ? <Empty icon="📭" label={tag?`No posts tagged #${tag} yet`:"No posts yet — be the first!"} />
        : <div className="feed-w mx-auto space-y-4">{posts.map((p,i)=><PostCard key={p._id||p.id} post={p} index={i} />)}</div>
      )}
    </div>
  );
}

function Pill({ active, onClick, children }: any) {
  return (
    <button onClick={onClick} className={cn("shrink-0 text-xs px-4 py-2 rounded-full font-semibold border transition-all",
      active?"bg-civic-600 text-white border-civic-600 shadow-green":"border-slate-200 text-slate-600 hover:border-civic-300 bg-white")}>
      {children}
    </button>
  );
}
function Empty({ icon, label }: any) {
  return <div className="text-center py-16"><p className="text-4xl mb-3">{icon}</p><p className="text-sm text-slate-400">{label}</p></div>;
}

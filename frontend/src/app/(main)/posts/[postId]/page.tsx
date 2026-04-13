"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Heart, Send, Loader2, ArrowLeft, MessageCircle } from "lucide-react";
import { postService, socialService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";
import Avatar from "@/components/ui/Avatar";
import { timeAgo, catColor, fmtNum, cn } from "@/lib/utils";
import type { PostData } from "@/components/post/PostCard";
import toast from "react-hot-toast";

export default function PostPage() {
  const { postId } = useParams<{ postId:string }>();
  const { user }   = useAuthStore();
  const router     = useRouter();
  const [post,    setPost]    = useState<PostData|null>(null);
  const [comments,setComments]= useState<any[]>([]);
  const [text,    setText]    = useState("");
  const [liked,   setLiked]   = useState(false);
  const [cnt,     setCnt]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [midx,    setMidx]    = useState(0);

  useEffect(() => {
    Promise.all([postService.getPost(postId), socialService.getComments(postId)])
      .then(([{data:pd},{data:cd}]) => {
        setPost(pd.post); setComments(cd.comments??[]);
        setLiked(pd.post?.is_liked??pd.post?.isLiked??false);
        setCnt(pd.post?.likes_count??pd.post?.likesCount??0);
      }).catch(()=>toast.error("Post not found")).finally(()=>setLoading(false));
  }, [postId]);

  const handleLike = async () => {
    if (!user){toast.error("Please log in");return;}
    const prev=liked; setLiked(!liked); setCnt(c=>liked?c-1:c+1);
    try{await socialService.toggleLike(postId,"Post");}catch{setLiked(prev);setCnt(c=>prev?c+1:c-1);}
  };

  const handleComment = async () => {
    if (!text.trim()||!user) return;
    setSending(true);
    try{const{data}=await socialService.addComment(postId,text.trim());setComments(p=>[data.comment,...p]);setText("");}
    catch{toast.error("Failed to comment");}finally{setSending(false);}
  };

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-civic-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!post)   return <div className="text-center py-20 text-slate-400">Post not found</div>;

  const a      = post.author;
  const tags   = post.impact_tags??post.impactTags??[];
  const ca     = post.created_at??post.createdAt??"";
  const ver    = a.is_verified??a.isVerified??false;
  const media  = post.media??[];
  const cur    = media[midx];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-fade-in">
      <button onClick={()=>router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 font-medium transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Media */}
        <div className="md:w-[60%] bg-slate-900 relative flex items-center justify-center">
          {cur?.type==="video"
            ? <video src={cur.url} controls className="w-full max-h-[600px] object-contain" />
            : cur
              ? <div className="relative w-full aspect-square"><Image src={cur.url} alt={post.caption??""} fill className="object-contain" /></div>
              : null
          }
          {media.length>1&&(
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {media.map((_,i)=><button key={i} onClick={()=>setMidx(i)} className={cn("rounded-full bg-white/80 transition-all",i===midx?"w-4 h-1.5":"w-1.5 h-1.5 opacity-50")} />)}
            </div>
          )}
        </div>

        {/* Side */}
        <div className="md:w-[40%] flex flex-col border-l border-slate-100">
          {/* Author */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
            <Link href={`/profile/${a.username}`}><Avatar src={a.avatar?.url} name={a.name} size="sm" /></Link>
            <div className="flex-1">
              <Link href={`/profile/${a.username}`} className="font-bold text-sm text-slate-800 hover:text-civic-600">{a.name}</Link>
              <div className="flex items-center gap-1.5 mt-0.5">
                {ver&&<svg className="h-3.5 w-3.5 text-civic-500" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                <span className={cn("impact-badge text-[9px]",catColor(a.category))}>{a.category}</span>
              </div>
            </div>
          </div>

          {/* Comments scroll */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
            {post.caption&&(
              <div className="flex gap-2.5">
                <Avatar src={a.avatar?.url} name={a.name} size="xs" className="shrink-0 mt-0.5" />
                <div><span className="text-xs font-bold text-slate-800 mr-1.5">{a.username}</span><span className="text-xs text-slate-600 leading-relaxed">{post.caption}</span><p className="text-[10px] text-slate-300 mt-1">{timeAgo(ca)}</p></div>
              </div>
            )}
            {tags.length>0&&<div className="flex flex-wrap gap-1">{tags.map((t:string)=><span key={t} className="text-[10px] text-civic-600 font-medium">#{t}</span>)}</div>}
            {comments.length===0&&<div className="text-center py-8"><MessageCircle className="h-8 w-8 text-slate-200 mx-auto mb-2"/><p className="text-xs text-slate-400">No comments yet. Be first!</p></div>}
            {comments.map((c:any)=>(
              <div key={c.id} className="flex gap-2.5">
                <Avatar src={c.author?.avatar?.url} name={c.author?.name} size="xs" className="shrink-0 mt-0.5" />
                <div><span className="text-xs font-bold text-slate-800 mr-1.5">{c.author?.username}</span><span className="text-xs text-slate-600 leading-relaxed">{c.text}</span><p className="text-[10px] text-slate-300 mt-1">{timeAgo(c.created_at)}</p></div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="px-4 py-3 border-t border-slate-100">
            <button onClick={handleLike} className={cn("p-1.5 rounded-xl transition-all hover:scale-110",liked?"text-red-500":"text-slate-500 hover:text-red-400 hover:bg-red-50")}>
              <Heart className={cn("h-6 w-6",liked&&"fill-current")} />
            </button>
            {cnt>0&&<p className="text-xs font-bold text-slate-700 mt-1">{fmtNum(cnt)} likes</p>}
            <p className="text-[10px] text-slate-300 uppercase tracking-wider mt-1">{timeAgo(ca)}</p>
          </div>

          {/* Comment input */}
          {user&&(
            <div className="flex items-center gap-2.5 px-4 py-3 border-t border-slate-100">
              <Avatar src={user.avatar?.url} name={user.name} size="xs" className="shrink-0" />
              <input value={text} onChange={e=>setText(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleComment();}}}
                placeholder="Add a comment…" className="flex-1 text-sm outline-none placeholder:text-slate-300 bg-transparent" />
              <button onClick={handleComment} disabled={!text.trim()||sending} className="text-civic-600 font-bold disabled:opacity-40 hover:text-civic-700">
                {sending?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

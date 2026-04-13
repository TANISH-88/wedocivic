"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, MapPin, Send } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { socialService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";
import { timeAgo, catColor, fmtNum, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export interface PostData {
  _id: string; id?: string;
  author: { id?:string; _id?:string; username:string; name:string; avatar:{url:string}; category:string; is_verified?:boolean; isVerified?:boolean };
  caption: string;
  media: Array<{ url:string; type:"image"|"video"; public_id?:string }>;
  location: string;
  impact_tags?: string[]; impactTags?: string[];
  likes_count?: number;   likesCount?: number;
  comments_count?: number; commentsCount?: number;
  is_liked?: boolean;     isLiked?: boolean;
  created_at?: string;    createdAt?: string;
}

export default function PostCard({ post, index=99, onDeleted }: { post:PostData; index?:number; onDeleted?:(id:string)=>void }) {
  const { user } = useAuthStore();
  const likes    = post.likes_count    ?? post.likesCount    ?? 0;
  const comments = post.comments_count ?? post.commentsCount ?? 0;
  const tags     = post.impact_tags    ?? post.impactTags    ?? [];
  const liked0   = post.is_liked       ?? post.isLiked       ?? false;
  const createdAt= post.created_at     ?? post.createdAt     ?? "";
  const verified = post.author.is_verified ?? post.author.isVerified ?? false;
  const pid      = post._id || post.id || "";

  const [liked,   setLiked]   = useState(liked0);
  const [cnt,     setCnt]     = useState(likes);
  const [midx,    setMidx]    = useState(0);
  const [full,    setFull]    = useState(false);
  const [saved,   setSaved]   = useState(false);

  const handleLike = async () => {
    if (!user) { toast.error("Please log in to like"); return; }
    const prev = liked; setLiked(!liked); setCnt(c => liked ? c-1 : c+1);
    try { await socialService.toggleLike(pid, "Post"); }
    catch { setLiked(prev); setCnt(c => prev ? c+1 : c-1); }
  };

  const media = post.media ?? [];
  const cur   = media[midx];

  return (
    <article className="card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={`/profile/${post.author.username}`} className="flex items-center gap-3 group">
          <Avatar src={post.author.avatar?.url} name={post.author.name} size="sm" />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-slate-800 group-hover:text-civic-600 transition-colors">{post.author.name}</span>
              {verified && <svg className="h-4 w-4 text-civic-500" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              <span className={cn("impact-badge text-[10px]", catColor(post.author.category))}>{post.author.category}</span>
            </div>
            {post.location && <p className="text-[11px] text-slate-400 flex items-center gap-0.5 mt-0.5"><MapPin className="h-3 w-3" />{post.location}</p>}
          </div>
        </Link>
        <button className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"><MoreHorizontal className="h-5 w-5" /></button>
      </div>

      {/* Media */}
      {media.length > 0 && cur && (
        <div className="relative aspect-square bg-slate-100">
          {cur.type === "video"
            ? <video src={cur.url} controls preload="metadata" className="w-full h-full object-cover" />
            : <Image src={cur.url} alt={post.caption||"Post"} fill priority={index<2} loading={index<2?"eager":"lazy"}
                className="object-cover" sizes="(max-width:640px) 100vw, 470px" />
          }
          {media.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {media.map((_,i) => (
                <button key={i} onClick={()=>setMidx(i)}
                  className={cn("rounded-full bg-white/80 transition-all", i===midx?"w-4 h-1.5":"w-1.5 h-1.5 opacity-60")} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <button onClick={handleLike} className={cn("p-2 rounded-xl transition-all hover:scale-110 active:scale-95", liked?"text-red-500":"text-slate-500 hover:text-red-400 hover:bg-red-50")}>
            <Heart className={cn("h-6 w-6", liked&&"fill-current")} />
          </button>
          <Link href={`/posts/${pid}`} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            <MessageCircle className="h-6 w-6" />
          </Link>
          <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"><Send className="h-6 w-6" /></button>
        </div>
        <button onClick={()=>setSaved(!saved)} className={cn("p-2 rounded-xl transition-all", saved?"text-civic-600":"text-slate-500 hover:text-slate-700 hover:bg-slate-100")}>
          <Bookmark className={cn("h-6 w-6", saved&&"fill-current")} />
        </button>
      </div>

      {cnt > 0 && <p className="px-4 text-sm font-bold text-slate-700">{fmtNum(cnt)} {cnt===1?"like":"likes"}</p>}

      {post.caption && (
        <div className="px-4 py-1">
          <p className="text-sm text-slate-700">
            <Link href={`/profile/${post.author.username}`} className="font-bold mr-1.5 text-slate-800 hover:text-civic-600">{post.author.username}</Link>
            <span className={cn(!full&&"line-clamp-2")}>{post.caption}</span>
          </p>
          {post.caption.length > 100 && <button onClick={()=>setFull(!full)} className="text-xs text-slate-400 hover:text-slate-600 mt-0.5">{full?"less":"more"}</button>}
        </div>
      )}

      {tags.length > 0 && (
        <div className="px-4 pt-1 flex flex-wrap gap-1.5">
          {tags.map(t => <Link key={t} href={`/explore?tag=${t}`} className="text-[11px] text-civic-600 hover:text-civic-800 font-medium hover:underline">#{t}</Link>)}
        </div>
      )}

      {comments > 0 && <Link href={`/posts/${pid}`} className="px-4 pt-1 text-xs text-slate-400 hover:text-slate-600 block">View all {fmtNum(comments)} comments</Link>}
      <p className="px-4 pt-1 pb-3 text-[10px] text-slate-300 uppercase tracking-wider">{timeAgo(createdAt)}</p>
    </article>
  );
}

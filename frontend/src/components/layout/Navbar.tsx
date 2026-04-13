"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, Bell, PlusSquare, Home, Compass, CalendarCheck, LogOut, User, Settings, Trophy, X, Menu } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import Avatar from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import CreatePostModal from "@/components/post/CreatePostModal";
import { useChatStore } from "@/store/chat.store";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { clearChat } = useChatStore();
  const router = useRouter();
  const pathname = usePathname();
  const [showCreate, setShowCreate] = useState(false);
  const [showMenu,   setShowMenu]   = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [q,          setQ]          = useState("");
  const menuRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ... (Keep existing useEffects and search function) ...
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => { if (showSearch) searchRef.current?.focus(); }, [showSearch]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { router.push(`/explore?q=${encodeURIComponent(q.trim())}`); setShowSearch(false); setQ(""); }
  };

  const score = user?.impact_score ?? 0;

  const links = [
    { href:"/",               icon:Home,          label:"Home" },
    { href:"/explore",        icon:Compass,       label:"Explore" },
    { href:"/events",         icon:CalendarCheck, label:"Events" },
    { href:"/leaderboard",    icon:Trophy,        label:"Leaderboard" },
    { href:"/notifications",  icon:Bell,          label:"Notifications" },
  ];

  // ✅ New handleLogout function to ensure both Auth and Chat are cleared
  const handleLogout = () => {
    clearChat(); // Wipe the bot's memory
    logout();    // Clear auth state
    router.push("/");
    setShowMenu(false);
  };

  return (
    <>
      <nav className="fixed top-0 w-full z-50 h-14 bg-transparent border-transparent ">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-3">
          {/* ... Logo & Search ... */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-civic-500 to-civic-700 flex items-center justify-center shadow-green group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-sm">CI</span>
            </div>
            <span className="font-display font-bold text-white text-lg hidden sm:block tracking-tight">CivicImpact</span>
          </Link>

          <form onSubmit={search} className="hidden md:flex flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search people, causes…"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-civic-400 focus:ring-2 focus:ring-civic-100 transition-all" />
            </div>
          </form>

          {/* Right */}
          <div className="flex items-center gap-0.5">
            {isAuthenticated ? (
              <>
                <button onClick={()=>setShowSearch(!showSearch)} className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors">
                  <Search className="h-5 w-5 text-slate-600" />
                </button>
                {links.map(({href,icon:Icon,label}) => (
                  <Link key={href} href={href} title={label}
                    className={cn("p-2 rounded-xl transition-all relative hidden sm:flex",
                      pathname===href ? "bg-civic-50 text-civic-600" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}>
                    <Icon className="h-5 w-5" />
                    {pathname===href && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-civic-500 rounded-full" />}
                  </Link>
                ))}
                <button onClick={()=>setShowCreate(true)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all">
                  <PlusSquare className="h-5 w-5" />
                </button>

                <div className="relative ml-1" ref={menuRef}>
                  <button onClick={()=>setShowMenu(!showMenu)}
                    className="rounded-xl focus:outline-none focus:ring-2 focus:ring-civic-400 focus:ring-offset-2 hover:scale-105 transition-transform">
                    <Avatar src={user?.avatar?.url} name={user?.name} size="sm" />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 top-11 w-56 bg-white border border-slate-100 rounded-2xl shadow-medium overflow-hidden animate-scale-in z-50">
                      <div className="px-4 py-3 bg-gradient-to-br from-civic-50 to-emerald-50 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">@{user?.username}</p>
                        <p className="text-xs text-civic-600 font-semibold mt-1">⚡ {score} impact pts</p>
                      </div>
                      
                      {/* ... Menu Links ... */}
                      <Link href={`/profile/${user?.username}`} onClick={()=>setShowMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <User className="h-4 w-4 text-slate-400" /> Profile
                      </Link>
                      <Link href="/settings" onClick={()=>setShowMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <Settings className="h-4 w-4 text-slate-400" /> Settings
                      </Link>

                      {user?.role === "admin" && (
                        <Link href="/admin" onClick={()=>setShowMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50 transition-colors">
                          <Settings className="h-4 w-4" /> Admin Panel
                        </Link>
                      )}

                      <div className="border-t border-slate-100" />
                      
                      {/* ✅ Updated logout button */}
                      <button onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full">
                        <LogOut className="h-4 w-4" /> Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-civic-600 px-3 py-1.5 transition-colors">Log in</Link>
                <Link href="/register" className="text-sm font-semibold bg-civic-600 text-white px-4 py-1.5 rounded-xl hover:bg-civic-700 transition-colors shadow-green">Sign up</Link>
              </div>
            )}
          </div>
        </div>
        {/* ... Mobile Search ... */}
      </nav>

      {showCreate && <CreatePostModal onClose={()=>setShowCreate(false)} />}
    </>
  );
}

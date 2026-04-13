"use client";
import { useEffect, useState, useCallback } from "react";
import { groupService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import { Users, ArrowLeft, Loader2, Search } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

export default function ExploreGroupsPage() {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch user's groups to check membership
  useEffect(() => {
    const fetchMyGroups = async () => {
      try {
        const { data } = await groupService.getUserGroups();
        if (data.success) setMyGroups(data.groups);
      } catch (err) {
        console.error("Failed to load user groups:", err);
      }
    };
    if (user) fetchMyGroups();
  }, [user]);

  // Function to fetch groups based on search query
  const fetchGroups = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const { data } = await groupService.getDiscoverGroups(query);
      if (data.success) setGroups(data.groups);
    } catch (err) {
      console.error("Failed to load hubs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce effect: waits for user to stop typing for 400ms before hitting API
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchGroups(searchTerm);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchGroups]);

  const handleJoin = async (e: React.MouseEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await groupService.joinGroup(groupId);
      alert("Request sent! Awaiting admin approval.");
      // Refresh groups
      fetchGroups(searchTerm);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to join group");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
      {/* Back Button */}
      <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-civic-600 mb-8 text-sm font-bold transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>
      
      {/* Header & Search Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-slate-800 mb-3 tracking-tight">Explore Hubs</h1>
        <p className="text-slate-500 mb-8 font-medium">Find and join communities in Lucknow and beyond.</p>
        
        {/* BIG SEARCH BAR */}
        <div className="relative max-w-xl mx-auto group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-civic-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search by name or handle (e.g. 'lko')..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-civic-500 focus:border-transparent outline-none transition-all text-slate-700 font-medium"
          />
        </div>
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-civic-500" />
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Searching Hubs...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
           <Users className="h-16 w-16 text-slate-100 mx-auto mb-4" />
           <p className="text-slate-500 font-bold text-lg">No hubs found for "{searchTerm}"</p>
           <p className="text-slate-400 text-sm">Try searching for something else or create your own!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {groups.map(g => {
            const isMember = myGroups.some(mg => mg.id === g.id);
            return (
              <div key={g.id || g._id} className="bg-white p-6 rounded-[32px] border border-slate-100 hover:border-civic-200 hover:shadow-xl hover:shadow-civic-500/5 transition-all flex justify-between items-center group">
                <Link href={`/groups/${g.slug}`} className="flex items-center gap-4 flex-1">
                  <Avatar src={g.avatar_url} name={g.name} size="md" />
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-civic-600 transition-colors text-lg">{g.name}</h3>
                    <p className="text-xs text-slate-400 font-medium">@{g.slug}</p>
                    <p className="text-[10px] text-civic-500 font-bold mt-1 uppercase tracking-wider">{g.members_count || 0} Members</p>
                  </div>
                </Link>
                {isMember ? (
                  <Link href={`/groups/${g.slug}`}>
                    <div className="px-4 py-2 bg-slate-50 text-slate-400 text-[10px] font-black rounded-xl group-hover:bg-civic-600 group-hover:text-white transition-all uppercase tracking-widest cursor-pointer">
                      View
                    </div>
                  </Link>
                ) : (
                  <button onClick={(e) => handleJoin(e, g.id)} className="px-4 py-2 bg-civic-600 text-white text-[10px] font-black rounded-xl hover:bg-civic-700 transition-all uppercase tracking-widest whitespace-nowrap">
                    Req. to Join
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
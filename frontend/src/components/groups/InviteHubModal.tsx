"use client";
import { useState, useEffect } from "react";
import { Search, ShieldCheck, X, Loader2, Send } from "lucide-react";
import { groupService } from "@/services/index";
import Avatar from "@/components/ui/Avatar";

interface InviteHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
}

export default function InviteHubModal({ isOpen, onClose, communityId }: InviteHubModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitedHubs, setInvitedHubs] = useState<string[]>([]); // Keep track of sent invites

  // Automatically search when the user types
  useEffect(() => {
    if (!isOpen) return;

    const fetchHubs = async () => {
      setLoading(true);
      try {
        // 🔥 STRICTLY SEARCH ONLY OFFICIAL HUBS
        const { data } = await groupService.getDiscoverGroups(searchQuery, "official");
        if (data.success) {
          setSearchResults(data.groups);
        }
      } catch (err) {
        console.error("Failed to search hubs", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchHubs, 300); // Debounce typing
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  const handleInvite = async (hubId: string) => {
    try {
      const { data } = await groupService.inviteHubToCommunity(communityId, hubId);
      if (data.success) {
        setInvitedHubs(prev => [...prev, hubId]); // Change button to "Sent!"
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to send invitation.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-purple-800 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-500" /> Invite Official Hubs
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Add verified groups to your community network.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search for an Official Hub by name or @slug..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-4 flex-1 bg-slate-50/50">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map(hub => {
                const isSent = invitedHubs.includes(hub.id);
                return (
                  <div key={hub.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Avatar src={hub.avatar_url} name={hub.name} size="sm" />
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                          {hub.name} <ShieldCheck className="w-3 h-3 text-blue-500" />
                        </h4>
                        <p className="text-xs text-slate-400">@{hub.slug}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleInvite(hub.id)}
                      disabled={isSent}
                      className={`flex items-center gap-1 px-4 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider ${
                        isSent 
                          ? "bg-emerald-100 text-emerald-600 cursor-not-allowed" 
                          : "bg-purple-600 text-white hover:bg-purple-700 active:scale-95 shadow-md"
                      }`}
                    >
                      {isSent ? "Invite Sent ✓" : <><Send className="w-3 h-3" /> Invite</>}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-bold">No Official Hubs found.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
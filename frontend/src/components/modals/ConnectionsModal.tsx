"use client";
import { X, Users, UserMinus, UserX, Loader2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useState, useEffect } from "react";
import { userService } from "@/services/index";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

interface User {
  id: string;
  name: string;
  username: string;
  avatar?: { url: string };
}

interface ConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string; 
}

export default function ConnectionsModal({ isOpen, onClose, userId }: ConnectionsModalProps) {
  const router = useRouter();
  const { user: me } = useAuthStore(); 
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [localFollowers, setLocalFollowers] = useState<User[]>([]);
  const [localFollowing, setLocalFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const isMyProfile = String(me?.id || me?._id) === String(userId);

  useEffect(() => {
    if (!isOpen || !userId) return;
    
    const fetchConnections = async () => {
      setLoading(true);
      try {
        const [fRes, lRes] = await Promise.all([
          userService.getFollowers(userId),
          userService.getFollowing(userId)
        ]);

        // Helper to turn raw data into clean User objects
        const cleanList = (data: any, key: string) => {
          // Look for the key (followers/following) or check if the data itself is the array
          const rawArray = data[key] || (Array.isArray(data) ? data : []);
          return rawArray.map((u: any) => ({
            id: u.id || u._id,
            name: u.name || u.username || "Anonymous",
            username: u.username || "user",
            avatar: u.avatar
          }));
        };

        setLocalFollowers(cleanList(fRes.data, 'followers'));
        setLocalFollowing(cleanList(lRes.data, 'following'));
      } catch (error) {
        console.error("Failed to fetch connections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [isOpen, userId]);

  const handleUnfollow = async (id: string, name: string) => {
    if (!window.confirm(`Unfollow ${name}?`)) return;
    try {
      await userService.unfollowUser(id);
      setLocalFollowing(prev => prev.filter(u => u.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleRemoveFollower = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from followers?`)) return;
    try {
      await userService.removeFollower(id);
      setLocalFollowers(prev => prev.filter(u => u.id !== id));
    } catch (err) { console.error(err); }
  };

  if (!isOpen) return null;
  const list = activeTab === 'followers' ? localFollowers : localFollowing;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in duration-200">
        
        {/* Tabs */}
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
          <div className="flex gap-6">
            <button onClick={() => setActiveTab('followers')} className={`relative pb-1 text-sm font-bold transition-all ${activeTab === 'followers' ? 'text-civic-600' : 'text-slate-400'}`}>
              Followers ({localFollowers.length})
              {activeTab === 'followers' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-civic-600 rounded-full" />}
            </button>
            <button onClick={() => setActiveTab('following')} className={`relative pb-1 text-sm font-bold transition-all ${activeTab === 'following' ? 'text-civic-600' : 'text-slate-400'}`}>
              Following ({localFollowing.length})
              {activeTab === 'following' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-civic-600 rounded-full" />}
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X className="h-5 w-5 text-slate-500" /></button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[300px]">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-civic-500" /></div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center opacity-30 flex flex-col items-center">
              <Users className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">No {activeTab} yet.</p>
            </div>
          ) : (
            list.map((u) => {
              const isMe = u.id && String(u.id) === String(me?.id || me?._id);
              return (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 group transition-all">
                  <div onClick={() => { onClose(); router.push(`/profile/${u.username}`); }} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <Avatar src={u.avatar?.url} name={u.name} size="md" />
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm leading-tight">
                        {u.name} 
                        {isMe && <span className="text-[10px] text-civic-600 font-black ml-1">(You)</span>}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">@{u.username}</span>
                    </div>
                  </div>

                  {isMyProfile && !isMe && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                       {activeTab === 'following' ? (
                         <button onClick={() => handleUnfollow(u.id, u.name)} className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><UserMinus className="h-4 w-4" /></button>
                       ) : (
                         <button onClick={() => handleRemoveFollower(u.id, u.name)} className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><UserX className="h-4 w-4" /></button>
                       )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
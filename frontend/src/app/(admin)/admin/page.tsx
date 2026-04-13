"use client";
import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import { Users, FileText, Calendar, TrendingUp, Trash2, RefreshCw, AlertTriangle, CheckCircle2, List } from "lucide-react";
import toast from "react-hot-toast";

interface Stats {
  total_users: number;
  active_users: number;
  total_posts: number;
  total_events: number;
}

interface Group {
  _id: string;
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_official?: boolean;
  is_community?: boolean;
  member_count?: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupOpLoading, setGroupOpLoading] = useState(false);
  const [groupResult, setGroupResult] = useState<any>(null);
  const [showGroupList, setShowGroupList] = useState(false);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await adminService.getStats();
      setStats(data.stats);
    } catch (err) {
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const loadAllGroups = async () => {
    setLoadingGroups(true);
    // Use admin token for admin operations
    const token = localStorage.getItem('ci_admin_token');
    
    if (!token) {
      toast.error("Admin not authenticated. Please login.");
      setLoadingGroups(false);
      return;
    }
    
    try {
      // Use admin endpoint to get all groups
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/admin/groups?limit=200`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load groups: ${response.status}`);
      }
      
      const data = await response.json();
      const allGroupsList = data.groups || [];
      
      setAllGroups(allGroupsList);
      setShowGroupList(true);
      
      if (allGroupsList.length === 0) {
        toast.success("No groups found - all clean!");
      } else {
        toast.success(`Loaded ${allGroupsList.length} groups`);
      }
    } catch (err: any) {
      console.error("Error loading groups:", err);
      toast.error(err.message || "Failed to load groups");
    } finally {
      setLoadingGroups(false);
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    const newSelection = new Set(selectedGroups);
    if (newSelection.has(groupId)) {
      newSelection.delete(groupId);
    } else {
      newSelection.add(groupId);
    }
    setSelectedGroups(newSelection);
  };

  const selectAllGroups = () => {
    if (selectedGroups.size === allGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(allGroups.map(g => g._id || g.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedGroups.size === 0) {
      toast.error("No groups selected");
      return;
    }

    if (!confirm(`⚠️ WARNING: This will DELETE ${selectedGroups.size} selected groups! This cannot be undone. Are you sure?`)) return;
    
    // Use admin token for admin operations
    const token = localStorage.getItem('ci_admin_token');
    if (!token) {
      toast.error("Admin not authenticated. Please login.");
      return;
    }
    
    setGroupOpLoading(true);
    
    try {
      // Use admin bulk delete endpoint (no ownership check)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/admin/groups/bulk-delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          group_ids: Array.from(selectedGroups)
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setGroupResult(data);
      
      if (data.deleted_count > 0) {
        toast.success(`Deleted ${data.deleted_count} groups!`);
      } else if (data.skipped_groups && data.skipped_groups.length > 0) {
        toast.error(`Some groups could not be deleted`);
      } else {
        toast.error("No groups deleted");
      }
      
      // Refresh the group list
      setSelectedGroups(new Set());
      await loadAllGroups();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete groups");
    } finally {
      setGroupOpLoading(false);
    }
  };

  const handleCleanupInvalid = async () => {
    if (!confirm("This will remove groups with missing data (no slug/creator). Continue?")) return;
    
    // Use admin token for admin operations
    const token = localStorage.getItem('ci_admin_token');
    if (!token) {
      toast.error("Admin not authenticated. Please login.");
      return;
    }
    
    setGroupOpLoading(true);
    setGroupResult(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/groups/cleanup-invalid-groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setGroupResult(data);
      toast.success(`Cleaned up ${data.deleted_count} invalid groups!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to cleanup groups");
    } finally {
      setGroupOpLoading(false);
    }
  };

  const handleBulkDeleteMyGroups = async () => {
    if (!confirm("⚠️ WARNING: This will DELETE ALL groups you created! This cannot be undone. Are you sure?")) return;
    
    // Use admin token for admin operations
    const token = localStorage.getItem('ci_admin_token');
    if (!token) {
      toast.error("Admin not authenticated. Please login.");
      return;
    }
    
    setGroupOpLoading(true);
    setGroupResult(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/groups/bulk-delete-my-groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setGroupResult(data);
      toast.success(`Deleted ${data.deleted_count} groups!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete groups");
    } finally {
      setGroupOpLoading(false);
    }
  };

  const handleRecalculatePoints = async () => {
    if (!confirm("This will recalculate points for all groups and communities. Continue?")) return;
    
    // Use admin token for admin operations
    const token = localStorage.getItem('ci_admin_token');
    if (!token) {
      toast.error("Admin not authenticated. Please login.");
      return;
    }
    
    setGroupOpLoading(true);
    setGroupResult(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/groups/recalculate-all-points`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setGroupResult(data);
      toast.success(`Recalculated points for ${data.groups_updated} groups!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to recalculate points");
    } finally {
      setGroupOpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    {
      title: "Total Users",
      value: stats?.total_users || 0,
      subtitle: `${stats?.active_users || 0} active`,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Total Posts",
      value: stats?.total_posts || 0,
      subtitle: "All time",
      icon: FileText,
      color: "bg-green-500",
    },
    {
      title: "Total Events",
      value: stats?.total_events || 0,
      subtitle: "All time",
      icon: Calendar,
      color: "bg-purple-500",
    },
    {
      title: "Active Users",
      value: stats?.active_users || 0,
      subtitle: `${Math.round(((stats?.active_users || 0) / (stats?.total_users || 1)) * 100)}% of total`,
      icon: TrendingUp,
      color: "bg-amber-500",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-slate-600 mb-1">{card.title}</h3>
              <p className="text-3xl font-bold text-slate-900 mb-1">{card.value.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/users"
            className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <Users className="h-6 w-6 text-slate-600 mb-2" />
            <h3 className="font-semibold text-slate-900">Manage Users</h3>
            <p className="text-sm text-slate-600 mt-1">View and moderate user accounts</p>
          </a>
          <a
            href="/admin/posts"
            className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <FileText className="h-6 w-6 text-slate-600 mb-2" />
            <h3 className="font-semibold text-slate-900">Manage Posts</h3>
            <p className="text-sm text-slate-600 mt-1">Review and moderate content</p>
          </a>
          <a
            href="/admin/events"
            className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <Calendar className="h-6 w-6 text-slate-600 mb-2" />
            <h3 className="font-semibold text-slate-900">Manage Events</h3>
            <p className="text-sm text-slate-600 mt-1">Oversee community events</p>
          </a>
        </div>
      </div>

      {/* Groups Management Section */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Groups Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Cleanup Invalid Groups */}
          <button
            onClick={handleCleanupInvalid}
            disabled={groupOpLoading}
            className="p-4 border border-blue-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <RefreshCw className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-semibold text-slate-900">Cleanup Invalid</h3>
            <p className="text-sm text-slate-600 mt-1">Remove corrupted groups</p>
          </button>

          {/* Recalculate Points */}
          <button
            onClick={handleRecalculatePoints}
            disabled={groupOpLoading}
            className="p-4 border border-amber-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <RefreshCw className="h-6 w-6 text-amber-600 mb-2" />
            <h3 className="font-semibold text-slate-900">Recalculate Points</h3>
            <p className="text-sm text-slate-600 mt-1">Fix points aggregation</p>
          </button>

          {/* Delete All My Groups */}
          <button
            onClick={handleBulkDeleteMyGroups}
            disabled={groupOpLoading}
            className="p-4 border border-red-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <Trash2 className="h-6 w-6 text-red-600 mb-2" />
            <h3 className="font-semibold text-slate-900">Delete All My Groups</h3>
            <p className="text-sm text-slate-600 mt-1">⚠️ Permanently delete all</p>
          </button>
        </div>

        {/* Results Display */}
        {groupResult && (
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-slate-900">{groupResult.message}</p>
            </div>
            
            {groupResult.skipped_groups && groupResult.skipped_groups.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  ⚠️ {groupResult.skipped_groups.length} groups skipped (you are not the creator)
                </p>
                <details>
                  <summary className="text-xs text-amber-700 cursor-pointer">View skipped groups</summary>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {groupResult.skipped_groups.map((group: any, idx: number) => (
                      <div key={idx} className="text-xs bg-white p-2 rounded border border-amber-200">
                        <span className="font-semibold">{group.name}</span> - {group.reason}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
            
            {groupResult.deleted_groups && groupResult.deleted_groups.length > 0 && (
              <details className="mt-3">
                <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
                  View {groupResult.deleted_groups.length} deleted groups
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {groupResult.deleted_groups.map((group: any, idx: number) => (
                    <div key={idx} className="text-xs bg-white p-2 rounded border border-slate-200">
                      <span className="font-semibold">{group.name}</span> (@{group.slug})
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Selective Group Deletion */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Selective Group Deletion</h2>
          <button
            onClick={loadAllGroups}
            disabled={loadingGroups}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-all"
          >
            <List className="h-4 w-4" />
            {loadingGroups ? "Loading..." : showGroupList ? "Refresh List" : "Load All Groups"}
          </button>
        </div>

        {showGroupList && (
          <>
            <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedGroups.size === allGroups.length && allGroups.length > 0}
                  onChange={selectAllGroups}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-700">
                  {selectedGroups.size} of {allGroups.length} selected
                </span>
              </div>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedGroups.size === 0 || groupOpLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-all"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedGroups.size})
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {allGroups.map((group) => {
                const groupId = group._id || group.id;
                const isSelected = selectedGroups.has(groupId);
                const groupType = group.is_community ? "Community" : group.is_official ? "Official" : "Citizen Hub";
                
                return (
                  <div
                    key={groupId}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
                      isSelected ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleGroupSelection(groupId)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{group.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          group.is_community ? 'bg-purple-100 text-purple-700' :
                          group.is_official ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {groupType}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">@{group.slug}</p>
                      {group.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{group.description}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {group.member_count || 0} members
                    </div>
                  </div>
                );
              })}
            </div>

            {allGroups.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No groups found
              </div>
            )}
          </>
        )}

        {!showGroupList && (
          <div className="text-center py-8 text-slate-500">
            Click "Load All Groups" to see all groups and select which ones to delete
          </div>
        )}
      </div>
    </div>
  );
}

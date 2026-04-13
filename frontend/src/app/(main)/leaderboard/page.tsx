"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Trophy, Search, MapPin, ChevronDown, Loader2, TrendingUp, Award, ShieldCheck, Users, Swords, X } from "lucide-react";
import { userService, groupService } from "@/services/index";
import Avatar from "@/components/ui/Avatar";
import { catColor, impactTier, fmtNum, cn } from "@/lib/utils";

// View filter options
const VIEW_OPTIONS = ["Individual Users", "Group", "Official Group", "Community"];

// Indian states for the state filter (based on screenshot showing Uttar Pradesh)
const STATES = [
  "All States",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

// Sample cities by state (for dependent dropdown)
const CITIES_BY_STATE: Record<string, string[]> = {
  "All States": ["All Cities"],
  "Uttar Pradesh": ["All Cities", "Lucknow", "Prayagraj", "Varanasi", "Kanpur", "Ghaziabad", "Noida", "Agra", "Meerut"],
  "Maharashtra": ["All Cities", "Mumbai", "Pune", "Nagpur", "Thane", "Nashik"],
  "Karnataka": ["All Cities", "Bangalore", "Mysore", "Hubli", "Mangalore"],
  "Tamil Nadu": ["All Cities", "Chennai", "Coimbatore", "Madurai", "Salem"],
  "Kerala": ["All Cities", "Thiruvananthapuram", "Kochi", "Kozhikode"],
  "Delhi": ["All Cities", "New Delhi"],
  "Rajasthan": ["All Cities", "Jaipur", "Jodhpur", "Udaipur", "Kota"],
  "Gujarat": ["All Cities", "Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  "West Bengal": ["All Cities", "Kolkata", "Howrah", "Durgapur"]
};

// Default cities for states not in the list
const DEFAULT_CITIES = ["All Cities"];

interface LeaderboardUser {
  id: string;
  name: string;
  username: string;
  avatar?: { url?: string };
  impact_score: number;
  city?: string;
  state?: string;
  role?: string;
  category?: string;
}

interface LeaderboardGroup {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string;
  total_points: number;
  members_count: number;
  is_official: boolean;
  is_community: boolean;
  rank?: number;
}

interface GroupMember {
  id: string;
  name: string;
  username?: string;
  avatar?: { url?: string };
  points_since_joining: number;
}

interface AffiliatedHub {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string;
  total_points: number;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [groups, setGroups] = useState<LeaderboardGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const limit = 10;

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [viewFilter, setViewFilter] = useState("Individual Users");
  const [stateFilter, setStateFilter] = useState("All States");
  const [cityFilter, setCityFilter] = useState("All Cities");

  // Group members modal state (for all group types)
  const [selectedGroup, setSelectedGroup] = useState<LeaderboardGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [affiliatedHubs, setAffiliatedHubs] = useState<AffiliatedHub[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // VS Comparison Mode
  const [vsMode, setVsMode] = useState(false);
  const [leftSelection, setLeftSelection] = useState<LeaderboardGroup | null>(null);
  const [rightSelection, setRightSelection] = useState<LeaderboardGroup | null>(null);
  const [leftMembers, setLeftMembers] = useState<GroupMember[]>([]);
  const [rightMembers, setRightMembers] = useState<GroupMember[]>([]);
  const [leftHubs, setLeftHubs] = useState<AffiliatedHub[]>([]);
  const [rightHubs, setRightHubs] = useState<AffiliatedHub[]>([]);
  const [loadingLeft, setLoadingLeft] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);

  // Check if we're in group mode
  const isGroupMode = viewFilter !== "Individual Users";

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Dropdown open states
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setSkip(0); // Reset pagination when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset city when state changes
  useEffect(() => {
    setCityFilter("All Cities");
  }, [stateFilter]);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      if (isGroupMode) {
        // Fetch groups leaderboard
        const groupType = viewFilter === "Group" ? "group" : 
                         viewFilter === "Official Group" ? "official" : "community";
        
        const params: any = { 
          groupType, 
          limit, 
          skip,
          search: debouncedSearch.length >= 2 ? debouncedSearch : ""
        };

        // Add state/city filters for groups (filters by creator's location)
        if (stateFilter !== "All States") {
          params.state = stateFilter;
        }
        if (cityFilter !== "All Cities") {
          params.city = cityFilter;
        }

        const { data } = await groupService.getGroupLeaderboard(params);
        setGroups(data.groups ?? []);
        setTotal(data.total ?? 0);
        setUsers([]); // Clear users
      } else {
        // Fetch users leaderboard
        const params: any = { limit, skip };
        
        if (debouncedSearch.length >= 2) {
          params.search = debouncedSearch;
        }
        if (stateFilter !== "All States") {
          params.state = stateFilter;
        }
        if (cityFilter !== "All Cities") {
          params.city = cityFilter;
        }

        const { data } = await userService.getLeaderboard(params);
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
        setGroups([]); // Clear groups
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, stateFilter, cityFilter, viewFilter, skip, limit, isGroupMode]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Fetch members for a group (for modal) - applies to all group types
  const handleGroupClick = async (group: LeaderboardGroup, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation for all group types
    setSelectedGroup(group);
    setLoadingMembers(true);
    setGroupMembers([]);
    setAffiliatedHubs([]);
    
    try {
      if (group.is_community) {
        // For Communities: fetch group details to get affiliated hubs
        const { data } = await groupService.getGroupBySlug(group.slug);
        const hubs = data.group?.affiliated_hubs_data || [];
        // Sort hubs by total_points in descending order
        const sortedHubs = hubs.sort(
          (a: AffiliatedHub, b: AffiliatedHub) => (b.total_points || 0) - (a.total_points || 0)
        );
        setAffiliatedHubs(sortedHubs);
      } else {
        // For Normal Groups and Official Groups: fetch members
        const { data } = await groupService.getMembers(group.id);
        // Sort members by points_since_joining in descending order
        const sortedMembers = (data.members || []).sort(
          (a: GroupMember, b: GroupMember) => (b.points_since_joining || 0) - (a.points_since_joining || 0)
        );
        setGroupMembers(sortedMembers);
      }
    } catch (error) {
      console.error("Failed to fetch group data:", error);
      setGroupMembers([]);
      setAffiliatedHubs([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Close group members modal
  const closeGroupModal = () => {
    setSelectedGroup(null);
    setGroupMembers([]);
    setAffiliatedHubs([]);
  };

  // VS Mode: Select group for left or right side
  const handleVsSelect = async (group: LeaderboardGroup, side: 'left' | 'right') => {
    // Prevent selecting the same group on both sides
    if (side === 'left' && rightSelection?.id === group.id) return;
    if (side === 'right' && leftSelection?.id === group.id) return;

    if (side === 'left') {
      setLeftSelection(group);
      setLoadingLeft(true);
      setLeftMembers([]);
      setLeftHubs([]);
    } else {
      setRightSelection(group);
      setLoadingRight(true);
      setRightMembers([]);
      setRightHubs([]);
    }

    try {
      if (group.is_community) {
        const { data } = await groupService.getGroupBySlug(group.slug);
        const hubs = data.group?.affiliated_hubs_data || [];
        const sortedHubs = hubs.sort(
          (a: AffiliatedHub, b: AffiliatedHub) => (b.total_points || 0) - (a.total_points || 0)
        );
        if (side === 'left') setLeftHubs(sortedHubs);
        else setRightHubs(sortedHubs);
      } else {
        const { data } = await groupService.getMembers(group.id);
        const sortedMembers = (data.members || []).sort(
          (a: GroupMember, b: GroupMember) => (b.points_since_joining || 0) - (a.points_since_joining || 0)
        );
        if (side === 'left') setLeftMembers(sortedMembers);
        else setRightMembers(sortedMembers);
      }
    } catch (error) {
      console.error("Failed to fetch group data:", error);
    } finally {
      if (side === 'left') setLoadingLeft(false);
      else setLoadingRight(false);
    }
  };

  // Close VS mode
  const closeVsMode = () => {
    setVsMode(false);
    setLeftSelection(null);
    setRightSelection(null);
    setLeftMembers([]);
    setRightMembers([]);
    setLeftHubs([]);
    setRightHubs([]);
  };

  // Get available cities based on selected state
  const availableCities = CITIES_BY_STATE[stateFilter] || DEFAULT_CITIES;

  // Rank calculation with proper suffix
  const getRankSuffix = (rank: number) => {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`;
  };

  // Check if user is authority
  const isAuthority = (user: LeaderboardUser) => {
    return user.role === "authority" || user.category === "Authority";
  };

  // Custom names for top 10 normal users (non-authority)
  const CUSTOM_NAMES = [
    "Sigma Sanaritan", "Giga -Chad Guardian", "Maximum Rizz-Ponsibility", "Final Boss Of Kindeness", "Mewing In Silence",
    "Default Skin", "Glazing the law", "Delulu  Demon", "Cooked Beyond Help", "The Yap Master"
  ];

  // Get custom name for a user based on their rank among normal users
  const getCustomName = (users: LeaderboardUser[], userIndex: number) => {
    const user = users[userIndex];
    if (isAuthority(user)) return null;
    
    // Count how many normal users are before this user
    let normalUserRank = 0;
    for (let i = 0; i <= userIndex; i++) {
      if (!isAuthority(users[i])) {
        normalUserRank++;
      }
    }
    
    // Return custom name if within top 10 normal users
    if (normalUserRank <= 10) {
      return CUSTOM_NAMES[normalUserRank - 1];
    }
    return null;
  };

  // Get state abbreviation (e.g., "Uttar Pradesh" -> "UP")
  const getStateAbbr = (state: string) => {
    if (!state) return "";
    const words = state.split(" ");
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return words.map(w => w[0]).join("").toUpperCase();
  };

  // Top 3 users for podium
  const top3 = users.slice(0, 3);
  const restUsers = users.slice(3);

  // Load more handler
  const handleLoadMore = () => {
    setSkip(prev => prev + limit);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-slate-50">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">LEADERBOARD</h1>
            <TrendingUp className="h-5 w-5 text-emerald-300" />
          </div>
          
          <Link 
            href="/" 
            className="px-4 py-2 bg-emerald-600/80 backdrop-blur text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 transition-all shadow-lg"
          >
            SOCIAL
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-300" />
            <input
              type="text"
              placeholder="Search leaders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-emerald-800/50 backdrop-blur border border-emerald-600/30 rounded-xl text-white placeholder-emerald-300/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            />
          </div>

          {/* View Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setViewDropdownOpen(!viewDropdownOpen);
                setStateDropdownOpen(false);
                setCityDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800/50 backdrop-blur border border-emerald-600/30 rounded-xl text-white hover:bg-emerald-700/50 transition-all"
            >
              <span className="text-sm">View: {viewFilter}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${viewDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {viewDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-48 bg-emerald-800 backdrop-blur-xl border border-emerald-600/30 rounded-xl shadow-2xl z-50 overflow-hidden">
                {VIEW_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setViewFilter(option);
                      setViewDropdownOpen(false);
                      setSkip(0);
                    }}
                    className={cn(
                      "w-full px-4 py-2.5 text-left text-sm transition-colors",
                      viewFilter === option
                        ? "bg-emerald-600 text-white"
                        : "text-emerald-100 hover:bg-emerald-700"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* State Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setStateDropdownOpen(!stateDropdownOpen);
                setViewDropdownOpen(false);
                setCityDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800/50 backdrop-blur border border-emerald-600/30 rounded-xl text-white hover:bg-emerald-700/50 transition-all"
            >
              <span className="text-sm">State: {stateFilter === "All States" ? "All" : stateFilter}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${stateDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {stateDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-56 max-h-64 overflow-y-auto bg-emerald-800 backdrop-blur-xl border border-emerald-600/30 rounded-xl shadow-2xl z-50">
                {STATES.map((state) => (
                  <button
                    key={state}
                    onClick={() => {
                      setStateFilter(state);
                      setStateDropdownOpen(false);
                      setSkip(0);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm transition-colors",
                      stateFilter === state
                        ? "bg-emerald-600 text-white"
                        : "text-emerald-100 hover:bg-emerald-700"
                    )}
                  >
                    {state}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* City Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setCityDropdownOpen(!cityDropdownOpen);
                setViewDropdownOpen(false);
                setStateDropdownOpen(false);
              }}
              disabled={stateFilter === "All States"}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 bg-emerald-800/50 backdrop-blur border border-emerald-600/30 rounded-xl text-white transition-all",
                stateFilter === "All States" ? "opacity-50 cursor-not-allowed" : "hover:bg-emerald-700/50"
              )}
            >
              <span className="text-sm">City: {cityFilter === "All Cities" ? "All" : cityFilter}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${cityDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {cityDropdownOpen && stateFilter !== "All States" && (
              <div className="absolute top-full mt-2 left-0 w-48 max-h-64 overflow-y-auto bg-emerald-800 backdrop-blur-xl border border-emerald-600/30 rounded-xl shadow-2xl z-50">
                {availableCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      setCityFilter(city);
                      setCityDropdownOpen(false);
                      setSkip(0);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm transition-colors",
                      cityFilter === city
                        ? "bg-emerald-600 text-white"
                        : "text-emerald-100 hover:bg-emerald-700"
                    )}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* VS Button - only show in group modes */}
          {isGroupMode && (
            <button
              onClick={() => setVsMode(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl text-white font-bold transition-all shadow-lg"
              title="Compare two groups"
            >
              <Swords className="h-4 w-4" />
              <span className="text-sm">VS</span>
            </button>
          )}
        </div>

        {/* Close dropdowns when clicking outside */}
        {(viewDropdownOpen || stateDropdownOpen || cityDropdownOpen) && (
          <div 
            className="fixed inset-0 z-40"
            onClick={() => {
              setViewDropdownOpen(false);
              setStateDropdownOpen(false);
              setCityDropdownOpen(false);
            }}
          />
        )}

        {/* Loading State */}
        {loading && users.length === 0 && groups.length === 0 && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-300" />
          </div>
        )}

        {/* Top 3 Podium - USERS */}
        {!loading && !isGroupMode && users.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2nd Place */}
            <div className="relative group">
              <div className="bg-gradient-to-b from-slate-100/90 to-slate-200/90 rounded-2xl p-4 text-center shadow-xl transform translate-y-4">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  2nd
                </div>
                <Avatar src={top3[1]?.avatar?.url} name={top3[1]?.name} size="lg" className="mx-auto mb-3" />
                <p className="font-bold text-slate-800 truncate">{top3[1]?.name}</p>
                <p className="text-xs text-slate-500 mb-2">@{top3[1]?.username}</p>
                {(top3[1]?.category || isAuthority(top3[1])) && (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full mb-2",
                    (top3[1]?.category === "Authority" || isAuthority(top3[1]))
                      ? "bg-amber-100 text-amber-700 border border-amber-300"
                      : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                  )}>
                    {top3[1]?.category === "Authority" || isAuthority(top3[1]) ? (
                      <><ShieldCheck className="h-3 w-3" /> Authority</>
                    ) : (
                      top3[1]?.category
                    )}
                  </span>
                )}
                <div className="flex items-center justify-center gap-1 text-xs text-slate-600 mb-2">
                  <Trophy className="h-3 w-3" />
                  <span>{getCustomName(users, 1) || (top3[1]?.city || "Unknown")}</span>
                </div>
                {isAuthority(top3[1]) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                    <ShieldCheck className="h-3 w-3" />
                    Authority
                  </span>
                )}
                <p className="text-lg font-bold text-slate-700 mt-2">{fmtNum(Math.round(top3[1]?.impact_score || 0))} pts</p>
              </div>
            </div>

            {/* 1st Place */}
            <div className="relative group z-10">
              <div className="bg-gradient-to-b from-emerald-400/90 to-emerald-600/90 rounded-2xl p-5 text-center shadow-2xl transform scale-105">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Award className="h-8 w-8 text-amber-400" />
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                  1st
                </div>
                <Avatar src={top3[0]?.avatar?.url} name={top3[0]?.name} size="xl" className="mx-auto mb-3 mt-4" />
                <p className="font-bold text-white truncate text-lg">{top3[0]?.name}</p>
                <p className="text-xs text-emerald-100 mb-2">@{top3[0]?.username}</p>
                <div className="flex items-center justify-center gap-1 text-xs text-emerald-100 mb-2">
                  <Trophy className="h-3 w-3" />
                  <span>{getCustomName(users, 0) || (top3[0]?.city || "Unknown")}</span>
                </div>
                {isAuthority(top3[0]) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full">
                    <ShieldCheck className="h-3 w-3" />
                    Authority
                  </span>
                )}
                <p className="text-xl font-bold text-white mt-2">{fmtNum(Math.round(top3[0]?.impact_score || 0))} pts</p>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="relative group">
              <div className="bg-gradient-to-b from-orange-100/90 to-orange-200/90 rounded-2xl p-4 text-center shadow-xl transform translate-y-6">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  3rd
                </div>
                <Avatar src={top3[2]?.avatar?.url} name={top3[2]?.name} size="lg" className="mx-auto mb-3" />
                <p className="font-bold text-slate-800 truncate">{top3[2]?.name}</p>
                <p className="text-xs text-slate-500 mb-2">@{top3[2]?.username}</p>
                <div className="flex items-center justify-center gap-1 text-xs text-slate-600 mb-2">
                  <Trophy className="h-3 w-3" />
                  <span>{getCustomName(users, 2) || (top3[2]?.city || "Unknown")}</span>
                </div>
                {isAuthority(top3[2]) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                    <ShieldCheck className="h-3 w-3" />
                    Authority
                  </span>
                )}
                <p className="text-lg font-bold text-slate-700 mt-2">{fmtNum(Math.round(top3[2]?.impact_score || 0))} pts</p>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium - GROUPS */}
        {!loading && isGroupMode && groups.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2nd Place */}
            <div className="relative group">
              <div className="bg-gradient-to-b from-slate-100/90 to-slate-200/90 rounded-2xl p-4 text-center shadow-xl transform translate-y-4">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  2nd
                </div>
                <Avatar src={groups[1]?.avatar_url} name={groups[1]?.name} size="lg" className="mx-auto mb-3" />
                <p className="font-bold text-slate-800 truncate">{groups[1]?.name}</p>
                <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-2">
                  <Users className="h-3 w-3" />
                  <span>{groups[1]?.members_count || 0} members</span>
                </div>
                <p className="text-lg font-bold text-slate-700 mt-2">{fmtNum(Math.round(groups[1]?.total_points || 0))} pts</p>
              </div>
            </div>

            {/* 1st Place */}
            <div className="relative group z-10">
              <div className="bg-gradient-to-b from-emerald-400/90 to-emerald-600/90 rounded-2xl p-5 text-center shadow-2xl transform scale-105">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Award className="h-8 w-8 text-amber-400" />
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full mt-1">
                  1st
                </div>
                <Avatar src={groups[0]?.avatar_url} name={groups[0]?.name} size="xl" className="mx-auto mb-3 mt-4" />
                <p className="font-bold text-white truncate text-lg">{groups[0]?.name}</p>
                <div className="flex items-center justify-center gap-1 text-xs text-emerald-100 mb-2">
                  <Users className="h-3 w-3" />
                  <span>{groups[0]?.members_count || 0} members</span>
                </div>
                <p className="text-xl font-bold text-white mt-2">{fmtNum(Math.round(groups[0]?.total_points || 0))} pts</p>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="relative group">
              <div className="bg-gradient-to-b from-orange-100/90 to-orange-200/90 rounded-2xl p-4 text-center shadow-xl transform translate-y-6">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  3rd
                </div>
                <Avatar src={groups[2]?.avatar_url} name={groups[2]?.name} size="lg" className="mx-auto mb-3" />
                <p className="font-bold text-slate-800 truncate">{groups[2]?.name}</p>
                <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-2">
                  <Users className="h-3 w-3" />
                  <span>{groups[2]?.members_count || 0} members</span>
                </div>
                <p className="text-lg font-bold text-slate-700 mt-2">{fmtNum(Math.round(groups[2]?.total_points || 0))} pts</p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-emerald-800/30 backdrop-blur rounded-2xl border border-emerald-600/20 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-emerald-900/50 text-emerald-200 text-sm font-semibold">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">{isGroupMode ? "Group" : "User"}</div>
            <div className="col-span-3">{isGroupMode ? "Members" : "Title"}</div>
            <div className="col-span-3 text-right">{isGroupMode ? "Total Points" : "Impact Score (Pts)"}</div>
          </div>

          {/* Table Body - USERS */}
          {!isGroupMode && (
            <div className="divide-y divide-emerald-600/10">
              {users.length === 0 && !loading && (
                <div className="px-6 py-12 text-center text-emerald-300">
                  <p className="text-lg mb-2">😕</p>
                  <p>No users found matching your filters.</p>
                </div>
              )}

              {users.map((user, index) => {
                const rank = index + 1;
                const tier = impactTier(user.impact_score || 0);
                const auth = isAuthority(user);

                return (
                  <Link
                    key={user.id}
                    href={`/profile/${user.username}`}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-emerald-700/30 transition-colors group"
                  >
                    {/* Rank */}
                    <div className="col-span-1">
                      <span className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                        rank === 1 ? "bg-amber-400 text-white" :
                        rank === 2 ? "bg-slate-400 text-white" :
                        rank === 3 ? "bg-orange-400 text-white" :
                        "text-emerald-300"
                      )}>
                        {rank}
                      </span>
                    </div>

                    {/* User */}
                    <div className="col-span-5 flex items-center gap-3">
                      <Avatar src={user.avatar?.url} name={user.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
                            {user.name}
                          </p>
                          {/* Category Badge - always show if available */}
                          {user.category && (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold",
                              user.category === "Authority" || user.role === "authority"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                                : cn("bg-emerald-500/20 text-emerald-300 border border-emerald-500/30")
                            )}>
                              {user.category}
                            </span>
                          )}
                          {!user.category && (user.role === "authority" || auth) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Authority
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-emerald-400">@{user.username}</p>
                        <p className="text-[10px] text-emerald-500/70 sm:hidden">{getCustomName(users, index) || (user.city || "Unknown")}</p>
                      </div>
                    </div>

                    {/* Title/Custom Name */}
                    <div className="col-span-3 hidden sm:flex items-center gap-1.5 text-emerald-200">
                      <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                      {getCustomName(users, index) ? (
                        <span className="text-sm font-medium text-amber-300">
                          {getCustomName(users, index)}
                        </span>
                      ) : user.city ? (
                        <span className="text-sm">
                          {user.city}{user.state ? `, ${getStateAbbr(user.state)}` : ""}
                        </span>
                      ) : (
                        <span className="text-sm text-emerald-500/50">-</span>
                      )}
                    </div>

                    {/* Impact Score */}
                    <div className="col-span-3 text-right">
                      <p className={cn("font-bold text-lg", tier.color)}>
                        {fmtNum(Math.round(user.impact_score || 0))} pts
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Table Body - GROUPS */}
          {isGroupMode && (
            <div className="divide-y divide-emerald-600/10">
              {groups.length === 0 && !loading && (
                <div className="px-6 py-12 text-center text-emerald-300">
                  <p className="text-lg mb-2">😕</p>
                  <p>No groups found matching your filters.</p>
                </div>
              )}

              {groups.map((group, index) => {
                const rank = index + 1;

                return (
                  <Link
                    key={group.id}
                    href="#"
                    onClick={(e) => handleGroupClick(group, e)}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-emerald-700/30 transition-colors group cursor-pointer"
                  >
                    {/* Rank */}
                    <div className="col-span-1">
                      <span className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                        rank === 1 ? "bg-amber-400 text-white" :
                        rank === 2 ? "bg-slate-400 text-white" :
                        rank === 3 ? "bg-orange-400 text-white" :
                        "text-emerald-300"
                      )}>
                        {rank}
                      </span>
                    </div>

                    {/* Group */}
                    <div className="col-span-5 flex items-center gap-3">
                      <Avatar src={group.avatar_url} name={group.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
                            {group.name}
                          </p>
                          {/* Group Type Badge */}
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            group.is_official 
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                              : group.is_community
                                ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                : "bg-slate-500/20 text-slate-300 border-slate-500/40"
                          )}>
                            {group.is_official ? "Official" : group.is_community ? "Community" : "Group"}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-400">@{group.slug}</p>
                      </div>
                    </div>

                    {/* Members */}
                    <div className="col-span-3 hidden sm:flex items-center gap-1.5 text-emerald-200">
                      <Users className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-sm">{group.members_count || 0} members</span>
                    </div>

                    {/* Total Points */}
                    <div className="col-span-3 text-right">
                      <p className="font-bold text-lg text-amber-400">
                        {fmtNum(Math.round(group.total_points || 0))} pts
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Load More */}
        {!isGroupMode && users.length < total && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-6 py-3 bg-emerald-600/80 backdrop-blur text-white font-semibold rounded-xl hover:bg-emerald-500 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                `Load More (${users.length} of ${total})`
              )}
            </button>
          </div>
        )}

        {isGroupMode && groups.length < total && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-6 py-3 bg-emerald-600/80 backdrop-blur text-white font-semibold rounded-xl hover:bg-emerald-500 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                `Load More (${groups.length} of ${total})`
              )}
            </button>
          </div>
        )}

        {/* Results count */}
        <div className="text-center mt-4 text-emerald-400/60 text-sm">
          {isGroupMode 
            ? `Showing ${groups.length} of ${total} groups`
            : `Showing ${users.length} of ${total} users`
          }
        </div>
      </div>

      {/* Group Members / Affiliated Hubs Modal */}
      {selectedGroup && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={closeGroupModal}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
              {/* Modal Header */}
              <div className={cn(
                "p-4 text-white",
                selectedGroup.is_community 
                  ? "bg-gradient-to-br from-purple-600 to-indigo-600"
                  : selectedGroup.is_official
                    ? "bg-gradient-to-br from-amber-500 to-orange-500"
                    : "bg-gradient-to-br from-emerald-600 to-teal-600"
              )}>
                <div className="flex items-center gap-3">
                  <Avatar src={selectedGroup.avatar_url} name={selectedGroup.name} size="md" />
                  <div>
                    <h3 className="font-bold text-lg">{selectedGroup.name}</h3>
                    <p className="text-white/70 text-sm">@{selectedGroup.slug}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {selectedGroup.is_community 
                      ? `${affiliatedHubs.length} hubs`
                      : `${selectedGroup.members_count} members`
                    }
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-amber-300" />
                    {fmtNum(Math.round(selectedGroup.total_points || 0))} pts
                  </span>
                </div>
              </div>

              {/* Content List */}
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {selectedGroup.is_community ? "Affiliated Hubs Ranking" : "Members Ranking"}
                </h4>
                
                {loadingMembers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                ) : selectedGroup.is_community ? (
                  // Show affiliated hubs for Communities
                  affiliatedHubs.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No affiliated hubs found</p>
                  ) : (
                    <div className="space-y-2">
                      {affiliatedHubs.map((hub, index) => (
                        <div 
                          key={hub.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                              index === 0 ? "bg-amber-400 text-white" :
                              index === 1 ? "bg-slate-400 text-white" :
                              index === 2 ? "bg-orange-400 text-white" :
                              "bg-slate-200 text-slate-600"
                            )}>
                              {index + 1}
                            </span>
                            <Avatar src={hub.avatar_url} name={hub.name} size="sm" />
                            <span className="font-medium text-slate-700">{hub.name}</span>
                          </div>
                          <span className="font-bold text-amber-600">
                            {fmtNum(Math.round(hub.total_points || 0))} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // Show members for Normal Groups and Official Groups
                  groupMembers.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No members found</p>
                  ) : (
                    <div className="space-y-2">
                      {groupMembers.map((member, index) => (
                        <div 
                          key={member.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                              index === 0 ? "bg-amber-400 text-white" :
                              index === 1 ? "bg-slate-400 text-white" :
                              index === 2 ? "bg-orange-400 text-white" :
                              "bg-slate-200 text-slate-600"
                            )}>
                              {index + 1}
                            </span>
                            <Avatar src={member.avatar?.url} name={member.name} size="sm" />
                            <span className="font-medium text-slate-700">{member.name}</span>
                          </div>
                          <span className="font-bold text-amber-600">
                            {fmtNum(Math.max(0, member.points_since_joining || 0))} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Close Button */}
              <div className="p-4 border-t">
                <button
                  onClick={closeGroupModal}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* VS Comparison Mode Modal */}
      {vsMode && isGroupMode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Swords className="h-6 w-6" />
                <h2 className="text-xl font-bold">Compare {viewFilter}s</h2>
              </div>
              <button 
                onClick={closeVsMode}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Comparison Container */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-6 h-full">
                {/* LEFT SIDE */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-3 text-center">Select {viewFilter} (Left)</h3>
                  
                  {/* Selection Dropdown */}
                  <div className="mb-4">
                    <select
                      value={leftSelection?.id || ""}
                      onChange={(e) => {
                        const group = groups.find(g => g.id === e.target.value);
                        if (group) handleVsSelect(group, 'left');
                      }}
                      className="w-full px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="">-- Select a {viewFilter} --</option>
                      {groups.filter(g => g.id !== rightSelection?.id).map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({fmtNum(Math.round(group.total_points || 0))} pts)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Group Info */}
                  {leftSelection && (
                    <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={leftSelection.avatar_url} name={leftSelection.name} size="md" />
                        <div>
                          <h4 className="font-bold text-slate-800">{leftSelection.name}</h4>
                          <p className="text-sm text-slate-500">@{leftSelection.slug}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Users className="h-4 w-4" />
                          {leftSelection.is_community 
                            ? `${leftHubs.length} hubs`
                            : `${leftSelection.members_count} members`
                          }
                        </span>
                        <span className="flex items-center gap-1 font-bold text-amber-600">
                          <Trophy className="h-4 w-4" />
                          {fmtNum(Math.round(leftSelection.total_points || 0))} pts
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Members/Hubs List */}
                  <div className="flex-1 overflow-y-auto bg-slate-50 rounded-2xl p-3 max-h-[350px]">
                    {loadingLeft ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                      </div>
                    ) : !leftSelection ? (
                      <p className="text-center text-slate-400 py-8">Select a {viewFilter} to see details</p>
                    ) : leftSelection.is_community ? (
                      leftHubs.length === 0 ? (
                        <p className="text-center text-slate-400 py-8">No affiliated hubs</p>
                      ) : (
                        <div className="space-y-2">
                          {leftHubs.map((hub, index) => (
                            <div key={hub.id} className="flex items-center justify-between p-2 rounded-lg bg-white">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                                  index === 0 ? "bg-amber-400 text-white" :
                                  index === 1 ? "bg-slate-400 text-white" :
                                  index === 2 ? "bg-orange-400 text-white" :
                                  "bg-slate-200 text-slate-600"
                                )}>
                                  {index + 1}
                                </span>
                                <Avatar src={hub.avatar_url} name={hub.name} size="sm" />
                                <span className="font-medium text-slate-700 text-sm truncate">{hub.name}</span>
                              </div>
                              <span className="font-bold text-amber-600 text-sm">
                                {fmtNum(Math.round(hub.total_points || 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      leftMembers.length === 0 ? (
                        <p className="text-center text-slate-400 py-8">No members</p>
                      ) : (
                        <div className="space-y-2">
                          {leftMembers.map((member, index) => (
                            <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-white">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                                  index === 0 ? "bg-amber-400 text-white" :
                                  index === 1 ? "bg-slate-400 text-white" :
                                  index === 2 ? "bg-orange-400 text-white" :
                                  "bg-slate-200 text-slate-600"
                                )}>
                                  {index + 1}
                                </span>
                                <Avatar src={member.avatar?.url} name={member.name} size="sm" />
                                <span className="font-medium text-slate-700 text-sm truncate">{member.name}</span>
                              </div>
                              <span className="font-bold text-amber-600 text-sm">
                                {fmtNum(Math.max(0, member.points_since_joining || 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* VS DIVIDER */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shadow-lg">
                    VS
                  </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3 text-center">Select {viewFilter} (Right)</h3>
                  
                  {/* Selection Dropdown */}
                  <div className="mb-4">
                    <select
                      value={rightSelection?.id || ""}
                      onChange={(e) => {
                        const group = groups.find(g => g.id === e.target.value);
                        if (group) handleVsSelect(group, 'right');
                      }}
                      className="w-full px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="">-- Select a {viewFilter} --</option>
                      {groups.filter(g => g.id !== leftSelection?.id).map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({fmtNum(Math.round(group.total_points || 0))} pts)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Group Info */}
                  {rightSelection && (
                    <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={rightSelection.avatar_url} name={rightSelection.name} size="md" />
                        <div>
                          <h4 className="font-bold text-slate-800">{rightSelection.name}</h4>
                          <p className="text-sm text-slate-500">@{rightSelection.slug}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Users className="h-4 w-4" />
                          {rightSelection.is_community 
                            ? `${rightHubs.length} hubs`
                            : `${rightSelection.members_count} members`
                          }
                        </span>
                        <span className="flex items-center gap-1 font-bold text-amber-600">
                          <Trophy className="h-4 w-4" />
                          {fmtNum(Math.round(rightSelection.total_points || 0))} pts
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Members/Hubs List */}
                  <div className="flex-1 overflow-y-auto bg-slate-50 rounded-2xl p-3 max-h-[350px]">
                    {loadingRight ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                      </div>
                    ) : !rightSelection ? (
                      <p className="text-center text-slate-400 py-8">Select a {viewFilter} to see details</p>
                    ) : rightSelection.is_community ? (
                      rightHubs.length === 0 ? (
                        <p className="text-center text-slate-400 py-8">No affiliated hubs</p>
                      ) : (
                        <div className="space-y-2">
                          {rightHubs.map((hub, index) => (
                            <div key={hub.id} className="flex items-center justify-between p-2 rounded-lg bg-white">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                                  index === 0 ? "bg-amber-400 text-white" :
                                  index === 1 ? "bg-slate-400 text-white" :
                                  index === 2 ? "bg-orange-400 text-white" :
                                  "bg-slate-200 text-slate-600"
                                )}>
                                  {index + 1}
                                </span>
                                <Avatar src={hub.avatar_url} name={hub.name} size="xs" />
                                <span className="font-medium text-slate-700 text-sm truncate">{hub.name}</span>
                              </div>
                              <span className="font-bold text-amber-600 text-sm">
                                {fmtNum(Math.round(hub.total_points || 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      rightMembers.length === 0 ? (
                        <p className="text-center text-slate-400 py-8">No members</p>
                      ) : (
                        <div className="space-y-2">
                          {rightMembers.map((member, index) => (
                            <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-white">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                                  index === 0 ? "bg-amber-400 text-white" :
                                  index === 1 ? "bg-slate-400 text-white" :
                                  index === 2 ? "bg-orange-400 text-white" :
                                  "bg-slate-200 text-slate-600"
                                )}>
                                  {index + 1}
                                </span>
                                <Avatar src={member.avatar?.url} name={member.name} size="xs" />
                                <span className="font-medium text-slate-700 text-sm truncate">{member.name}</span>
                              </div>
                              <span className="font-bold text-amber-600 text-sm">
                                {fmtNum(Math.max(0, member.points_since_joining || 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Comparison Summary */}
              {leftSelection && rightSelection && (
                <div className="mt-6 bg-gradient-to-r from-purple-100 via-white to-indigo-100 rounded-2xl p-4 border border-purple-200">
                  <h3 className="text-center font-bold text-lg text-slate-800 mb-4">Comparison Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="font-bold text-xl text-purple-600">{fmtNum(Math.round(leftSelection.total_points || 0))}</p>
                      <p className="text-xs text-slate-500">Total Points</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className={cn(
                        "px-4 py-2 rounded-full font-bold text-white",
                        leftSelection.total_points > rightSelection.total_points 
                          ? "bg-purple-600" 
                          : leftSelection.total_points < rightSelection.total_points
                            ? "bg-indigo-600"
                            : "bg-slate-500"
                      )}>
                        {leftSelection.total_points > rightSelection.total_points 
                          ? `+${fmtNum(Math.round(leftSelection.total_points - rightSelection.total_points))} Left`
                          : leftSelection.total_points < rightSelection.total_points
                            ? `+${fmtNum(Math.round(rightSelection.total_points - leftSelection.total_points))} Right`
                            : "TIE"
                        }
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-xl text-indigo-600">{fmtNum(Math.round(rightSelection.total_points || 0))}</p>
                      <p className="text-xs text-slate-500">Total Points</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-slate-50">
              <button
                onClick={closeVsMode}
                className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
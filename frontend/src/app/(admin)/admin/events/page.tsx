"use client";
import { useEffect, useState } from "react";
import { adminService } from "@/services/admin.service";
import { Trash2, MapPin, Calendar as CalendarIcon, Users } from "lucide-react";
import toast from "react-hot-toast";

interface EventData {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string | null;
  attendees_count: number;
  created_at: string;
  organizer: {
    id: string;
    name: string;
    username: string;
    avatar: { url: string };
  } | null;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadEvents();
  }, [page]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getEvents(page, 20);
      setEvents(data.events);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this event? This action cannot be undone.")) return;

    try {
      await adminService.deleteEvent(eventId);
      setEvents(events.filter((e) => e.id !== eventId));
      toast.success("Event deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete event");
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Event Management</h1>
        <p className="text-slate-600 mt-1">Oversee community events</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No events found</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {event.organizer && (
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={event.organizer.avatar.url || "/default-avatar.png"}
                            alt={event.organizer.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-slate-900">{event.organizer.name}</p>
                            <p className="text-sm text-slate-500">@{event.organizer.username}</p>
                          </div>
                        </div>
                      )}
                      <h3 className="font-bold text-lg text-slate-900 mb-2">{event.title}</h3>
                      <p className="text-slate-700 mb-3">{event.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.date && (
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{event.attendees_count} attendees</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="Delete event"
                    >
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

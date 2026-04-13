import api from "@/lib/api";
export const eventService = {
  createEvent: (fd: FormData) => api.post("/events/create", fd, { headers: {"Content-Type":"multipart/form-data"} }),
  getEvents:   (status = "upcoming", page = 1) => api.get(`/events?status=${status}&page=${page}`),
  joinEvent:   (id: string)   => api.post(`/events/${id}/join`),
};

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Video, Calendar, Clock, ExternalLink, Users, Loader2,
  CheckCircle2, Sparkles, XCircle, CalendarPlus, MessageSquare,
  ChevronRight, Mail, CalendarCheck, AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Tab = "invitations" | "book" | "mysessions";

export default function LiveSessionsPage() {
  const [tab, setTab] = useState<Tab>("invitations");
  const [invitations, setInvitations] = useState<any[]>([]);
  const [acceptedSessions, setAcceptedSessions] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Booking form
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setIsLoading(false); return; }
    const uid = session.user.id;

    // Fetch enrollments with session details
    const { data: enrollments } = await supabase
      .from("live_session_enrollments")
      .select("*, live_sessions(*, courses(title))")
      .eq("student_id", uid)
      .order("enrolled_at", { ascending: false });

    const inv: any[] = [];
    const acc: any[] = [];
    (enrollments || []).forEach((e: any) => {
      if (e.status === "accepted") acc.push(e);
      else if (e.status === "invited") inv.push(e);
    });
    setInvitations(inv);
    setAcceptedSessions(acc);

    // Fetch admin availability slots
    const { data: slotsData } = await supabase
      .from("admin_availability_slots")
      .select("*")
      .eq("is_active", true)
      .eq("is_booked", false)
      .order("day_of_week", { ascending: true });
    setSlots(slotsData || []);

    // Fetch booking requests
    const { data: requests } = await supabase
      .from("booking_requests")
      .select("*, admin_availability_slots(*)")
      .eq("student_id", uid)
      .order("created_at", { ascending: false });
    setBookingRequests(requests || []);

    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRespond = async (enrollmentId: string, status: "accepted" | "declined") => {
    setActionId(enrollmentId);
    const { error } = await supabase
      .from("live_session_enrollments")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", enrollmentId);
    if (error) alert("Error: " + error.message);
    else await fetchData();
    setActionId(null);
  };

  const handleBookingSubmit = async () => {
    if (!selectedSlot || !bookingDate) return;
    
    if (selectedSlot.price > 0) {
      const confirmBooking = window.confirm(`This session costs £${selectedSlot.price}. The amount will be deducted from your wallet. Do you want to proceed?`);
      if (!confirmBooking) return;
    }

    setSubmittingBooking(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      const response = await fetch("/api/student/book-slot", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          student_id: session.user.id,
          slot_id: selectedSlot.id,
          booking_date: bookingDate,
          notes: bookingNotes,
        })
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Failed to submit booking");
      } else {
        setSelectedSlot(null);
        setBookingDate("");
        setBookingNotes("");
        await fetchData();
        // Fire custom event to update wallet balance in sidebar if price was deducted
        if (selectedSlot.price > 0) {
          window.dispatchEvent(new Event("wallet-updated"));
        }
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }

    setSubmittingBooking(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const formatTimeOnly = (t: string) => t.slice(0, 5);

  // Get next valid date for a given day_of_week
  const getNextDateForDay = (dayOfWeek: number) => {
    const today = new Date();
    const diff = (dayOfWeek - today.getDay() + 7) % 7 || 7;
    const next = new Date(today);
    next.setDate(today.getDate() + diff);
    return next.toISOString().split("T")[0];
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Live Sessions</h1>
        <p className="text-text/60 text-sm">Join live tutoring sessions with Michael Gad.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
        <button
          onClick={() => setTab("invitations")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            tab === "invitations"
              ? "bg-white text-primary shadow-sm"
              : "text-text/50 hover:text-text/70"
          }`}
        >
          <Mail className="w-4 h-4" />
          Invitations
          {invitations.length > 0 && (
            <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
              {invitations.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("book")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            tab === "book"
              ? "bg-white text-primary shadow-sm"
              : "text-text/50 hover:text-text/70"
          }`}
        >
          <CalendarPlus className="w-4 h-4" />
          Book a Session
        </button>
        <button
          onClick={() => setTab("mysessions")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            tab === "mysessions"
              ? "bg-white text-primary shadow-sm"
              : "text-text/50 hover:text-text/70"
          }`}
        >
          <Video className="w-4 h-4" />
          My Sessions
        </button>
      </div>

      {/* ====== INVITATIONS TAB ====== */}
      {tab === "invitations" && (
        <div className="space-y-8">
          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold text-text">Pending Invitations</h2>
              </div>
              <div className="space-y-3">
                {invitations.map((enrollment) => {
                  const s = enrollment.live_sessions;
                  if (!s) return null;
                  const isActing = actionId === enrollment.id;
                  return (
                    <div key={enrollment.id} className="bg-white rounded-2xl border-2 border-accent/20 shadow-sm p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="bg-accent/10 p-3 rounded-xl flex-shrink-0 mt-0.5">
                          <Mail className="w-6 h-6 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">NEW INVITATION</span>
                          </div>
                          <h3 className="font-bold text-text text-lg">{s.title}</h3>
                          {s.courses?.title && <p className="text-xs text-text/40 mt-0.5">{s.courses.title}</p>}
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <span className="text-sm text-text/60 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />{formatDate(s.scheduled_at)}
                            </span>
                            <span className="text-sm text-text/60 flex items-center gap-1">
                              <Clock className="w-4 h-4" />{formatTime(s.scheduled_at)} · {s.duration_minutes} min
                            </span>
                            {s.price === 0 ? (
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full">FREE</span>
                            ) : (
                              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">£{s.price}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleRespond(enrollment.id, "declined")}
                            disabled={isActing}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm border-2 border-gray-200 text-text/60 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />Decline
                          </button>
                          <button
                            onClick={() => handleRespond(enrollment.id, "accepted")}
                            disabled={isActing}
                            className="flex items-center gap-1.5 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                          >
                            {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Accept
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ====== MY SESSIONS TAB ====== */}
      {tab === "mysessions" && (
        <div className="space-y-10">
          {/* Accepted / Upcoming */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CalendarCheck className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-text">Your Upcoming Sessions</h2>
            </div>
            {acceptedSessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-text/50 text-sm">No upcoming sessions yet. Accept an invitation or book a new one!</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="space-y-3">
                    {acceptedSessions.filter(e => new Date(e.live_sessions.scheduled_at) >= new Date()).length === 0 && (
                      <div className="text-sm text-text/50 p-4 border rounded-xl bg-gray-50 text-center">No upcoming scheduled sessions.</div>
                    )}
                    {acceptedSessions.filter(e => new Date(e.live_sessions.scheduled_at) >= new Date()).map((enrollment) => {
                      const s = enrollment.live_sessions;
                      if (!s) return null;
                      return (
                        <div key={enrollment.id} className="bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-5 border-primary/20">
                          <div className="bg-primary/10 p-3 rounded-xl flex-shrink-0">
                            <Video className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-text">{s.title}</h3>
                            {s.courses?.title && <p className="text-xs text-text/40 mt-0.5">{s.courses.title}</p>}
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-text/60 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(s.scheduled_at)}</span>
                              <span className="text-xs text-text/60 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(s.scheduled_at)} · {s.duration_minutes} min</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />Accepted
                            </span>
                            {s.meeting_url && (
                              <a href={s.meeting_url.startsWith('http') ? s.meeting_url : `https://${s.meeting_url}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                                <ExternalLink className="w-4 h-4" />Join
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {acceptedSessions.filter(e => new Date(e.live_sessions.scheduled_at) < new Date()).length > 0 && (
                  <div>
                    <h3 className="text-md font-bold text-text mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Session History
                    </h3>
                    <div className="space-y-3">
                      {acceptedSessions.filter(e => new Date(e.live_sessions.scheduled_at) < new Date()).map((enrollment) => {
                        const s = enrollment.live_sessions;
                        if (!s) return null;
                        return (
                          <div key={enrollment.id} className="bg-white rounded-2xl border border-gray-100 opacity-60 shadow-sm p-5 flex items-center gap-5">
                            <div className="bg-gray-100 text-gray-400 p-3 rounded-xl flex-shrink-0">
                              <Video className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-text">{s.title}</h3>
                              {s.courses?.title && <p className="text-xs text-text/40 mt-0.5">{s.courses.title}</p>}
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs text-text/60 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(s.scheduled_at)}</span>
                                <span className="text-xs text-text/60 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(s.scheduled_at)} · {s.duration_minutes} min</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {s.recording_url && (
                                <a href={s.recording_url.startsWith('http') ? s.recording_url : `https://${s.recording_url}`} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-300 transition-all">
                                  <Video className="w-4 h-4" />Watch Recording
                                </a>
                              )}
                              <span className="text-xs font-medium text-text/60 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />Attended
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* My Booking Requests */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-bold text-text">Your Booking Requests</h2>
            </div>
            {bookingRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-text/50 text-sm">No booking requests yet. Pick a slot in the "Book a Session" tab to get started!</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="space-y-3">
                    {bookingRequests.filter(req => new Date(req.requested_date).setHours(23,59,59,999) >= Date.now()).length === 0 && (
                      <div className="text-sm text-text/50 p-4 border rounded-xl bg-gray-50 text-center">No upcoming booking requests.</div>
                    )}
                    {bookingRequests.filter(req => new Date(req.requested_date).setHours(23,59,59,999) >= Date.now()).map((req) => {
                  const slot = req.admin_availability_slots;
                  const statusColors: Record<string, string> = {
                    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
                    approved: "bg-green-50 text-green-700 border-green-200",
                    rejected: "bg-red-50 text-red-600 border-red-200",
                  };
                  const statusIcons: Record<string, any> = {
                    pending: <Clock className="w-3.5 h-3.5" />,
                    approved: <CheckCircle2 className="w-3.5 h-3.5" />,
                    rejected: <XCircle className="w-3.5 h-3.5" />,
                  };
                  return (
                    <div key={req.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-accent/10 p-3 rounded-xl flex-shrink-0">
                            <CalendarPlus className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <div className="font-bold text-text">
                              {slot ? `${DAYS[slot.day_of_week]} — ${formatTimeOnly(slot.start_time)}` : `Session Request — ${formatTimeOnly(req.requested_start_time)}`}
                            </div>
                            <div className="text-xs text-text/50 mt-0.5">
                              Date: {new Date(req.requested_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                            {req.notes && <div className="text-xs text-text/40 mt-1 italic">&quot;{req.notes}&quot;</div>}
                            {req.admin_response && (
                              <div className="text-xs text-text/60 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />Admin: {req.admin_response}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1 capitalize ${statusColors[req.status] || ""}`}>
                          {statusIcons[req.status]}{req.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
                  </div>
                </div>

                {bookingRequests.filter(req => new Date(req.requested_date).setHours(23,59,59,999) < Date.now()).length > 0 && (
                  <div>
                    <h3 className="text-md font-bold text-text mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Request History
                    </h3>
                    <div className="space-y-3">
                      {bookingRequests.filter(req => new Date(req.requested_date).setHours(23,59,59,999) < Date.now()).map((req) => {
                        const slot = req.admin_availability_slots;
                        const statusColors: Record<string, string> = {
                          pending: "bg-gray-50 text-gray-500 border-gray-200",
                          approved: "bg-gray-50 text-gray-500 border-gray-200",
                          rejected: "bg-gray-50 text-gray-500 border-gray-200",
                        };
                        const statusIcons: Record<string, any> = {
                          pending: <Clock className="w-3.5 h-3.5" />,
                          approved: <CheckCircle2 className="w-3.5 h-3.5" />,
                          rejected: <XCircle className="w-3.5 h-3.5" />,
                        };
                        return (
                          <div key={req.id} className="bg-white rounded-2xl border border-gray-100 opacity-60 shadow-sm p-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-gray-100 p-3 rounded-xl flex-shrink-0 text-gray-400">
                                  <CalendarPlus className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="font-bold text-text">
                                    {slot ? `${DAYS[slot.day_of_week]} — ${formatTimeOnly(slot.start_time)}` : `Session Request — ${formatTimeOnly(req.requested_start_time)}`}
                                  </div>
                                  <div className="text-xs text-text/50 mt-0.5">
                                    Date: {new Date(req.requested_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                  </div>
                                </div>
                              </div>
                              <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1 capitalize ${statusColors[req.status] || ""}`}>
                                {statusIcons[req.status]}{req.status} (Past)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
      {/* ====== BOOK A SESSION TAB ====== */}
      {tab === "book" && (
        <div className="space-y-8">
          {/* Available Schedule Slots */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-text">Available Time Slots</h2>
            </div>
            <p className="text-text/50 text-sm mb-5">Pick a slot from Michael&apos;s weekly schedule, choose a date, and send your request.</p>

            {slots.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-text/50 text-sm">No available time slots right now. Check back later!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => {
                        setSelectedSlot(isSelected ? null : slot);
                        setBookingDate(isSelected ? "" : (slot.slot_date || getNextDateForDay(slot.day_of_week)));
                      }}
                      className={`text-left p-4 rounded-2xl border-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                          : "border-gray-200 bg-white hover:border-primary/40 hover:shadow-sm"
                      }`}
                    >
                      <div className="font-bold text-text mb-1">
                        {slot.slot_date ? formatDate(slot.slot_date) : DAYS[slot.day_of_week]}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text/60">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimeOnly(slot.start_time)} – {formatTimeOnly(slot.end_time)}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-text/40">{slot.duration_minutes} min session</div>
                        {slot.price > 0 ? (
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">£{slot.price}</span>
                        ) : (
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">FREE</span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                          <CheckCircle2 className="w-3.5 h-3.5" />Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Booking Form */}
          {selectedSlot && (
            <section className="bg-white rounded-2xl border-2 border-primary/20 p-6 shadow-sm">
              <h3 className="font-bold text-text mb-4 flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-primary" />
                Book: {selectedSlot.slot_date ? formatDate(selectedSlot.slot_date) : DAYS[selectedSlot.day_of_week]} {formatTimeOnly(selectedSlot.start_time)} – {formatTimeOnly(selectedSlot.end_time)}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Date *</label>
                  {selectedSlot.slot_date ? (
                    <div className="w-full px-4 py-3 bg-gray-100 text-text/60 font-medium border border-gray-200 rounded-xl cursor-not-allowed">
                      {formatDate(selectedSlot.slot_date)}
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={bookingDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Notes for Michael (optional)</label>
                  <input
                    type="text"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="e.g. I need help with trigonometry"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>

              {selectedSlot.price > 0 && (
                <div className="mt-5 p-4 bg-orange-50 text-orange-800 text-sm font-medium rounded-xl border border-orange-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Wallet Deduction:</strong> Booking this session will automatically deduct 
                    <strong> £{selectedSlot.price}</strong> from your wallet balance. Ensure you have enough funds.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setSelectedSlot(null); setBookingDate(""); setBookingNotes(""); }}
                  className="px-5 py-2.5 rounded-xl font-medium text-text/60 hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={handleBookingSubmit}
                  disabled={!bookingDate || submittingBooking}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                >
                  {submittingBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  Send Booking Request
                </button>
              </div>
            </section>
          )}
        </div>
      )}

    </div>
  );
}

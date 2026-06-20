"use client";

import { useState, useEffect } from "react";
import {
  Video, Plus, Calendar, Clock, Link2, Trash2, Users, Send,
  Loader2, X, CheckCircle2, ExternalLink, CalendarPlus, MessageSquare,
  ToggleLeft, ToggleRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function AdminLiveSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState<string|null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState<"sessions"|"schedule"|"requests">("sessions");

  // Booking requests
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [respondingId, setRespondingId] = useState<string|null>(null);

  // Link updating
  const [editUrlId, setEditUrlId] = useState<string|null>(null);
  const [editUrlType, setEditUrlType] = useState<"meeting_url" | "recording_url">("meeting_url");
  const [editUrlValue, setEditUrlValue] = useState("");
  const [updatingUrl, setUpdatingUrl] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [slotForm, setSlotForm] = useState({ day_of_week: 1, start_time: "09:00", end_time: "10:00", duration_minutes: 60, slot_date: "", price: 0 });
  const [addingSlot, setAddingSlot] = useState(false);

  // Schedule state
  const [slots, setSlots] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", course_id: "", scheduled_at: "", duration_minutes: 60, meeting_url: "", price: 0 });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [sessRes, courseRes, studRes, slotRes, reqRes] = await Promise.all([
      supabase.from("live_sessions").select("*, courses(title), live_session_enrollments(id, student_id, status, profiles:student_id(full_name, email))").order("scheduled_at", { ascending: false }),
      supabase.from("courses").select("id, title").order("title"),
      supabase.from("profiles").select("id, full_name, email").eq("role", "student").order("full_name"),
      supabase.from("admin_availability_slots").select("*").order("day_of_week"),
      supabase.from("booking_requests").select("*, admin_availability_slots(*), profiles:student_id(full_name, email)").order("created_at", { ascending: false }),
    ]);
    setSessions(sessRes.data || []);
    setCourses(courseRes.data || []);
    setStudents(studRes.data || []);
    setSlots(slotRes.data || []);
    setBookingRequests(reqRes.data || []);
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title || !form.scheduled_at) { alert("Fill title and date."); return; }
    
    if (new Date(form.scheduled_at) < new Date()) {
      alert("Session date and time cannot be in the past.");
      return;
    }

    setCreating(true);
    const { error } = await supabase.from("live_sessions").insert({
      title: form.title, course_id: form.course_id || null, scheduled_at: form.scheduled_at,
      duration_minutes: form.duration_minutes, meeting_url: form.meeting_url || null, price: form.price,
    });
    if (error) alert("Error: " + error.message);
    else { setForm({ title: "", course_id: "", scheduled_at: "", duration_minutes: 60, meeting_url: "", price: 0 }); setShowCreate(false); await fetchData(); }
    setCreating(false);
  };

  const handleDelete = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("live_sessions").delete().eq("id", id); await fetchData(); };

  const handleInvite = async (sessionId: string) => {
    if (selectedStudents.length === 0) return;
    setInviting(true);
    const rows = selectedStudents.map(sid => ({ student_id: sid, session_id: sessionId, status: "invited" }));
    const { error } = await supabase.from("live_session_enrollments").upsert(rows, { onConflict: "student_id,session_id" });
    if (error) alert("Error: " + error.message);
    else { 
      // Send notifications to all invited students
      const session = sessions.find((s: any) => s.id === sessionId);
      if (session) {
        const notifs = selectedStudents.map(sid => ({
          student_id: sid,
          title: "New Live Session Invitation",
          message: `You have been invited to join: ${session.title} on ${new Date(session.scheduled_at).toLocaleDateString("en-GB")}.`,
          type: "info",
          link_url: "/dashboard/live-sessions"
        }));
        await supabase.from("notifications").insert(notifs);
      }

      setSelectedStudents([]); 
      setShowInvite(null); 
      await fetchData(); 
    }
    setInviting(false);
  };

  const toggleStudent = (id: string) => setSelectedStudents(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const selectAllStudents = () => setSelectedStudents(p => p.length === students.length ? [] : students.map(s => s.id));

  const handleAddSlot = async () => {
    if (!slotForm.slot_date || !slotForm.start_time || !slotForm.end_time || !slotForm.duration_minutes) {
      alert("Please fill in all fields including the Date, Start Time, End Time, and Duration.");
      return;
    }

    const dateObj = new Date(slotForm.slot_date);
    if (dateObj.getDay() !== slotForm.day_of_week) {
      alert(`The selected date is a ${DAYS[dateObj.getDay()]}, but the selected Day is ${DAYS[slotForm.day_of_week]}. Please make sure they match.`);
      return;
    }

    if (slotForm.slot_date) {
      const slotDateTime = new Date(`${slotForm.slot_date}T${slotForm.start_time}`);
      if (slotDateTime < new Date()) {
        alert("Slot date and time cannot be in the past.");
        return;
      }
    }

    setAddingSlot(true);
    const payload = { ...slotForm, slot_date: slotForm.slot_date || null };
    const { error } = await supabase.from("admin_availability_slots").insert(payload);
    if (error) alert("Error: " + error.message);
    else { setShowAddSlot(false); setSlotForm({ day_of_week: 1, start_time: "09:00", end_time: "10:00", duration_minutes: 60, slot_date: "", price: 0 }); await fetchData(); }
    setAddingSlot(false);
  };

  const handleDeleteSlot = async (id: string) => { await supabase.from("admin_availability_slots").delete().eq("id", id); await fetchData(); };

  const handleBookingResponse = async (reqId: string, newStatus: "approved" | "rejected", response?: string) => {
    setRespondingId(reqId);
    const updateData: any = { status: newStatus, admin_response: response || null, responded_at: new Date().toISOString() };
    
    const req = bookingRequests.find((r: any) => r.id === reqId);
    
    console.log("Updating booking request", reqId, updateData);
    const { data, error } = await supabase.from("booking_requests").update(updateData).eq("id", reqId).select();
    console.log("Update result:", { data, error });
    
    if (error) {
      alert("Error approving: " + error.message);
    } else {
      // Create notification
      if (req?.student_id) {
        const title = newStatus === "approved" ? "Session Booking Approved" : "Session Booking Declined";
        const msg = newStatus === "approved" 
          ? `Your session booking on ${req.requested_date} at ${req.requested_start_time} has been approved.` 
          : `Your session booking on ${req.requested_date} at ${req.requested_start_time} has been declined.`;
          
        const { error: notifError } = await supabase.from("notifications").insert({
          student_id: req.student_id,
          title,
          message: response ? `${msg} Note: ${response}` : msg,
          type: newStatus === "approved" ? "success" : "warning",
          link_url: "/dashboard/live-sessions"
        });
        if (notifError) {
          console.error("Error sending notification:", notifError);
          alert("Error sending notification to student: " + notifError.message);
        }
      }

      // Handle unbooking and refund if rejected
      if (newStatus === "rejected" && req?.slot_id) {
        await supabase.from("admin_availability_slots").update({ is_booked: false }).eq("id", req.slot_id);
        const price = req.admin_availability_slots?.price || 0;
        if (price > 0 && req.student_id) {
          // fetch current balance
          const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", req.student_id).single();
          if (profile) {
            const newBalance = profile.wallet_balance + price;
            await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("id", req.student_id);
            await supabase.from("wallet_transactions").insert({
              student_id: req.student_id,
              type: "refund",
              amount: price,
              description: `Refund for declined session booking on ${req.requested_date}`
            });
          }
        }
      } else if (newStatus === "approved" && req) {
        // Create the actual live session
        const scheduledAt = `${req.requested_date}T${req.requested_start_time}`;
        const slot = req.admin_availability_slots;
        
        const { data: sessionData, error: sessionError } = await supabase.from("live_sessions").insert({
          title: "1-on-1 Tutoring Session",
          scheduled_at: scheduledAt,
          duration_minutes: slot?.duration_minutes || 60,
          price: slot?.price || 0,
        }).select().single();

        if (sessionError) {
          console.error("Error creating session:", sessionError);
        } else if (sessionData && req.student_id) {
          // Auto-enroll the student and mark as accepted
          await supabase.from("live_session_enrollments").insert({
            session_id: sessionData.id,
            student_id: req.student_id,
            status: "accepted",
            responded_at: new Date().toISOString()
          });
        }
      }
      
      await fetchData();
    }
    setRespondingId(null);
  };

  const handleUpdateUrl = async (id: string, type: "meeting_url" | "recording_url") => {
    setUpdatingUrl(true);
    const { error } = await supabase.from("live_sessions").update({ [type]: editUrlValue || null }).eq("id", id);
    if (error) alert("Error updating URL: " + error.message);
    else {
      setEditUrlId(null);
      setEditUrlValue("");
      await fetchData();
    }
    setUpdatingUrl(false);
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const fmtT = (t: string) => t.slice(0, 5);

  const pendingCount = bookingRequests.filter((r: any) => r.status === "pending").length;

  if (isLoading) return <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Live Sessions</h1>
          <p className="text-text/60 text-sm">Manage sessions, schedule, and booking requests.</p>
        </div>
        {activeTab === "sessions" && (
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />New Session
          </button>
        )}
        {activeTab === "schedule" && (
          <button onClick={() => setShowAddSlot(!showAddSlot)} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />Add Slot
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
        {[
          { key: "sessions" as const, icon: <Video className="w-4 h-4" />, label: "Sessions" },
          { key: "schedule" as const, icon: <Calendar className="w-4 h-4" />, label: "My Schedule" },
          { key: "requests" as const, icon: <MessageSquare className="w-4 h-4" />, label: "Requests", badge: pendingCount },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === t.key ? "bg-white text-primary shadow-sm" : "text-text/50 hover:text-text/70"}`}>
            {t.icon}{t.label}
            {t.badge ? <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ===== SESSIONS TAB ===== */}
      {activeTab === "sessions" && (<>
        {showCreate && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 shadow-sm">
            <h3 className="font-bold text-text mb-4">Create Live Session</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className="block text-sm font-medium text-text mb-1.5">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="e.g. Algebra Revision" /></div>
              <div><label className="block text-sm font-medium text-text mb-1.5">Course</label>
                <select value={form.course_id} onChange={e => setForm(p => ({...p, course_id: e.target.value}))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option value="">No course</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-text mb-1.5">Date & Time *</label>
                <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({...p, scheduled_at: e.target.value}))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" /></div>
              <div><label className="block text-sm font-medium text-text mb-1.5">Duration (min)</label>
                <input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({...p, duration_minutes: parseInt(e.target.value)||60}))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" /></div>
              <div><label className="block text-sm font-medium text-text mb-1.5">Price (£)</label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({...p, price: parseFloat(e.target.value)||0}))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-text mb-1.5">Meeting URL</label>
                <input type="url" value={form.meeting_url} onChange={e => setForm(p => ({...p, meeting_url: e.target.value}))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="https://zoom.us/j/..." /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 rounded-xl font-medium text-text/60 hover:bg-gray-100">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-60">
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Session"}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {sessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-bold text-text mb-2">No sessions yet</h3>
              <p className="text-text/60">Click "New Session" to schedule your first live session.</p>
            </div>
          ) : (
            <>
              {/* Upcoming Sessions */}
              <div>
                <h3 className="text-lg font-bold text-text mb-3">Upcoming Sessions</h3>
                <div className="space-y-4">
                  {sessions.filter(s => new Date(s.scheduled_at) >= new Date()).length === 0 && (
                    <div className="text-sm text-text/50 p-4 border rounded-xl bg-gray-50 text-center">No upcoming sessions.</div>
                  )}
                  {sessions.filter(s => new Date(s.scheduled_at) >= new Date()).map(session => {
                    const enrollments = session.live_session_enrollments || [];
                    const isPast = false;
            return (
              <div key={session.id} className={`bg-white rounded-2xl border shadow-sm p-6 ${isPast ? "border-gray-100 opacity-60" : "border-gray-200"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${isPast ? "bg-gray-100 text-gray-400" : "bg-primary/10 text-primary"}`}><Video className="w-6 h-6" /></div>
                    <div>
                      <h3 className="font-bold text-lg text-text">{session.title}</h3>
                      {session.courses?.title && <p className="text-xs text-text/40">{session.courses.title}</p>}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-sm text-text/60 flex items-center gap-1"><Calendar className="w-4 h-4" />{fmt(session.scheduled_at)}</span>
                        <span className="text-sm text-text/60 flex items-center gap-1"><Clock className="w-4 h-4" />{fmtTime(session.scheduled_at)} · {session.duration_minutes}min</span>
                        <span className="text-sm text-text/60 flex items-center gap-1"><Users className="w-4 h-4" />{enrollments.length} invited</span>
                        
                        <div className="flex items-center gap-2 mt-1 w-full">
                          <Link2 className="w-4 h-4 text-text/40" />
                          {editUrlId === session.id && editUrlType === "meeting_url" ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input 
                                type="url" 
                                value={editUrlValue} 
                                onChange={e => setEditUrlValue(e.target.value)} 
                                className="flex-1 px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none" 
                                placeholder="https://zoom.us/j/..." 
                                autoFocus
                              />
                              <button onClick={() => handleUpdateUrl(session.id, "meeting_url")} disabled={updatingUrl} className="text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90">
                                {updatingUrl ? "Saving..." : "Save"}
                              </button>
                              <button onClick={() => setEditUrlId(null)} className="text-xs text-text/60 hover:text-text px-2 py-1.5">Cancel</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              {session.meeting_url ? (
                                <a href={session.meeting_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline max-w-[200px] truncate">{session.meeting_url}</a>
                              ) : (
                                <span className="text-sm text-text/40 italic">No meeting link set</span>
                              )}
                              <button onClick={() => { setEditUrlId(session.id); setEditUrlType("meeting_url"); setEditUrlValue(session.meeting_url || ""); }} className="text-xs text-blue-600 hover:underline">Edit Link</button>
                            </div>
                          )}
                        </div>
                      </div>
                      {enrollments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {enrollments.map((e: any) => {
                            const colors: Record<string,string> = { accepted: "bg-green-100 text-green-700", declined: "bg-red-100 text-red-600", invited: "bg-yellow-100 text-yellow-700" };
                            return (
                              <span key={e.id} className={`text-xs px-2 py-1 rounded-lg ${colors[e.status] || "bg-gray-100 text-text/70"}`}>
                                {e.profiles?.full_name || "Student"} · {e.status}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isPast && <button onClick={() => { setShowInvite(showInvite === session.id ? null : session.id); setSelectedStudents([]); }}
                      className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-medium text-sm hover:bg-blue-100"><Send className="w-4 h-4" />Invite</button>}
                    <button onClick={() => handleDelete(session.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>

                {showInvite === session.id && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm text-text">Invite Students</h4>
                      <button onClick={selectAllStudents} className="text-xs text-primary font-medium hover:underline">{selectedStudents.length === students.length ? "Deselect All" : "Select All"}</button>
                    </div>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 mb-4 max-h-48 overflow-y-auto">
                      {students.map(student => {
                        const enrolled = enrollments.some((e: any) => e.student_id === student.id);
                        const sel = selectedStudents.includes(student.id);
                        return (
                          <button key={student.id} onClick={() => !enrolled && toggleStudent(student.id)} disabled={enrolled}
                            className={`text-left px-3 py-2 rounded-lg text-sm border transition-colors ${enrolled ? "bg-green-50 border-green-200 text-green-600" : sel ? "bg-primary/10 border-primary text-primary" : "bg-gray-50 border-gray-200 text-text hover:border-primary/50"}`}>
                            <div className="font-medium truncate">{enrolled && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}{student.full_name || "Unnamed"}</div>
                            <div className="text-xs opacity-60 truncate">{student.email}</div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => { setShowInvite(null); setSelectedStudents([]); }} className="px-4 py-2 text-sm font-medium text-text/60 hover:bg-gray-100 rounded-lg">Cancel</button>
                      <button onClick={() => handleInvite(session.id)} disabled={selectedStudents.length === 0 || inviting}
                        className="flex items-center gap-1.5 bg-primary text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50">
                        {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Invite {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ""}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

            {/* Past Sessions (History) */}
            {sessions.filter(s => new Date(s.scheduled_at) < new Date()).length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" /> Session History
                </h3>
                <div className="space-y-4">
                  {sessions.filter(s => new Date(s.scheduled_at) < new Date()).map(session => {
                    const enrollments = session.live_session_enrollments || [];
                    const isPast = true;
                    return (
                      <div key={session.id} className="bg-white rounded-2xl border shadow-sm p-6 border-gray-100 opacity-60">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-gray-100 text-gray-400"><Video className="w-6 h-6" /></div>
                            <div>
                              <h3 className="font-bold text-lg text-text">{session.title}</h3>
                              {session.courses?.title && <p className="text-xs text-text/40">{session.courses.title}</p>}
                              <div className="flex items-center gap-4 mt-2 flex-wrap">
                                <span className="text-sm text-text/60 flex items-center gap-1"><Calendar className="w-4 h-4" />{fmt(session.scheduled_at)}</span>
                                <span className="text-sm text-text/60 flex items-center gap-1"><Clock className="w-4 h-4" />{fmtTime(session.scheduled_at)} · {session.duration_minutes}min</span>
                                <span className="text-sm text-text/60 flex items-center gap-1"><Users className="w-4 h-4" />{enrollments.length} invited</span>
                                
                                <div className="flex items-center gap-2 mt-1 w-full">
                                  <Video className="w-4 h-4 text-text/40" />
                                  {editUrlId === session.id && editUrlType === "recording_url" ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <input 
                                        type="url" 
                                        value={editUrlValue} 
                                        onChange={e => setEditUrlValue(e.target.value)} 
                                        className="flex-1 px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none" 
                                        placeholder="https://.../recording.mp4" 
                                        autoFocus
                                      />
                                      <button onClick={() => handleUpdateUrl(session.id, "recording_url")} disabled={updatingUrl} className="text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90">
                                        {updatingUrl ? "Saving..." : "Save"}
                                      </button>
                                      <button onClick={() => setEditUrlId(null)} className="text-xs text-text/60 hover:text-text px-2 py-1.5">Cancel</button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      {session.recording_url ? (
                                        <a href={session.recording_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline max-w-[200px] truncate">View Recording</a>
                                      ) : (
                                        <span className="text-sm text-text/40 italic">No recording uploaded</span>
                                      )}
                                      <button onClick={() => { setEditUrlId(session.id); setEditUrlType("recording_url"); setEditUrlValue(session.recording_url || ""); }} className="text-xs text-blue-600 hover:underline">Add Recording Link</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleDelete(session.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>)}
        </div>
      </>)}

      {/* ===== SCHEDULE TAB ===== */}
      {activeTab === "schedule" && (<>
        {showAddSlot && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
            <h3 className="font-bold text-text mb-4">Add Availability Slot</h3>
            <div className="grid md:grid-cols-5 gap-4">
              <div><label className="block text-sm font-medium text-text mb-1.5">Day</label>
                <select value={slotForm.day_of_week} onChange={e => setSlotForm(p => ({...p, day_of_week: parseInt(e.target.value)}))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-text mb-1.5">Date *</label>
                <input type="date" value={slotForm.slot_date} onChange={e => {
                  const val = e.target.value;
                  if (val) {
                    const d = new Date(val);
                    setSlotForm(p => ({...p, slot_date: val, day_of_week: d.getDay()}));
                  } else {
                    setSlotForm(p => ({...p, slot_date: val}));
                  }
                }} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" /></div>
              <div><label className="block text-sm font-medium text-text mb-1.5">Start</label>
                <input type="time" value={slotForm.start_time} onChange={e => setSlotForm(p => ({...p, start_time: e.target.value}))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" /></div>
              <div><label className="block text-sm font-medium text-text mb-1.5">End</label>
                <input type="time" value={slotForm.end_time} onChange={e => setSlotForm(p => ({...p, end_time: e.target.value}))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" /></div>
              <div><label className="block text-sm font-medium text-text mb-1.5">Duration (min)</label>
                <input type="number" value={slotForm.duration_minutes} onChange={e => setSlotForm(p => ({...p, duration_minutes: parseInt(e.target.value)||60}))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" /></div>
              <div><label className="block text-sm font-medium text-text mb-1.5">Price (£)</label>
                <input type="number" step="0.01" value={slotForm.price} onChange={e => setSlotForm(p => ({...p, price: parseFloat(e.target.value)||0}))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowAddSlot(false)} className="px-5 py-2.5 rounded-xl font-medium text-text/60 hover:bg-gray-100">Cancel</button>
              <button onClick={handleAddSlot} disabled={addingSlot} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-60">
                {addingSlot ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add Slot"}
              </button>
            </div>
          </div>
        )}

        {slots.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-bold text-text mb-2">No schedule set</h3>
            <p className="text-text/60">Add availability slots so students can book sessions.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-text mb-3">Active / Upcoming Slots</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slots.filter(s => !s.slot_date || new Date(s.slot_date).setHours(23,59,59,999) >= Date.now()).length === 0 && (
                  <div className="col-span-full text-sm text-text/50 p-4 border rounded-xl bg-gray-50 text-center">No upcoming slots.</div>
                )}
                {slots.filter(s => !s.slot_date || new Date(s.slot_date).setHours(23,59,59,999) >= Date.now()).map(slot => (
                  <div key={slot.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-text">{DAYS[slot.day_of_week]}</span>
                      <button onClick={() => handleDeleteSlot(slot.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-red-400 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {slot.slot_date && <div className="flex items-center gap-2 text-sm text-primary font-medium mb-1"><Calendar className="w-3.5 h-3.5" />{new Date(slot.slot_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>}
                    <div className="flex items-center gap-2 text-sm text-text/60"><Clock className="w-4 h-4" />{fmtT(slot.start_time)} – {fmtT(slot.end_time)}</div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs text-text/40">{slot.duration_minutes} min per session</div>
                      {slot.price > 0 ? (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">£{slot.price}</span>
                      ) : (
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">FREE</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${slot.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>{slot.is_active ? "Active" : "Inactive"}</span>
                      {slot.is_booked && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Booked</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {slots.filter(s => s.slot_date && new Date(s.slot_date).setHours(23,59,59,999) < Date.now()).length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" /> Past Slots (History)
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slots.filter(s => s.slot_date && new Date(s.slot_date).setHours(23,59,59,999) < Date.now()).map(slot => (
                    <div key={slot.id} className="bg-white rounded-2xl border border-gray-100 opacity-60 p-5 shadow-sm group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-text">{DAYS[slot.day_of_week]}</span>
                        <button onClick={() => handleDeleteSlot(slot.id)} className="p-1 rounded-lg text-red-400 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      {slot.slot_date && <div className="flex items-center gap-2 text-sm text-text font-medium mb-1"><Calendar className="w-3.5 h-3.5" />{new Date(slot.slot_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>}
                      <div className="flex items-center gap-2 text-sm text-text/60"><Clock className="w-4 h-4" />{fmtT(slot.start_time)} – {fmtT(slot.end_time)}</div>
                      <div className="text-xs text-text/40 mt-1">{slot.duration_minutes} min per session</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </>)}

      {/* ===== REQUESTS TAB ===== */}
      {activeTab === "requests" && (
        <div className="space-y-3">
          {bookingRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-bold text-text mb-2">No booking requests</h3>
              <p className="text-text/60">When students request bookings, they&apos;ll appear here.</p>
            </div>
          ) : bookingRequests.map(req => {
            const slot = req.admin_availability_slots;
            const student = req.profiles;
            const isPending = req.status === "pending";
            const colors: Record<string,string> = { pending: "border-yellow-200 bg-yellow-50/30", approved: "border-green-200 bg-green-50/30", rejected: "border-red-200 bg-red-50/30" };
            const badges: Record<string,string> = { pending: "bg-yellow-100 text-yellow-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-600" };
            return (
              <div key={req.id} className={`bg-white rounded-2xl border-2 shadow-sm p-5 ${colors[req.status] || ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-accent/10 p-3 rounded-xl"><CalendarPlus className="w-5 h-5 text-accent" /></div>
                    <div>
                      <div className="font-bold text-text">{student?.full_name || student?.email || "Student"}</div>
                      <div className="text-sm text-text/60">{slot ? `${DAYS[slot.day_of_week]} · ${fmtT(slot.start_time)} – ${fmtT(slot.end_time)}` : "N/A"}</div>
                      <div className="text-xs text-text/40">Date: {new Date(req.requested_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                      {req.notes && <div className="text-xs text-text/50 mt-1 italic">&quot;{req.notes}&quot;</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPending ? (<>
                      <button onClick={() => handleBookingResponse(req.id, "rejected")} disabled={respondingId === req.id}
                        className="px-4 py-2 rounded-xl font-semibold text-sm border-2 border-gray-200 text-text/60 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50">Reject</button>
                      <button onClick={() => handleBookingResponse(req.id, "approved")} disabled={respondingId === req.id}
                        className="flex items-center gap-1.5 bg-primary text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/20">
                        {respondingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Approve
                      </button>
                    </>) : (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${badges[req.status] || ""}`}>{req.status}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

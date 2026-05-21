"use client";

import { useState, useEffect } from "react";
import { Clock, Bell, BellOff, Plus, Trash2, CalendarDays, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Reminder = {
  id: string;
  title: string | null;
  day: string | null;
  date: string | null;
  reminder_time: string;
  is_active: boolean;
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: "",
    type: "weekly" as "weekly" | "one-time",
    day: "Monday",
    date: "",
    time: "16:00",
  });

  const days = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  ];

  useEffect(() => {
    const fetchReminders = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("student_id", session.user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setReminders(data);
      }
      setIsLoading(false);
    };

    fetchReminders();
  }, []);

  const toggleReminder = async (id: string, currentStatus: boolean) => {
    // Optimistic UI update
    setReminders(prev =>
      prev.map(r => (r.id === id ? { ...r, is_active: !currentStatus } : r))
    );

    const { error } = await supabase
      .from("reminders")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      console.error("Error toggling reminder:", error);
      // Revert if error
      setReminders(prev =>
        prev.map(r => (r.id === id ? { ...r, is_active: currentStatus } : r))
      );
    }
  };

  const deleteReminder = async (id: string) => {
    // Optimistic UI update
    const previousReminders = [...reminders];
    setReminders(prev => prev.filter(r => r.id !== id));

    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting reminder:", error);
      // Revert if error
      setReminders(previousReminders);
    }
  };

  const addReminder = async () => {
    if (!newReminder.title.trim()) return;
    
    const isWeekly = newReminder.type === "weekly";
    if (!isWeekly && !newReminder.date) {
      alert("Please select a date for the one-time reminder.");
      return;
    }

    setIsSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setIsSaving(false);
      return;
    }

    const dayValue = isWeekly ? newReminder.day : null;
    const dateValue = isWeekly ? null : newReminder.date;
    const daysOfWeekValue = isWeekly ? [newReminder.day] : [];

    const { data, error } = await supabase
      .from("reminders")
      .insert({
        student_id: session.user.id,
        title: newReminder.title,
        day: dayValue,
        date: dateValue,
        reminder_time: newReminder.time,
        days_of_week: daysOfWeekValue,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding reminder:", error);
      alert("Failed to add reminder. Error: " + error.message);
    } else if (data) {
      setReminders(prev => [data, ...prev]);
      setNewReminder({
        title: "",
        type: "weekly",
        day: "Monday",
        date: "",
        time: "16:00",
      });
      setShowAddForm(false);
    }

    setIsSaving(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-");
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">Study Reminders</h1>
          <p className="text-text/60 text-sm">
            Set study reminders to stay on track.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Add Reminder
        </button>
      </div>

      {/* Add Reminder Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-md animate-in slide-in-from-top-2 duration-200">
          <h3 className="font-bold text-text text-lg mb-4">New Study Reminder</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">
                What should we remind you about?
              </label>
              <input
                type="text"
                value={newReminder.title}
                onChange={(e) =>
                  setNewReminder((p) => ({ ...p, title: e.target.value }))
                }
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="e.g. Study Chapter 4 — Quadratics"
              />
            </div>

            {/* Reminder Type Selector */}
            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">
                Reminder Frequency
              </label>
              <div className="flex gap-2 p-1 bg-gray-50 border border-gray-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewReminder(p => ({ ...p, type: "weekly" }))}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                    newReminder.type === "weekly"
                      ? "bg-white text-emerald-600 shadow-sm border border-gray-100"
                      : "text-text/60 hover:text-text hover:bg-gray-100/50"
                  }`}
                >
                  Weekly (Recurring)
                </button>
                <button
                  type="button"
                  onClick={() => setNewReminder(p => ({ ...p, type: "one-time" }))}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${
                    newReminder.type === "one-time"
                      ? "bg-white text-orange-600 shadow-sm border border-gray-100"
                      : "text-text/60 hover:text-text hover:bg-gray-100/50"
                  }`}
                >
                  Specific Date (One-time)
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              {newReminder.type === "weekly" ? (
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-text mb-1.5">
                    Day of the Week
                  </label>
                  <select
                    value={newReminder.day}
                    onChange={(e) =>
                      setNewReminder((p) => ({ ...p, day: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-text mb-1.5">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={newReminder.date}
                    onChange={(e) =>
                      setNewReminder((p) => ({ ...p, date: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              )}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-text mb-1.5">
                  Time
                </label>
                <input
                  type="time"
                  value={newReminder.time}
                  onChange={(e) =>
                    setNewReminder((p) => ({ ...p, time: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-text/60 hover:bg-gray-100 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={addReminder}
                disabled={isSaving}
                className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminders List */}
      <div className="space-y-3">
        {reminders.map((reminder) => {
          const isWeekly = !reminder.date;
          return (
            <div
              key={reminder.id}
              className={`bg-white rounded-2xl border p-5 flex items-center gap-4 transition-all ${
                reminder.is_active
                  ? "border-gray-200 shadow-sm hover:border-gray-300"
                  : "border-gray-100 opacity-50"
              }`}
            >
              <div
                className={`p-2.5 rounded-xl flex-shrink-0 ${
                  reminder.is_active
                    ? isWeekly
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-orange-50 text-orange-500"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className={`font-semibold text-text ${
                    reminder.is_active ? "" : "text-text/40 line-through"
                  }`}
                >
                  {reminder.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                  <span className="text-xs flex items-center gap-1 font-medium">
                    <CalendarDays className="w-3.5 h-3.5 text-text/40" />
                    {reminder.date ? (
                      <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full text-[11px] font-bold border border-orange-100">
                        {formatDate(reminder.date)} (One-time)
                      </span>
                    ) : (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-bold border border-emerald-100">
                        Every {reminder.day}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-text/50 flex items-center gap-1 font-medium bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-text/40" />
                    {reminder.reminder_time.substring(0, 5)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleReminder(reminder.id, reminder.is_active)}
                  className={`p-2 rounded-lg transition-colors ${
                    reminder.is_active
                      ? "text-primary hover:bg-primary/10"
                      : "text-gray-400 hover:bg-gray-100"
                  }`}
                  title={reminder.is_active ? "Disable" : "Enable"}
                >
                  {reminder.is_active ? (
                    <Bell className="w-5 h-5" />
                  ) : (
                    <BellOff className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => deleteReminder(reminder.id)}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {reminders.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text mb-2">No reminders set</h3>
          <p className="text-text/60 mb-6">
            Create a study reminder to stay consistent.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            Add Your First Reminder
          </button>
        </div>
      )}
    </div>
  );
}

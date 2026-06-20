"use client";

import { useState, useEffect, useRef } from "react";
import { User, Mail, Phone, Camera, Save, Loader2, CheckCircle2, Hash } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    parent_email: "",
    parent_whatsapp: "",
    avatar_url: "",
    student_code: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Get profile from profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || session.user.email || "",
          parent_email: data.parent_email || "",
          parent_whatsapp: data.parent_whatsapp || "",
          avatar_url: data.avatar_url || "",
          student_code: data.student_code || "",
        });
      } else {
        // Profile doesn't exist yet, use auth data
        setProfile(prev => ({
          ...prev,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name || "",
        }));
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: session.user.id,
        full_name: profile.full_name,
        email: profile.email,
        parent_email: profile.parent_email,
        parent_whatsapp: profile.parent_whatsapp,
        avatar_url: profile.avatar_url,
      });

    if (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile: " + error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }

    setIsSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${session.user.id}/avatar.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (error) {
      console.error("Upload error:", error);
      // If storage bucket doesn't exist, use a data URL fallback
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, avatar_url: reader.result as string }));
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
    setUploadingAvatar(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">My Profile</h1>
        <p className="text-text/60 text-sm">Manage your account information.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Avatar Section */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-white shadow-md overflow-hidden flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-gray-300" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">
              {profile.full_name || "Student"}
            </h2>
            <p className="text-text/60 text-sm">{profile.email}</p>
            {profile.student_code && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{profile.student_code}</span>
                <span className="text-[10px] text-text/40">Your student code</span>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="p-5 md:p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, full_name: e.target.value }))
                }
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full pl-12 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-text/50 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-text/40 mt-1">
              Email cannot be changed here.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-lg font-bold text-text mb-4">
              Parent / Guardian Info
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Parent Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={profile.parent_email}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        parent_email: e.target.value,
                      }))
                    }
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="parent@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Parent WhatsApp Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={profile.parent_whatsapp}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        parent_whatsapp: e.target.value,
                      }))
                    }
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="+20 1xx xxx xxxx"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            {saved && (
              <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium animate-fade-in">
                <CheckCircle2 className="w-4 h-4" /> Saved successfully
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

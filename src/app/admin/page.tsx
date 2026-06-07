"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert, Settings, Heart, Image, MessageSquare,
  Phone, Trash2, Save, Plus, X, Upload, LogOut, Video,
  MapPin, Calendar, Clock, Link2, ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAllSettings, upsertMultipleSettings } from "@/lib/settings";
import { uploadFile, deleteFile } from "@/lib/storage";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";

// ============================================================
// TYPES
// ============================================================
type Message = {
  id: string | number;
  sender_name: string;
  initial: string;
  color: string;
  content: string;
  created_at?: string;
};

type MediaItem = {
  url: string;
  type: "photo" | "video";
  caption: string;
};

type InitialChat = {
  sender_name: string;
  content: string;
  color: string;
  initial: string;
};

type TabId = "general" | "couple" | "media" | "chats" | "contact" | "messages";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "Pengaturan Umum", icon: <Settings className="w-5 h-5" /> },
  { id: "couple", label: "Info Pasangan & Acara", icon: <Heart className="w-5 h-5" /> },
  { id: "media", label: "Media", icon: <Image className="w-5 h-5" /> },
  { id: "chats", label: "Chat Awal", icon: <MessageSquare className="w-5 h-5" /> },
  { id: "contact", label: "Kontak", icon: <Phone className="w-5 h-5" /> },
  { id: "messages", label: "Kelola Pesan", icon: <Trash2 className="w-5 h-5" /> },
];

const AVATAR_COLORS = [
  { label: "Hijau", value: "bg-green-500" },
  { label: "Biru", value: "bg-blue-500" },
  { label: "Merah", value: "bg-red-500" },
  { label: "Kuning", value: "bg-yellow-500" },
  { label: "Ungu", value: "bg-purple-500" },
  { label: "Pink", value: "bg-pink-500" },
  { label: "Orange", value: "bg-orange-500" },
  { label: "Teal", value: "bg-teal-500" },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdminDashboard() {
  // ---- Auth State ----
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Settings State ----
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ---- Messages State ----
  const [messages, setMessages] = useState<Message[]>([]);

  // ---- Media State ----
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Initial Chats State ----
  const [newChat, setNewChat] = useState<InitialChat>({
    sender_name: "",
    content: "",
    color: "bg-green-500",
    initial: "",
  });

  // ---- Cropper State ----
  const [photoToCrop, setPhotoToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === "admin" && loginPassword === "admin123") {
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Username atau password salah!");
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleProfilePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setPhotoToCrop(imageUrl);
    }
  };

  const handleCropSave = async () => {
    if (!photoToCrop || !croppedAreaPixels) return;
    
    setIsCropping(true);
    try {
      const croppedImageFile = await getCroppedImg(photoToCrop, croppedAreaPixels);
      if (!croppedImageFile) throw new Error("Gagal memotong gambar");

      const uploadedUrl = await uploadFile(croppedImageFile, "photos");
      if (uploadedUrl) {
        updateSetting("group_photo", uploadedUrl);
        showToast("Foto profil berhasil di-crop dan disiapkan!", "success");
      } else {
        showToast("Gagal mengupload foto hasil crop.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Terjadi kesalahan saat memotong foto.", "error");
    }
    setIsCropping(false);
    setPhotoToCrop(null);
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load all settings & messages on auth
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      const s = await getAllSettings();
      setSettings(s);

      const { data } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };
    loadData();

    // Real-time messages
    const channel = supabase
      .channel("admin_messages_rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const m = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((msg) => msg.id === m.id)) return prev;
              return [...prev, m];
            });
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async (keys: string[]) => {
    setSaving(true);
    const subset: Record<string, string> = {};
    keys.forEach((k) => {
      subset[k] = settings[k] || "";
    });
    const ok = await upsertMultipleSettings(subset);
    setSaving(false);
    if (ok) {
      showToast("Pengaturan berhasil disimpan!", "success");
    } else {
      showToast("Gagal menyimpan pengaturan.", "error");
    }
  };

  const handleDeleteMessage = async (id: string | number) => {
    if (!confirm("Yakin ingin menghapus pesan ini?")) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) {
      showToast("Gagal menghapus pesan: " + error.message, "error");
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
      if (data) setMessages(data);
    } else {
      showToast("Pesan berhasil dihapus", "success");
    }
  };

  // ---- Media handlers ----
  const getMediaItems = (): MediaItem[] => {
    try {
      return JSON.parse(settings.media_gallery || "[]");
    } catch {
      return [];
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      showToast("Hanya file gambar atau video yang diizinkan.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran file maksimal 5MB.", "error");
      return;
    }

    setUploading(true);
    const url = await uploadFile(file, isVideo ? "videos" : "photos");
    setUploading(false);

    if (!url) {
      showToast("Gagal mengupload file. Pastikan bucket 'media' sudah dibuat di Supabase Storage.", "error");
      return;
    }

    const items = getMediaItems();
    items.push({ url, type: isVideo ? "video" : "photo", caption: file.name });
    const newVal = JSON.stringify(items);
    updateSetting("media_gallery", newVal);
    await upsertMultipleSettings({ media_gallery: newVal });
    showToast("File berhasil diupload!", "success");

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteMedia = async (index: number) => {
    const items = getMediaItems();
    const item = items[index];
    if (!item) return;

    await deleteFile(item.url);
    items.splice(index, 1);
    const newVal = JSON.stringify(items);
    updateSetting("media_gallery", newVal);
    await upsertMultipleSettings({ media_gallery: newVal });
    showToast("Media berhasil dihapus", "success");
  };

  // ---- Initial Chats handlers ----
  const getInitialChats = (): InitialChat[] => {
    try {
      return JSON.parse(settings.initial_chats || "[]");
    } catch {
      return [];
    }
  };

  const handleAddChat = async () => {
    if (!newChat.sender_name.trim() || !newChat.content.trim()) {
      showToast("Nama pengirim dan isi pesan harus diisi.", "error");
      return;
    }
    const chats = getInitialChats();
    chats.push({
      ...newChat,
      initial: newChat.sender_name.charAt(0).toUpperCase(),
    });
    const newVal = JSON.stringify(chats);
    updateSetting("initial_chats", newVal);
    await upsertMultipleSettings({ initial_chats: newVal });
    setNewChat({ sender_name: "", content: "", color: "bg-green-500", initial: "" });
    showToast("Chat awal berhasil ditambahkan!", "success");
  };

  const handleDeleteChat = async (index: number) => {
    const chats = getInitialChats();
    chats.splice(index, 1);
    const newVal = JSON.stringify(chats);
    updateSetting("initial_chats", newVal);
    await upsertMultipleSettings({ initial_chats: newVal });
    showToast("Chat awal berhasil dihapus", "success");
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  // ============================================================
  // RENDER: LOGIN
  // ============================================================
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans">
        <div className="w-full max-w-sm mx-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <ShieldAlert className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white mb-2">Admin Login</h2>
            <p className="text-center text-slate-400 text-sm mb-6">Masuk untuk mengelola undangan digital</p>

            {loginError && (
              <div className="mb-4 p-3 bg-red-500/20 text-red-300 rounded-lg text-sm text-center font-medium border border-red-500/30">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition placeholder-slate-500"
                  placeholder="Masukkan username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition placeholder-slate-500"
                  placeholder="Masukkan password"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-500/25 transition duration-200"
              >
                Masuk ke Dashboard
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: DASHBOARD
  // ============================================================
  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      {/* CROPPER MODAL */}
      {photoToCrop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col h-[500px]">
            <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Crop Foto Profil (1:1)</h3>
              <button onClick={() => setPhotoToCrop(null)} className="p-1 hover:bg-slate-200 rounded-full transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 relative bg-slate-900">
              <Cropper
                image={photoToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="p-4 border-t bg-slate-50">
              <label className="text-xs font-semibold text-slate-500 mb-2 block">Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full mb-4 accent-blue-600"
              />
              <button
                onClick={handleCropSave}
                disabled={isCropping}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isCropping ? "Memproses..." : <><Save className="w-4 h-4"/> Simpan Foto</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${
            toast.type === "success"
              ? "bg-green-500 shadow-green-500/25"
              : "bg-red-500 shadow-red-500/25"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm">Admin Panel</h1>
              <p className="text-xs text-slate-400">Undangan Digital</p>
            </div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={() => setIsAuthenticated(false)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar (mobile) */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="font-bold text-slate-800">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h2>
        </div>

        <div className="p-4 md:p-8 max-w-4xl">
          {/* Page Title */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-slate-800">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {activeTab === "general" && "Atur nama grup, foto profil, dan subtitle undangan."}
              {activeTab === "couple" && "Atur informasi mempelai dan detail acara."}
              {activeTab === "media" && "Upload foto & video untuk galeri undangan."}
              {activeTab === "chats" && "Tambah pesan awal yang muncul otomatis di chat."}
              {activeTab === "contact" && "Atur link video call dan nomor telepon."}
              {activeTab === "messages" && "Lihat dan hapus pesan dari tamu."}
            </p>
          </div>

          {/* ===================== TAB: PENGATURAN UMUM ===================== */}
          {activeTab === "general" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
              <FormField label="Nama Grup Chat" icon={<MessageSquare className="w-4 h-4" />}>
                <input
                  type="text"
                  value={settings.group_name || ""}
                  onChange={(e) => updateSetting("group_name", e.target.value)}
                  className="form-input"
                  placeholder="Contoh: Grup Hajatan 🕊️"
                />
              </FormField>
              <FormField label="Subtitle" icon={<Settings className="w-4 h-4" />}>
                <input
                  type="text"
                  value={settings.group_subtitle || ""}
                  onChange={(e) => updateSetting("group_subtitle", e.target.value)}
                  className="form-input"
                  placeholder="Contoh: Afrizal, Jubed, Admin Persib,..."
                />
              </FormField>
              <FormField label="URL Foto Profil Grup" icon={<Image className="w-4 h-4" />}>
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={settings.group_photo || ""}
                    onChange={(e) => updateSetting("group_photo", e.target.value)}
                    className="form-input"
                    placeholder="https://contoh.com/foto.jpg"
                  />
                  
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 font-medium">ATAU</span>
                    <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition cursor-pointer border border-slate-300">
                      <Upload className="w-4 h-4" />
                      Upload & Crop Foto (1:1)
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleProfilePhotoSelect}
                      />
                    </label>
                  </div>
                </div>

                {settings.group_photo && (
                  <div className="mt-4">
                    <img src={settings.group_photo} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" />
                  </div>
                )}
              </FormField>
              <SaveButton saving={saving} onClick={() => saveSettings(["group_name", "group_subtitle", "group_photo"])} />
            </div>
          )}

          {/* ===================== TAB: INFO PASANGAN & ACARA ===================== */}
          {activeTab === "couple" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
                <h3 className="font-semibold text-slate-700 text-lg">👤 Info Mempelai</h3>
                <FormField label="Nama Mempelai Pria" icon={<Heart className="w-4 h-4" />}>
                  <input
                    type="text"
                    value={settings.groom_name || ""}
                    onChange={(e) => updateSetting("groom_name", e.target.value)}
                    className="form-input"
                    placeholder="Contoh: Ahmad Fadilah"
                  />
                </FormField>
                <FormField label="Nama Mempelai Wanita" icon={<Heart className="w-4 h-4" />}>
                  <input
                    type="text"
                    value={settings.bride_name || ""}
                    onChange={(e) => updateSetting("bride_name", e.target.value)}
                    className="form-input"
                    placeholder="Contoh: Siti Aisyah"
                  />
                </FormField>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
                <h3 className="font-semibold text-slate-700 text-lg">📅 Detail Acara</h3>
                <FormField label="Tanggal Acara" icon={<Calendar className="w-4 h-4" />}>
                  <input
                    type="date"
                    value={settings.event_date || ""}
                    onChange={(e) => updateSetting("event_date", e.target.value)}
                    className="form-input"
                  />
                </FormField>
                <FormField label="Waktu Acara" icon={<Clock className="w-4 h-4" />}>
                  <input
                    type="text"
                    value={settings.event_time || ""}
                    onChange={(e) => updateSetting("event_time", e.target.value)}
                    className="form-input"
                    placeholder="Contoh: 08:00 - 12:00 WIB"
                  />
                </FormField>
                <FormField label="Lokasi Acara" icon={<MapPin className="w-4 h-4" />}>
                  <input
                    type="text"
                    value={settings.event_location || ""}
                    onChange={(e) => updateSetting("event_location", e.target.value)}
                    className="form-input"
                    placeholder="Contoh: Gedung Serbaguna, Jl. Mawar No. 5"
                  />
                </FormField>
                <FormField label="Link Google Maps" icon={<Link2 className="w-4 h-4" />}>
                  <input
                    type="text"
                    value={settings.maps_link || ""}
                    onChange={(e) => updateSetting("maps_link", e.target.value)}
                    className="form-input"
                    placeholder="https://maps.google.com/..."
                  />
                </FormField>
              </div>

              <SaveButton
                saving={saving}
                onClick={() =>
                  saveSettings(["groom_name", "bride_name", "event_date", "event_time", "event_location", "maps_link"])
                }
              />
            </div>
          )}

          {/* ===================== TAB: MEDIA ===================== */}
          {activeTab === "media" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-700 text-lg mb-4">📤 Upload Media</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Upload foto atau video (maks 5MB). Pastikan bucket <strong>&quot;media&quot;</strong> sudah dibuat di Supabase Storage dan di-set <strong>Public</strong>.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="media-upload"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Mengupload..." : "Pilih File"}
                  </button>
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-700 text-lg mb-4">🖼️ Galeri ({getMediaItems().length} file)</h3>
                {getMediaItems().length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Image className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>Belum ada media yang diupload.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {getMediaItems().map((item, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-50">
                        {item.type === "photo" ? (
                          <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
                        ) : (
                          <video src={item.url} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                          <button
                            onClick={() => handleDeleteMedia(idx)}
                            className="p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <span className="text-white text-xs truncate block">{item.type === "video" ? "🎥 " : "📷 "}{item.caption}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB: CHAT AWAL ===================== */}
          {activeTab === "chats" && (
            <div className="space-y-6">
              {/* Add New Chat Form */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                <h3 className="font-semibold text-slate-700 text-lg">➕ Tambah Chat Awal</h3>
                <p className="text-sm text-slate-500">
                  Pesan-pesan ini akan muncul otomatis di chat sebelum pesan tamu yang sebenarnya.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Nama Pengirim" icon={null}>
                    <input
                      type="text"
                      value={newChat.sender_name}
                      onChange={(e) => setNewChat({ ...newChat, sender_name: e.target.value })}
                      className="form-input"
                      placeholder="Contoh: Ayah Mempelai"
                    />
                  </FormField>
                  <FormField label="Warna Avatar" icon={null}>
                    <select
                      value={newChat.color}
                      onChange={(e) => setNewChat({ ...newChat, color: e.target.value })}
                      className="form-input"
                    >
                      {AVATAR_COLORS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <FormField label="Isi Pesan" icon={null}>
                  <textarea
                    value={newChat.content}
                    onChange={(e) => setNewChat({ ...newChat, content: e.target.value })}
                    className="form-input min-h-[80px] resize-y"
                    placeholder="Contoh: Assalamualaikum, dengan hormat kami mengundang Bapak/Ibu..."
                  />
                </FormField>
                <button
                  onClick={handleAddChat}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Chat
                </button>
              </div>

              {/* List of Initial Chats */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-700 text-lg mb-4">
                  💬 Daftar Chat Awal ({getInitialChats().length})
                </h3>
                {getInitialChats().length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>Belum ada chat awal.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getInitialChats().map((chat, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 ${chat.color}`}>
                          {chat.initial || chat.sender_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800">{chat.sender_name}</p>
                          <p className="text-sm text-slate-600 break-words">{chat.content}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteChat(idx)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB: KONTAK ===================== */}
          {activeTab === "contact" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
              <FormField label="Link Video Call" icon={<Video className="w-4 h-4" />}>
                <input
                  type="text"
                  value={settings.videocall_link || ""}
                  onChange={(e) => updateSetting("videocall_link", e.target.value)}
                  className="form-input"
                  placeholder="Contoh: https://meet.google.com/xxx-xxxx-xxx"
                />
              </FormField>
              <FormField label="Nomor Telepon" icon={<Phone className="w-4 h-4" />}>
                <input
                  type="text"
                  value={settings.phone_number || ""}
                  onChange={(e) => updateSetting("phone_number", e.target.value)}
                  className="form-input"
                  placeholder="Contoh: 6281234567890"
                />
              </FormField>
              <SaveButton saving={saving} onClick={() => saveSettings(["videocall_link", "phone_number"])} />
            </div>
          )}

          {/* ===================== TAB: KELOLA PESAN ===================== */}
          {activeTab === "messages" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-700 text-lg mb-4">
                📨 Pesan Tamu ({messages.length})
              </h3>
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Belum ada pesan dari tamu.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 ${msg.color || "bg-yellow-500"}`}>
                        {msg.initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-slate-800">{msg.sender_name}</p>
                          <span className="text-xs text-slate-400">{formatTime(msg.created_at)}</span>
                        </div>
                        <p className="text-sm text-slate-600 break-words">{msg.content}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* INLINE STYLES */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .form-input {
            width: 100%;
            padding: 0.625rem 0.875rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            color: #1e293b;
            outline: none;
            transition: all 0.2s;
          }
          .form-input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
          }
          .form-input::placeholder {
            color: #94a3b8;
          }
        `,
      }} />
    </div>
  );
}

// ============================================================
// HELPER COMPONENTS
// ============================================================

function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <div className="pt-2">
      <button
        onClick={onClick}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50 shadow-sm"
      >
        <Save className="w-4 h-4" />
        {saving ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>
    </div>
  );
}

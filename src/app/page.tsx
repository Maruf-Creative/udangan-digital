"use client";

import React, { useState, useEffect, useRef } from "react";
import { Video, Phone, MoreVertical, Send, Smile, MapPin, Calendar, Clock, X, ChevronLeft, Image as ImageIcon, Paperclip, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAllSettings } from "@/lib/settings";
import { uploadFile } from "@/lib/storage";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

// Tipe Data Pesan
type Message = {
  id: string | number;
  sender_name: string;
  initial: string;
  color: string;
  content: string;
  created_at?: string;
  isCurrentUser?: boolean;
  image_url?: string;
};

type InitialChat = {
  sender_name: string;
  content: string;
  color: string;
  initial: string;
  image_url?: string;
};

type MediaItem = {
  url: string;
  type: "photo" | "video";
  caption: string;
};

export default function WhatsAppGroupInvitation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [showProfile, setShowProfile] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  // New features state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Load settings & messages
  useEffect(() => {
    let name = localStorage.getItem("whatsapp_guest_name");
    if (!name) {
      name = "Tamu " + Math.floor(Math.random() * 1000);
      localStorage.setItem("whatsapp_guest_name", name);
    }
    setCurrentUserName(name);

    const loadData = async () => {
      // Load settings
      const s = await getAllSettings();
      setSettings(s);

      // Load messages
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Gagal mengambil pesan:", error.message);
      } else if (data) {
        setMessages(data);
      }
    };

    loadData();

    // Real-time listener
    const channel = supabase
      .channel("messages_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMessage = payload.new as Message;
            setMessages((prev) => [...prev, newMessage]);
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parsed settings helpers
  const groupName = settings.group_name || "Grup Hajatan 🕊️";
  const groupSubtitle = settings.group_subtitle || "Ketuk untuk info grup";
  const groupPhoto = settings.group_photo || "https://api.dicebear.com/7.x/initials/svg?seed=Hajatan";
  const groomName = settings.groom_name || "";
  const brideName = settings.bride_name || "";
  const eventDate = settings.event_date || "";
  const eventTime = settings.event_time || "";
  const eventLocation = settings.event_location || "";
  const mapsLink = settings.maps_link || "";
  const videocallLink = settings.videocall_link || "";
  const phoneNumber = settings.phone_number || "";

  const getInitialChats = (): InitialChat[] => {
    try { return JSON.parse(settings.initial_chats || "[]"); } catch { return []; }
  };

  const getMediaItems = (): MediaItem[] => {
    try { return JSON.parse(settings.media_gallery || "[]"); } catch { return []; }
  };

  const allMessages: Message[] = [
    ...getInitialChats().map((chat, idx) => ({
      id: `initial-${idx}`,
      sender_name: chat.sender_name,
      initial: chat.initial || chat.sender_name.charAt(0).toUpperCase(),
      color: chat.color,
      content: chat.content,
      created_at: undefined,
      isCurrentUser: false,
    })),
    ...messages,
  ];

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInputText((prev) => prev + emojiData.emoji);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Hanya file gambar yang diizinkan!");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 5MB!");
      return;
    }

    setIsUploadingPhoto(true);
    const imageUrl = await uploadFile(file, "photos");
    setIsUploadingPhoto(false);

    if (!imageUrl) {
      alert("Gagal mengupload foto. Pastikan pengaturan Supabase Storage sudah benar.");
      return;
    }

    const newMsg = {
      sender_name: currentUserName,
      initial: currentUserName.charAt(0).toUpperCase(),
      color: "bg-green-500",
      content: "📸 Foto", 
      image_url: imageUrl,
    };

    const tempId = Date.now().toString();
    setMessages((prev) => [...prev, { ...newMsg, id: tempId, isCurrentUser: true }]);

    const { error } = await supabase.from("messages").insert([newMsg]);
    if (error) {
      console.error("Gagal mengirim pesan foto:", error.message);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      sender_name: currentUserName,
      initial: currentUserName.charAt(0).toUpperCase(),
      color: "bg-green-500",
      content: inputText,
    };

    const tempId = Date.now().toString();
    setMessages((prev) => [...prev, { ...newMsg, id: tempId, isCurrentUser: true }]);
    setInputText("");
    setShowEmojiPicker(false);

    const { error } = await supabase.from("messages").insert([newMsg]);
    if (error) {
      console.error("Gagal mengirim pesan:", error.message, error.details, error.hint);
      alert(`Gagal mengirim pesan: ${error.message}. (Code: ${error.code})`);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  // ============================================================
  // PROFILE SHEET (Info Grup / Undangan)
  // ============================================================
  const renderProfile = () => {
    const mediaItems = getMediaItems();
    const gold = "#C9A96E";
    const goldLight = "#E8D5A8";

    return (
      <div className="absolute inset-0 z-30 flex flex-col animate-slide-in" style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 30%, #0f3460 100%)" }}>
        {/* Luxury Header */}
        <div className="relative px-4 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.15) 0%, rgba(15,52,96,0.5) 100%)", borderBottom: `1px solid ${gold}33` }}>
          <button onClick={() => setShowProfile(false)} className="p-1.5 rounded-full transition-all hover:scale-110" style={{ background: `${gold}20`, border: `1px solid ${gold}40` }}>
            <ChevronLeft className="w-5 h-5" style={{ color: gold }} />
          </button>
          <h2 className="font-semibold text-base tracking-widest uppercase" style={{ color: goldLight, letterSpacing: "0.15em", fontFamily: "'Georgia', 'Times New Roman', serif" }}>
            Undangan
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Hero Section: Photo + Couple Names */}
          <div className="relative flex flex-col items-center pt-8 pb-6 px-6">
            {/* Ornamental line top */}
            <div className="flex items-center gap-3 mb-5">
              <div style={{ width: 40, height: 1, background: `linear-gradient(90deg, transparent, ${gold})` }} />
              <span style={{ color: gold, fontSize: 18 }}>✦</span>
              <div style={{ width: 40, height: 1, background: `linear-gradient(90deg, ${gold}, transparent)` }} />
            </div>

            {/* Profile Photo with gold ring */}
            <div className="relative mb-4">
              <div className="w-28 h-28 rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, ${gold}, ${goldLight}, ${gold})` }}>
                <div className="w-full h-full rounded-full overflow-hidden border-2" style={{ borderColor: "#1a1a2e" }}>
                  <img src={groupPhoto} alt="Grup" className="w-full h-full object-cover" />
                </div>
              </div>
              {/* Subtle glow */}
              <div className="absolute inset-0 rounded-full opacity-30 blur-xl" style={{ background: gold }} />
            </div>

            {/* Group Name */}
            <h3 className="text-2xl font-bold text-center mb-1" style={{ color: goldLight, fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              {groupName}
            </h3>
            <p className="text-xs tracking-[0.2em] uppercase" style={{ color: `${gold}99` }}>
              {groupSubtitle}
            </p>

            {/* Ornamental divider */}
            <div className="flex items-center gap-2 mt-5">
              <div style={{ width: 50, height: 1, background: `linear-gradient(90deg, transparent, ${gold}66)` }} />
              <div className="w-1.5 h-1.5 rotate-45" style={{ background: gold }} />
              <div style={{ width: 50, height: 1, background: `linear-gradient(90deg, ${gold}66, transparent)` }} />
            </div>
          </div>

          {/* Couple Info Card */}
          {(groomName || brideName) && (
            <div className="mx-4 mb-4 rounded-2xl p-5 text-center" style={{ background: "rgba(201,169,110,0.08)", border: `1px solid ${gold}22`, backdropFilter: "blur(10px)" }}>
              <p className="text-[10px] uppercase tracking-[0.3em] mb-4 font-semibold" style={{ color: `${gold}88` }}>
                Mempelai
              </p>
              <p className="text-xl font-bold mb-1" style={{ color: goldLight, fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                {groomName}
              </p>
              <div className="flex items-center justify-center gap-3 my-2">
                <div style={{ width: 24, height: 1, background: `${gold}66` }} />
                <span className="text-xl" style={{ color: gold, fontFamily: "'Georgia', 'Times New Roman', serif" }}>&</span>
                <div style={{ width: 24, height: 1, background: `${gold}66` }} />
              </div>
              <p className="text-xl font-bold" style={{ color: goldLight, fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                {brideName}
              </p>
            </div>
          )}

          {/* Event Info Card */}
          {(eventDate || eventTime || eventLocation) && (
            <div className="mx-4 mb-4 rounded-2xl p-5" style={{ background: "rgba(201,169,110,0.08)", border: `1px solid ${gold}22` }}>
              <p className="text-[10px] uppercase tracking-[0.3em] mb-4 font-semibold" style={{ color: `${gold}88` }}>
                Detail Acara
              </p>
              <div className="space-y-3">
                {eventDate && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${gold}15`, border: `1px solid ${gold}25` }}>
                      <Calendar className="w-4 h-4" style={{ color: gold }} />
                    </div>
                    <span className="text-sm" style={{ color: "#d4d4d8" }}>{formatDate(eventDate)}</span>
                  </div>
                )}
                {eventTime && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${gold}15`, border: `1px solid ${gold}25` }}>
                      <Clock className="w-4 h-4" style={{ color: gold }} />
                    </div>
                    <span className="text-sm" style={{ color: "#d4d4d8" }}>{eventTime}</span>
                  </div>
                )}
                {eventLocation && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${gold}15`, border: `1px solid ${gold}25` }}>
                      <MapPin className="w-4 h-4" style={{ color: gold }} />
                    </div>
                    <span className="text-sm" style={{ color: "#d4d4d8" }}>{eventLocation}</span>
                  </div>
                )}
                {mapsLink && (
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${gold}, #B8955A)`,
                      color: "#1a1a2e",
                      boxShadow: `0 4px 15px ${gold}33`,
                    }}
                  >
                    <MapPin className="w-4 h-4" />
                    Buka Google Maps
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Media Gallery */}
          {mediaItems.length > 0 && (
            <div className="mx-4 mb-4 rounded-2xl p-5" style={{ background: "rgba(201,169,110,0.08)", border: `1px solid ${gold}22` }}>
              <p className="text-[10px] uppercase tracking-[0.3em] mb-4 font-semibold" style={{ color: `${gold}88` }}>
                Galeri ({mediaItems.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {mediaItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedMedia(item)}
                    className="aspect-square rounded-xl overflow-hidden relative group transition-transform hover:scale-[1.03] active:scale-95"
                    style={{ border: `1px solid ${gold}20` }}
                  >
                    {item.type === "photo" ? (
                      <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "#1a1a2e" }}>
                        <span className="text-2xl">🎥</span>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" style={{ background: `${gold}22` }}>
                      <ImageIcon className="w-5 h-5" style={{ color: goldLight }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact Card */}
          {(videocallLink || phoneNumber) && (
            <div className="mx-4 mb-6 rounded-2xl p-5" style={{ background: "rgba(201,169,110,0.08)", border: `1px solid ${gold}22` }}>
              <p className="text-[10px] uppercase tracking-[0.3em] mb-4 font-semibold" style={{ color: `${gold}88` }}>
                Hubungi Kami
              </p>
              <div className="space-y-2">
                {phoneNumber && (
                  <a
                    href={`tel:${phoneNumber}`}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01] active:scale-95"
                    style={{ background: `${gold}10`, border: `1px solid ${gold}18` }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, #22c55e33, #22c55e11)`, border: "1px solid #22c55e33" }}>
                      <Phone className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: `${gold}77` }}>Telepon</p>
                      <span className="text-sm font-medium" style={{ color: "#d4d4d8" }}>{phoneNumber}</span>
                    </div>
                  </a>
                )}
                {videocallLink && (
                  <a
                    href={videocallLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01] active:scale-95"
                    style={{ background: `${gold}10`, border: `1px solid ${gold}18` }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f633, #3b82f611)", border: "1px solid #3b82f633" }}>
                      <Video className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: `${gold}77` }}>Video Call</p>
                      <span className="text-sm font-medium" style={{ color: "#d4d4d8" }}>Gabung Video Call</span>
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Bottom ornament */}
          <div className="flex flex-col items-center pb-8">
            <div className="flex items-center gap-2">
              <div style={{ width: 30, height: 1, background: `linear-gradient(90deg, transparent, ${gold}44)` }} />
              <span style={{ color: `${gold}55`, fontSize: 12 }}>✦</span>
              <div style={{ width: 30, height: 1, background: `linear-gradient(90deg, ${gold}44, transparent)` }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // MEDIA VIEWER
  // ============================================================
  const renderMediaViewer = () => {
    if (!selectedMedia) return null;
    return (
      <div className="absolute inset-0 z-40 bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSelectedMedia(null)} className="text-white p-1">
            <X className="w-6 h-6" />
          </button>
          <span className="text-white text-sm truncate">{selectedMedia.caption}</span>
          <div className="w-8" />
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          {selectedMedia.type === "photo" ? (
            <img src={selectedMedia.url} alt={selectedMedia.caption} className="max-w-full max-h-full object-contain rounded" />
          ) : (
            <video src={selectedMedia.url} controls className="max-w-full max-h-full rounded" />
          )}
        </div>
      </div>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  const gold = "#C9A96E";
  const goldLight = "#E8D5A8";

  return (
    <div className="flex justify-center h-screen bg-black overflow-hidden font-sans">
      <div className="w-full max-w-[450px] h-full flex flex-col relative shadow-2xl" style={{ background: "linear-gradient(180deg, #12121e 0%, #0a1128 100%)" }}>

        <style dangerouslySetInnerHTML={{__html: `
          .bg-chat-pattern {
            position: absolute;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83-1.66 1.66-.83-.83.83-.83zM34.5 13.5L36 12l1.5 1.5-1.5 1.5-1.5-1.5zm-24 0L12 12l1.5 1.5-1.5 1.5-1.5-1.5zm19.5-6L31.5 6l1.5 1.5-1.5 1.5-1.5-1.5z' fill='%23c9a96e' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E");
            z-index: 0;
            pointer-events: none;
          }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          .animate-slide-in {
            animation: slideIn 0.25s ease-out;
          }
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}} />
        <div className="bg-chat-pattern"></div>

        {/* PROFILE SHEET */}
        {showProfile && renderProfile()}

        {/* MEDIA VIEWER */}
        {renderMediaViewer()}

        {/* HEADER */}
        <header className="flex items-center justify-between px-4 py-3 z-10 backdrop-blur-md" style={{ background: "rgba(18, 18, 30, 0.8)", borderBottom: `1px solid ${gold}33` }}>
          <button onClick={() => setShowProfile(true)} className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition">
            <div className="w-11 h-11 rounded-full overflow-hidden border border-[#C9A96E]/50 p-[2px]" style={{ background: `linear-gradient(135deg, ${gold}, ${goldLight})` }}>
              <img src={groupPhoto} alt="Grup Profile" className="w-full h-full object-cover rounded-full border-2 border-[#12121e]" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="font-bold text-base leading-tight flex items-center gap-1" style={{ color: goldLight, fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                {groupName}
              </h1>
              <p className="text-xs truncate w-32 md:w-40" style={{ color: `${gold}99` }}>
                {groupSubtitle}
              </p>
            </div>
          </button>

          <div className="flex items-center space-x-4" style={{ color: gold }}>
            {videocallLink ? (
              <a href={videocallLink} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white/5 rounded-full transition-colors">
                <Video className="w-5 h-5" />
              </a>
            ) : (
              <button className="p-1 hover:bg-white/5 rounded-full transition-colors relative">
                <Video className="w-5 h-5" />
              </button>
            )}
            {phoneNumber ? (
              <a href={`tel:${phoneNumber}`} className="p-1 hover:bg-white/5 rounded-full transition-colors relative">
                <Phone className="w-5 h-5" />
              </a>
            ) : (
              <button className="p-1 hover:bg-white/5 rounded-full transition-colors relative">
                <Phone className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full border border-[#12121e]" style={{ background: gold }}></span>
              </button>
            )}
            <button onClick={() => setShowProfile(true)} className="p-1 hover:bg-white/5 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* GALLERY BUTTON (if media exists) */}
        {getMediaItems().length > 0 && (
          <button
            onClick={() => setShowProfile(true)}
            className="mx-auto mt-3 flex items-center gap-1.5 px-4 py-1.5 backdrop-blur-md rounded-full text-xs font-semibold shadow-sm transition-all hover:scale-105 z-10"
            style={{ background: `rgba(201,169,110,0.15)`, color: goldLight, border: `1px solid ${gold}44` }}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Lihat {getMediaItems().length} media & info undangan
          </button>
        )}

        {/* MESSAGE AREA */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-hide z-10">
          {allMessages.length === 0 && (
            <div className="text-center text-sm p-2 rounded-xl mx-auto w-fit" style={{ color: `${gold}aa`, background: `rgba(201,169,110,0.1)` }}>
              Mulai percakapan...
            </div>
          )}
          {allMessages.map((msg, idx) => {
            const isMe = msg.isCurrentUser || msg.sender_name === currentUserName;

            return (
              <div
                key={msg.id || idx}
                className={`flex items-start gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isMe && (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 border border-white/10 ${msg.color || "bg-yellow-600"}`}>
                    {msg.initial}
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-3 shadow-sm backdrop-blur-sm ${
                    isMe 
                      ? "rounded-tr-sm" 
                      : "rounded-tl-sm"
                  }`}
                  style={isMe 
                    ? { background: `linear-gradient(135deg, ${gold}22, ${gold}11)`, border: `1px solid ${gold}44` }
                    : { background: `rgba(255,255,255,0.05)`, border: `1px solid rgba(255,255,255,0.1)` }
                  }
                >
                  {!isMe && (
                    <p className="font-semibold text-xs mb-1" style={{ color: goldLight }}>
                      {msg.sender_name}
                    </p>
                  )}
                  
                  {/* Render Image if exists */}
                  {msg.image_url && (
                    <div 
                      className="mb-2 rounded-xl overflow-hidden cursor-pointer" 
                      style={{ border: `1px solid ${gold}33` }}
                      onClick={() => setSelectedMedia({ url: msg.image_url!, type: "photo", caption: msg.sender_name })}
                    >
                      <img src={msg.image_url} alt="Foto Chat" className="w-full max-h-60 object-cover hover:opacity-90 transition" />
                    </div>
                  )}

                  <p className="text-[14px] leading-relaxed break-words" style={{ color: "#e2e8f0" }}>
                    {msg.content}
                  </p>
                  
                  {msg.created_at && (
                    <div className="text-right mt-1">
                      <span className="text-[10px] font-medium" style={{ color: isMe ? `${gold}aa` : "rgba(255,255,255,0.4)" }}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-3 z-20 w-full pb-6 backdrop-blur-md relative" style={{ background: "rgba(18, 18, 30, 0.85)", borderTop: `1px solid ${gold}33` }}>
          
          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <div className="absolute bottom-[80px] left-2 z-50 shadow-2xl" ref={emojiPickerRef}>
              <EmojiPicker 
                onEmojiClick={onEmojiClick} 
                theme={"dark" as any}
                searchDisabled
                skinTonesDisabled
                width={300}
                height={400}
              />
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <div className="flex-1 flex items-center rounded-full px-4 py-2" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${gold}44` }}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="mr-3 transition-colors hover:scale-110"
                style={{ color: goldLight }}
              >
                <Smile className="w-5 h-5" />
              </button>
              
              <input
                type="text"
                placeholder="Ketik pesan..."
                className="flex-1 bg-transparent outline-none text-sm placeholder-white/40"
                style={{ color: "#e2e8f0" }}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="ml-3 transition-colors hover:scale-110 disabled:opacity-50"
                style={{ color: goldLight }}
              >
                {isUploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-11 h-11 flex items-center justify-center rounded-full transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
              style={{ background: `linear-gradient(135deg, ${gold}, #B8955A)`, color: "#12121e", boxShadow: `0 4px 10px ${gold}44` }}
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

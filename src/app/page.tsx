"use client";

import React, { useState, useEffect, useRef } from "react";
import { Video, Phone, MoreVertical, Send, Smile, MapPin, Calendar, Clock, X, ChevronLeft, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAllSettings } from "@/lib/settings";

// Tipe Data Pesan
type Message = {
  id: string | number;
  sender_name: string;
  initial: string;
  color: string;
  content: string;
  created_at?: string;
  isCurrentUser?: boolean;
};

type InitialChat = {
  sender_name: string;
  content: string;
  color: string;
  initial: string;
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
  return (
    <div className="flex justify-center h-screen bg-gray-900 overflow-hidden font-sans">
      <div className="w-full max-w-[450px] h-full flex flex-col bg-chat-pattern relative shadow-2xl">

        <style dangerouslySetInnerHTML={{__html: `
          .bg-chat-pattern {
            background-color: #5bb3b1;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83-1.66 1.66-.83-.83.83-.83zM34.5 13.5L36 12l1.5 1.5-1.5 1.5-1.5-1.5zm-24 0L12 12l1.5 1.5-1.5 1.5-1.5-1.5zm19.5-6L31.5 6l1.5 1.5-1.5 1.5-1.5-1.5z' fill='%23ffffff' fill-opacity='0.15' fill-rule='evenodd'/%3E%3C/svg%3E");
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

        {/* PROFILE SHEET */}
        {showProfile && renderProfile()}

        {/* MEDIA VIEWER */}
        {renderMediaViewer()}

        {/* HEADER */}
        <header className="flex items-center justify-between px-4 py-3 z-10" style={{ backgroundColor: "#F7E8B8" }}>
          <button onClick={() => setShowProfile(true)} className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition">
            <div className="w-11 h-11 rounded-full bg-gray-300 overflow-hidden border border-gray-400">
              <img src={groupPhoto} alt="Grup Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="font-bold text-gray-800 text-base leading-tight flex items-center gap-1">
                {groupName}
              </h1>
              <p className="text-xs text-gray-500 truncate w-32 md:w-40">
                {groupSubtitle}
              </p>
            </div>
          </button>

          <div className="flex items-center space-x-4 text-gray-700">
            {videocallLink ? (
              <a href={videocallLink} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <Video className="w-5 h-5" />
              </a>
            ) : (
              <button className="p-1 hover:bg-black/5 rounded-full transition-colors relative">
                <Video className="w-5 h-5" />
              </button>
            )}
            {phoneNumber ? (
              <a href={`tel:${phoneNumber}`} className="p-1 hover:bg-black/5 rounded-full transition-colors relative">
                <Phone className="w-5 h-5" />
              </a>
            ) : (
              <button className="p-1 hover:bg-black/5 rounded-full transition-colors relative">
                <Phone className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-[#F7E8B8]"></span>
              </button>
            )}
            <button onClick={() => setShowProfile(true)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* GALLERY BUTTON (if media exists) */}
        {getMediaItems().length > 0 && (
          <button
            onClick={() => setShowProfile(true)}
            className="mx-auto mt-2 flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur rounded-full text-xs font-medium text-[#5bb3b1] shadow-sm hover:bg-white transition"
          >
            <ImageIcon className="w-3 h-3" />
            Lihat {getMediaItems().length} media & info undangan
          </button>
        )}

        {/* MESSAGE AREA */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-hide">
          {allMessages.length === 0 && (
            <div className="text-center text-white/70 text-sm bg-black/20 p-2 rounded-xl mx-auto w-fit">
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 ${msg.color || "bg-yellow-500"}`}>
                    {msg.initial}
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                    isMe ? "bg-[#dcf8c6] rounded-tr-sm" : "bg-white rounded-tl-sm"
                  }`}
                >
                  {!isMe && (
                    <p className="font-semibold text-sm text-gray-900 mb-1">
                      {msg.sender_name}
                    </p>
                  )}
                  <p className="text-gray-800 text-[15px] leading-relaxed break-words">
                    {msg.content}
                  </p>
                  {msg.created_at && (
                    <div className="text-right mt-1">
                      <span className="text-[10px] text-gray-400 font-medium">
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
        <div className="p-3 bg-[#F7E8B8] z-10 w-full pb-6">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white rounded-full px-4 py-2 border border-gray-300">
              <input
                type="text"
                placeholder="Message..."
                className="flex-1 bg-transparent outline-none text-gray-800 text-sm"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#e8d695] text-gray-700 hover:bg-[#d8c584] transition"
            >
              <Smile className="w-5 h-5" />
            </button>

            <button
              type="submit"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#e8d695] text-gray-700 hover:bg-[#d8c584] transition"
            >
              <Send className="w-5 h-5 ml-1" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

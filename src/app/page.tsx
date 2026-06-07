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

    return (
      <div className="absolute inset-0 z-30 bg-white flex flex-col animate-slide-in">
        {/* Profile Header */}
        <div className="bg-[#5bb3b1] text-white px-4 py-4 flex items-center gap-3">
          <button onClick={() => setShowProfile(false)} className="p-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="font-bold text-lg">Info Grup</h2>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {/* Profile Photo & Name */}
          <div className="flex flex-col items-center py-6 bg-gradient-to-b from-[#5bb3b1]/10 to-white">
            <div className="w-24 h-24 rounded-full bg-gray-300 overflow-hidden border-4 border-white shadow-lg mb-3">
              <img src={groupPhoto} alt="Grup" className="w-full h-full object-cover" />
            </div>
            <h3 className="font-bold text-xl text-gray-800">{groupName}</h3>
            <p className="text-sm text-gray-500">{groupSubtitle}</p>
          </div>

          {/* Couple Info */}
          {(groomName || brideName) && (
            <div className="px-4 py-4 border-t border-gray-100">
              <h4 className="text-xs font-bold text-[#5bb3b1] uppercase tracking-wider mb-3">💑 Mempelai</h4>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800">{groomName}</p>
                <p className="text-[#5bb3b1] font-semibold text-xl my-1">&</p>
                <p className="text-lg font-bold text-gray-800">{brideName}</p>
              </div>
            </div>
          )}

          {/* Event Info */}
          {(eventDate || eventTime || eventLocation) && (
            <div className="px-4 py-4 border-t border-gray-100">
              <h4 className="text-xs font-bold text-[#5bb3b1] uppercase tracking-wider mb-3">📅 Detail Acara</h4>
              <div className="space-y-3">
                {eventDate && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Calendar className="w-5 h-5 text-[#5bb3b1] shrink-0" />
                    <span className="text-sm">{formatDate(eventDate)}</span>
                  </div>
                )}
                {eventTime && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Clock className="w-5 h-5 text-[#5bb3b1] shrink-0" />
                    <span className="text-sm">{eventTime}</span>
                  </div>
                )}
                {eventLocation && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <MapPin className="w-5 h-5 text-[#5bb3b1] shrink-0" />
                    <span className="text-sm">{eventLocation}</span>
                  </div>
                )}
                {mapsLink && (
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-[#5bb3b1] text-white text-sm rounded-full font-medium hover:bg-[#4a9e9c] transition"
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
            <div className="px-4 py-4 border-t border-gray-100">
              <h4 className="text-xs font-bold text-[#5bb3b1] uppercase tracking-wider mb-3">🖼️ Media ({mediaItems.length})</h4>
              <div className="grid grid-cols-3 gap-2">
                {mediaItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedMedia(item)}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100"
                  >
                    {item.type === "photo" ? (
                      <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                        <span className="text-2xl">🎥</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {(videocallLink || phoneNumber) && (
            <div className="px-4 py-4 border-t border-gray-100">
              <h4 className="text-xs font-bold text-[#5bb3b1] uppercase tracking-wider mb-3">📞 Kontak</h4>
              <div className="space-y-2">
                {phoneNumber && (
                  <a
                    href={`tel:${phoneNumber}`}
                    className="flex items-center gap-3 p-3 bg-green-50 rounded-xl text-green-700 hover:bg-green-100 transition"
                  >
                    <Phone className="w-5 h-5" />
                    <span className="text-sm font-medium">{phoneNumber}</span>
                  </a>
                )}
                {videocallLink && (
                  <a
                    href={videocallLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl text-blue-700 hover:bg-blue-100 transition"
                  >
                    <Video className="w-5 h-5" />
                    <span className="text-sm font-medium">Gabung Video Call</span>
                  </a>
                )}
              </div>
            </div>
          )}
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

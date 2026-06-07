"use client";

import React, { useState, useEffect, useRef } from "react";
import { Video, Phone, MoreVertical, Send, Smile } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Tipe Data Pesan
type Message = {
  id: string | number;
  sender_name: string;
  initial: string;
  color: string;
  content: string;
  created_at?: string;
  isCurrentUser?: boolean; // Virtual field
};

export default function WhatsAppGroupInvitation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Ambil nama pengguna dari localStorage atau generate baru
  const [currentUserName, setCurrentUserName] = useState("");
  
  useEffect(() => {
    // Generate nama unik untuk sesi ini
    let name = localStorage.getItem("whatsapp_guest_name");
    if (!name) {
      name = "Tamu " + Math.floor(Math.random() * 1000);
      localStorage.setItem("whatsapp_guest_name", name);
    }
    setCurrentUserName(name);

    // 1. Ambil data pesan awal dari Supabase
    const fetchMessages = async () => {
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

    fetchMessages();

    // 2. Dengarkan pesan baru secara real-time
    const channel = supabase
      .channel('messages_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto scroll ke bawah tiap ada pesan baru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      sender_name: currentUserName,
      initial: currentUserName.charAt(0).toUpperCase(),
      color: "bg-green-500", // Warna acak bisa ditambahkan nanti
      content: inputText,
    };

    // Optimistic UI update
    const tempId = Date.now().toString();
    setMessages((prev) => [...prev, { ...newMsg, id: tempId, isCurrentUser: true }]);
    setInputText("");

    // Kirim ke Supabase
    const { error } = await supabase.from("messages").insert([newMsg]);
    if (error) {
      console.error("Gagal mengirim pesan:", error.message, error.details, error.hint);
      alert(`Gagal mengirim pesan: ${error.message}. (Code: ${error.code})`);
      // Rollback UI (disederhanakan)
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "Just now";
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex justify-center h-screen bg-gray-900 overflow-hidden font-sans">
      {/* Mobile Frame Simulator (Maksimal 450px lebar) */}
      <div className="w-full max-w-[450px] h-full flex flex-col bg-chat-pattern relative shadow-2xl">
        
        <style dangerouslySetInnerHTML={{__html: `
          .bg-chat-pattern {
            background-color: #5bb3b1;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83-1.66 1.66-.83-.83.83-.83zM34.5 13.5L36 12l1.5 1.5-1.5 1.5-1.5-1.5zm-24 0L12 12l1.5 1.5-1.5 1.5-1.5-1.5zm19.5-6L31.5 6l1.5 1.5-1.5 1.5-1.5-1.5z' fill='%23ffffff' fill-opacity='0.15' fill-rule='evenodd'/%3E%3C/svg%3E");
          }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />

        {/* HEADER (Navbar atas mirip WA) */}
        <header className="flex items-center justify-between px-4 py-3 z-10" style={{ backgroundColor: "#F7E8B8" }}>
          <div className="flex items-center space-x-3">
            {/* Foto Profil Grup */}
            <div className="w-11 h-11 rounded-full bg-gray-300 overflow-hidden border border-gray-400">
              <img 
                src="https://api.dicebear.com/7.x/initials/svg?seed=Hajatan" 
                alt="Grup Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Info Grup */}
            <div className="flex flex-col">
              <h1 className="font-bold text-gray-800 text-base leading-tight flex items-center gap-1">
                Grup Hajatan 🕊️
              </h1>
              <p className="text-xs text-gray-500 truncate w-32 md:w-40">
                Afrizal, Jubed, Admin Persib,...
              </p>
            </div>
          </div>

          {/* Header Icons */}
          <div className="flex items-center space-x-4 text-gray-700">
            <button className="p-1 hover:bg-black/5 rounded-full transition-colors relative">
              <Video className="w-5 h-5" />
            </button>
            <button className="p-1 hover:bg-black/5 rounded-full transition-colors relative">
              <Phone className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-[#F7E8B8]"></span>
            </button>
            <button className="p-1 hover:bg-black/5 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* MESSAGE AREA (Area Chat) */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-hide">
          {messages.length === 0 && (
            <div className="text-center text-white/70 text-sm bg-black/20 p-2 rounded-xl mx-auto w-fit">
              Mulai percakapan... (Pastikan tabel Supabase sudah dibuat)
            </div>
          )}
          {messages.map((msg, idx) => {
            // Tentukan apakah pesan ini dari user saat ini berdasarkan nama (untuk simulasi)
            const isMe = msg.isCurrentUser || msg.sender_name === currentUserName;
            
            return (
              <div 
                key={msg.id || idx} 
                className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar Pengirim */}
                {!isMe && (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 ${msg.color || 'bg-yellow-500'}`}>
                    {msg.initial}
                  </div>
                )}

                {/* Chat Bubble */}
                <div 
                  className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                    isMe 
                      ? 'bg-[#dcf8c6] rounded-tr-sm' 
                      : 'bg-white rounded-tl-sm'
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
                  <div className="text-right mt-1">
                    <span className="text-[10px] text-gray-400 font-medium">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA (Kolom Ketik Pesan) */}
        <div className="p-3 bg-[#F7E8B8] z-10 w-full pb-6">
          <form 
            onSubmit={handleSendMessage}
            className="flex items-center gap-2"
          >
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

"use client";

import React, { useState, useEffect, useRef } from "react";
import { Video, Phone, MoreVertical, Send, Smile, Trash2, ShieldAlert } from "lucide-react";
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

export default function AdminWhatsAppGroupInvitation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Ambil nama pengguna admin
  const [currentUserName, setCurrentUserName] = useState("Admin");

  // State Login
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "admin123") {
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Username atau password salah!");
    }
  };
  
  useEffect(() => {
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
      .channel('messages_channel_admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            setMessages((prev) => {
              // Hindari duplikasi jika pesan dikirim oleh diri sendiri
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          } else if (payload.eventType === 'DELETE') {
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

  // Auto scroll ke bawah tiap ada pesan baru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      sender_name: currentUserName,
      initial: "A",
      color: "bg-blue-600",
      content: inputText,
    };

    // Optimistic UI update
    const tempId = Date.now().toString();
    setMessages((prev) => [...prev, { ...newMsg, id: tempId, isCurrentUser: true }]);
    setInputText("");

    // Kirim ke Supabase
    const { error } = await supabase.from("messages").insert([newMsg]);
    if (error) {
      console.error("Gagal mengirim pesan:", error.message);
      alert(`Gagal mengirim pesan: ${error.message}`);
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    }
  };

  const handleDeleteMessage = async (id: string | number) => {
    if (!confirm("Yakin ingin menghapus pesan ini?")) return;

    // Optimistic delete
    setMessages((prev) => prev.filter(m => m.id !== id));

    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) {
      console.error("Gagal menghapus pesan:", error.message);
      alert(`Gagal menghapus pesan: ${error.message}`);
      // Refresh messages as fallback
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
      if (data) setMessages(data);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "Just now";
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 font-sans">
        <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Admin Login</h2>
          
          {loginError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Masukkan username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Masukkan password"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition duration-200"
            >
              Masuk ke Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center h-screen bg-gray-900 overflow-hidden font-sans">
      {/* Mobile Frame Simulator */}
      <div className="w-full max-w-[450px] h-full flex flex-col bg-chat-pattern relative shadow-2xl">
        
        <style dangerouslySetInnerHTML={{__html: `
          .bg-chat-pattern {
            background-color: #5bb3b1;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83-1.66 1.66-.83-.83.83-.83zM34.5 13.5L36 12l1.5 1.5-1.5 1.5-1.5-1.5zm-24 0L12 12l1.5 1.5-1.5 1.5-1.5-1.5zm19.5-6L31.5 6l1.5 1.5-1.5 1.5-1.5-1.5z' fill='%23ffffff' fill-opacity='0.15' fill-rule='evenodd'/%3E%3C/svg%3E");
          }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />

        {/* HEADER */}
        <header className="flex items-center justify-between px-4 py-3 z-10" style={{ backgroundColor: "#1e293b" }}>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden border border-gray-400">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex flex-col">
              <h1 className="font-bold text-white text-base leading-tight flex items-center gap-1">
                ADMIN PANEL
              </h1>
              <p className="text-xs text-blue-200 truncate w-32 md:w-40">
                Grup Hajatan 🕊️
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-white">
            <button className="p-1 hover:bg-black/20 rounded-full transition-colors relative">
              <Video className="w-5 h-5" />
            </button>
            <button className="p-1 hover:bg-black/20 rounded-full transition-colors relative">
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-1 hover:bg-black/20 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* MESSAGE AREA */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-hide">
          {messages.length === 0 && (
            <div className="text-center text-white/70 text-sm bg-black/20 p-2 rounded-xl mx-auto w-fit">
              Belum ada percakapan.
            </div>
          )}
          {messages.map((msg, idx) => {
            const isMe = msg.isCurrentUser || msg.sender_name === currentUserName;
            
            return (
              <div 
                key={msg.id || idx} 
                className={`flex items-start gap-2 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isMe && (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 ${msg.color || 'bg-yellow-500'}`}>
                    {msg.initial}
                  </div>
                )}

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

                {/* DELETE BUTTON UNTUK ADMIN */}
                <button
                  onClick={() => handleDeleteMessage(msg.id)}
                  className="p-2 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 self-center"
                  title="Hapus pesan ini"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-3 bg-[#1e293b] z-10 w-full pb-6">
          <form 
            onSubmit={handleSendMessage}
            className="flex items-center gap-2"
          >
            <div className="flex-1 flex items-center bg-gray-800 rounded-full px-4 py-2 border border-gray-600">
              <input 
                type="text" 
                placeholder="Balas sebagai admin..." 
                className="flex-1 bg-transparent outline-none text-white text-sm placeholder-gray-400"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
            
            <button 
              type="submit" 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500 transition"
            >
              <Send className="w-5 h-5 ml-1" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

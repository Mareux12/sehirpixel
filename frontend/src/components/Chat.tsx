import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { MessageCircle, Send, X, ChevronDown, Smile, Crown, ShieldCheck } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export const Chat: React.FC = () => {
  const { chatMessages, sendChatMessage, user } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [unread, setUnread] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    // Track unread when closed
    if (!isOpen && chatMessages.length > prevCountRef.current) {
      setUnread(prev => prev + (chatMessages.length - prevCountRef.current));
    }
    prevCountRef.current = chatMessages.length;
  }, [chatMessages, isOpen]);

  // Clear unread when opened
  useEffect(() => {
    if (isOpen) setUnread(0);
  }, [isOpen]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendChatMessage(message);
    setMessage('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="absolute bottom-20 left-4 right-4 md:bottom-6 md:right-auto md:w-80 z-50 flex flex-col items-start pointer-events-none">
      {/* Chat panel */}
      <div
        className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom-left w-full pointer-events-auto"
        style={{
          maxHeight: isOpen ? '60vh' : '0px',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1)' : 'scale(0.95)',
          marginBottom: isOpen ? '8px' : '0px',
        }}
      >
        <div className="glass-strong rounded-2xl w-full h-[60vh] md:h-[400px] flex flex-col shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <MessageCircle size={14} className="text-indigo-400" />
              </div>
              <span className="font-semibold text-sm text-white">Sohbet</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 && (
              <div className="text-center text-slate-600 text-xs mt-16">
                Henüz mesaj yok. İlk mesajı sen yaz! 💬
              </div>
            )}
            {chatMessages.map((msg, i) => {
              const isMe = msg.username === user?.displayName;
              return (
                <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm relative ${
                    isMe 
                      ? 'bg-indigo-500/20 border border-indigo-500/20 text-indigo-100' 
                      : 'bg-slate-800/80 border border-white/5 text-slate-200'
                  } ${msg.equippedFrame ? `border-2 ${msg.equippedFrame}` : ''}`}>
                    
                    {!isMe && (
                      <div className={`text-[10px] font-bold mb-0.5 flex items-center gap-1 ${msg.equippedNameColor || 'text-indigo-400'}`}>
                        {msg.isLeader && <Crown size={10} className="text-amber-400" />}
                        {msg.isSupporter && <ShieldCheck size={10} className="text-purple-400" />}
                        {msg.username}
                      </div>
                    )}
                    {isMe && (msg.isLeader || msg.isSupporter) && (
                      <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
                        {msg.isLeader && <div className="bg-amber-500 p-0.5 rounded-sm"><Crown size={8} className="text-white" /></div>}
                        {msg.isSupporter && <div className="bg-purple-500 p-0.5 rounded-sm"><ShieldCheck size={8} className="text-white" /></div>}
                      </div>
                    )}
                    
                    <div className="break-words leading-relaxed">{msg.message}</div>
                  </div>
                  <div className="text-[9px] text-slate-600 mt-0.5 px-1">{formatTime(msg.timestamp)}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/5 relative">
            {/* Emoji Picker Popup */}
            {isOpen && showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 z-50">
                <div className="glass-strong rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden">
                  <EmojiPicker
                    theme={Theme.DARK}
                    onEmojiClick={(emojiObject) => {
                      setMessage(prev => prev + emojiObject.emoji);
                    }}
                    autoFocusSearch={false}
                    lazyLoadEmojis={true}
                    width={296}
                    height={320}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      '--epr-bg-color': 'transparent',
                      '--epr-category-label-bg-color': 'rgba(15, 23, 42, 0.9)',
                      '--epr-hover-bg-color': 'rgba(99, 102, 241, 0.2)',
                      '--epr-focus-bg-color': 'rgba(99, 102, 241, 0.2)',
                      '--epr-search-input-bg-color': 'rgba(15, 23, 42, 0.6)',
                      '--epr-picker-border-color': 'transparent',
                    } as any}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-9 h-9 rounded-xl hover:bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-colors shrink-0"
              >
                <Smile size={18} />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mesaj yaz..."
                maxLength={200}
                className="flex-1 bg-slate-900/60 border border-white/5 text-white text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/30 hover:text-indigo-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="pointer-events-auto group glass rounded-full w-11 h-11 flex items-center justify-center hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative"
      >
        {isOpen ? (
          <ChevronDown size={18} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
        ) : (
          <MessageCircle size={18} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
        )}
        {/* Unread badge */}
        {!isOpen && unread > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse-glow">
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>
    </div>
  );
};

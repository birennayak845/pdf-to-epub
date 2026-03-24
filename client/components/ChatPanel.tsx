'use client';
import { useState, useRef, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/lib/store';

export default function ChatPanel() {
  const [text, setText] = useState('');
  const { chatMessages } = useGameStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const send = () => {
    const msg = text.trim();
    if (!msg) return;
    getSocket().emit('send_chat', { text: msg });
    setText('');
  };

  return (
    <div className="flex flex-col h-full bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10 text-white/60 text-xs font-medium">Chat</div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
        {chatMessages.map((m, i) => (
          <div key={i} className="text-xs">
            <span className="text-yellow-300 font-medium">{m.from}: </span>
            <span className="text-white/80">{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-2 border-t border-white/10">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Say something…"
          className="flex-1 bg-white/10 rounded-lg px-3 py-1.5 text-white text-xs
            placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
        />
        <button onClick={send} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs">
          Send
        </button>
      </div>
    </div>
  );
}

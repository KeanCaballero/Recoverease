import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, AlertTriangle, Plus, Clock } from 'lucide-react';
import { apiPost, apiGet } from '../../lib/api';
import { ChatSession, ChatMessage } from '../../types';
import { Card, Button, Spinner, Badge } from '../../components/ui';
import { formatDateTime, cn } from '../../lib/utils';

export default function PatientChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    apiGet<ChatSession[]>('/chat/history')
      .then(data => { setSessions(data); setLoadingSessions(false); });
  }, []);

  useEffect(() => {
    if (activeSession) setMessages(activeSession.chatMessages ?? []);
  }, [activeSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const userMsg: ChatMessage = {
      chatMessageId: Date.now(), chatSessionId: activeSession?.chatSessionId ?? 0,
      role: 'user', content: text, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const data = await apiPost<{ sessionId: number; response: string; isCritical: boolean }>('/chat/message', {
        message: text,
        sessionId: activeSession?.chatSessionId,
      });

      if (data.isCritical) setIsCritical(true);

      const botMsg: ChatMessage = {
        chatMessageId: Date.now() + 1, chatSessionId: data.sessionId,
        role: 'assistant', content: data.response, createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, botMsg]);

      if (!activeSession) {
        const updated = await apiGet<ChatSession[]>('/chat/history');
        setSessions(updated);
        const latest = updated[0];
        if (latest) setActiveSession({ ...latest, chatMessages: [...(latest.chatMessages ?? []), userMsg, botMsg] });
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function startNewChat() {
    setActiveSession(null);
    setMessages([]);
    setIsCritical(false);
  }

  const SUGGESTIONS = [
    'What should I do if I miss a medication?',
    'What foods should I avoid with my medications?',
    'How can I manage side effects at home?',
    'When should I seek emergency care?',
  ];

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Session sidebar */}
      <div className="w-64 border-r border-gray-200 bg-white flex flex-col hidden md:flex">
        <div className="p-4 border-b border-gray-100">
          <Button className="w-full" size="sm" icon={<Plus size={14} />} onClick={startNewChat}>New Chat</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingSessions ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No previous chats</p>
          ) : (
            sessions.map(s => (
              <button key={s.chatSessionId}
                onClick={() => setActiveSession(s)}
                className={cn('w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm', activeSession?.chatSessionId === s.chatSessionId ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50')}>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="flex-shrink-0" />
                  <span className="truncate">{formatDateTime(s.chatSessionStartedAt)}</span>
                </div>
                {s.chatSessionHasCriticalFlag && <Badge variant="danger" className="mt-1 text-[10px]">⚠ Critical</Badge>}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">RecoverEase AI Assistant</p>
            <p className="text-xs text-gray-400">Post-treatment guidance · Not a substitute for professional advice</p>
          </div>
          {isCritical && (
            <div className="ml-auto flex items-center gap-2 bg-red-50 text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200">
              <AlertTriangle size={13} />
              Critical concern flagged — your doctor has been notified
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center">
                <Bot size={32} className="text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 text-lg">Ask RecoverEase AI</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-xs">Get guidance on your post-treatment recovery. Always consult your doctor for medical decisions.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-left text-xs text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 rounded-xl px-4 py-3 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.chatMessageId} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={15} className="text-white" />
                </div>
              )}
              <div className={cn('max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm')}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={15} className="text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bot size={15} className="text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-gray-200 bg-white">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your recovery, medications, or symptoms…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-h-32"
              style={{ minHeight: '46px' }}
            />
            <Button onClick={sendMessage} disabled={!input.trim() || sending} className="flex-shrink-0" style={{ height: '46px', width: '46px', padding: 0 }}>
              <Send size={16} />
            </Button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">AI responses are for guidance only. In emergencies, call 911 or go to the nearest ER.</p>
        </div>
      </div>
    </div>
  );
}

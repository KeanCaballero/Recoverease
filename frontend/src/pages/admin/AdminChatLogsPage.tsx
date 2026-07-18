import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { ChatSession } from '../../types';
import { Card, Badge, Spinner, EmptyState, Button } from '../../components/ui';
import { formatDateTime } from '../../lib/utils';

interface LogsResponse { sessions: (ChatSession & { _count: { chatMessages: number } })[]; total: number; page: number; limit: number; }

export default function AdminChatLogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedSession, setExpandedSession] = useState<ChatSession | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiGet<LogsResponse>('/chat/admin/logs', { page, limit: 20 });
    setData(result);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function expand(sessionId: number) {
    if (expandedId === sessionId) { setExpandedId(null); setExpandedSession(null); return; }
    setExpandedId(sessionId);
    const session = await apiGet<ChatSession>(`/chat/sessions/${sessionId}`);
    setExpandedSession(session);
  }

  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">AI Chatbot Logs</h1>
        <p className="text-sm text-gray-500">{total.toLocaleString()} sessions total</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : !data?.sessions.length ? (
        <EmptyState icon={<MessageSquare size={40} />} title="No chat sessions yet" />
      ) : (
        <div className="space-y-3">
          {data.sessions.map(session => (
            <Card key={session.chatSessionId} padding="none">
              <button className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors rounded-xl"
                onClick={() => expand(session.chatSessionId)}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${session.chatSessionHasCriticalFlag ? 'bg-red-100' : 'bg-blue-50'}`}>
                  {session.chatSessionHasCriticalFlag
                    ? <AlertTriangle size={18} className="text-red-500" />
                    : <MessageSquare size={18} className="text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">
                      {session.patient?.patFirstName} {session.patient?.patLastName}
                    </p>
                    {session.chatSessionHasCriticalFlag && <Badge variant="danger">⚠ Critical</Badge>}
                  </div>
                  <p className="text-xs text-gray-400">
                    Started {formatDateTime(session.chatSessionStartedAt)} · {session._count.chatMessages} messages
                  </p>
                </div>
                {expandedId === session.chatSessionId
                  ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                  : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
              </button>

              {expandedId === session.chatSessionId && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50 rounded-b-xl">
                  {expandedSession?.chatMessages?.map(msg => (
                    <div key={msg.chatMessageId} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>
                        <p className="text-xs opacity-70 mb-0.5">{msg.role === 'user' ? 'Patient' : 'AI'} · {formatDateTime(msg.createdAt)}</p>
                        {msg.content}
                      </div>
                    </div>
                  )) ?? <Spinner />}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

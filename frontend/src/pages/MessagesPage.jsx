import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../config';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function MessagesPage() {
  const { username: activeUsername } = useParams();
  const { user, token, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [composing, setComposing] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    fetch(`${API}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setConversations(d.conversations || []))
      .catch(() => {});
  }, [isLoggedIn, token]);

  useEffect(() => {
    if (!activeUsername || !token) { setMessages([]); return; }
    fetch(`${API}/messages/${activeUsername}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setMessages(d.messages || []);
        setConversations(c => c.map(conv =>
          conv.other_username === activeUsername ? { ...conv, unread: 0 } : conv
        ));
      })
      .catch(() => {});
  }, [activeUsername, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    const recipient = activeUsername || newRecipient.trim().replace('@', '');
    if (!input.trim() || !recipient) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/messages/${recipient}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setMessages(m => [...m, data.message]);
      setInput('');
      if (!activeUsername) {
        navigate(`/messages/${recipient}`);
        setComposing(false);
      }
      // Refresh conversation list
      fetch(`${API}/messages`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setConversations(d.conversations || [])).catch(() => {});
    } catch {}
    finally { setSending(false); }
  }

  const card = {
    background: 'var(--card-bg)',
    border: '1px solid rgba(168,85,247,0.15)',
    borderRadius: 'var(--radius-lg)',
    backdropFilter: 'blur(12px)',
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-h)', fontFamily: 'var(--heading)', borderLeft: '3px solid var(--accent)', paddingLeft: 12, margin: 0 }}>
          Messages
        </h1>
        <button onClick={() => { setComposing(true); navigate('/messages'); }} style={{ fontSize: 13, padding: '7px 16px' }}>
          + New message
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, minHeight: 480 }}>

        {/* Conversation list */}
        <div style={{ ...card, overflow: 'hidden' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: 24, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
              No conversations yet.
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.other_id}
                onClick={() => { navigate(`/messages/${conv.other_username}`); setComposing(false); }}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: activeUsername === conv.other_username ? 'var(--accent-bg)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (activeUsername !== conv.other_username) e.currentTarget.style.background = 'var(--subtle-bg)'; }}
                onMouseLeave={e => { if (activeUsername !== conv.other_username) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: activeUsername === conv.other_username ? 'var(--accent)' : 'var(--text-h)' }}>
                    @{conv.other_username}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {conv.unread > 0 && (
                      <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 600 }}>
                        {conv.unread}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(conv.created_at)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.sender_id === user?.id ? 'You: ' : ''}{conv.last_message}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Conversation view */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          {composing ? (
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>New message</p>
              <form onSubmit={sendMessage} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  value={newRecipient}
                  onChange={e => setNewRecipient(e.target.value)}
                  placeholder="@username"
                  style={{ fontSize: 13, padding: '8px 12px' }}
                  required
                />
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a message…"
                  rows={4}
                  maxLength={2000}
                  style={{ fontSize: 13, padding: '10px 12px', resize: 'vertical', borderRadius: 'var(--radius-sm)', background: 'var(--card-bg-subtle)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                <button type="submit" disabled={sending || !input.trim() || !newRecipient.trim()} style={{ fontSize: 13, padding: '8px 18px', alignSelf: 'flex-start' }}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            </div>
          ) : activeUsername ? (
            <>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>
                @{activeUsername}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400 }}>
                {messages.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>No messages yet. Say hello!</p>
                )}
                {messages.map(msg => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '72%',
                        background: isMine ? 'rgba(124,58,237,0.2)' : 'var(--card-bg-subtle)',
                        border: `1px solid ${isMine ? 'var(--accent-border)' : 'var(--border)'}`,
                        borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        padding: '9px 13px',
                      }}>
                        <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.55 }}>{msg.content}</p>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: isMine ? 'right' : 'left' }}>{timeAgo(msg.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={sendMessage} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a message…"
                  maxLength={2000}
                  style={{ flex: 1, fontSize: 13, padding: '8px 12px' }}
                />
                <button type="submit" disabled={sending || !input.trim()} style={{ fontSize: 13, padding: '8px 16px' }}>
                  {sending ? '…' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Select a conversation or start a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

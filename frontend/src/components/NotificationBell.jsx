// ─────────────────────────────────────────────────────────────
// src/components/NotificationBell.jsx
// Shows unread count, dropdown of notifications
// Import into Navbar.jsx and place next to the username
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import API from '../config';

export default function NotificationBell() {
  const { token, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (isLoggedIn) fetchNotifications();
  }, [isLoggedIn]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch(`${API}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  }

  async function markRead(notifId) {
    await fetch(`${API}/notifications/${notifId}/read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await fetch(`${API}/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  if (!isLoggedIn) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        style={{
          background: 'none', border: '0.5px solid #ddd', borderRadius: 8,
          width: 36, height: 36, cursor: 'pointer', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#dc2626', color: '#fff', borderRadius: '50%',
            width: 18, height: 18, fontSize: 11, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 44, width: 320,
          background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12,
          zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 12, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 && (
              <p style={{ padding: '20px 16px', fontSize: 13, color: '#888', textAlign: 'center', margin: 0 }}>
                No notifications yet.
              </p>
            )}
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.is_read) markRead(n.id); setOpen(false); }}
                style={{
                  padding: '12px 16px', borderBottom: '0.5px solid #f0f0f0',
                  background: n.is_read ? '#fff' : '#eff6ff',
                  cursor: 'pointer', transition: 'background .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.background = n.is_read ? '#fff' : '#eff6ff'}
              >
                <p style={{ fontSize: 13, color: '#333', margin: '0 0 4px', lineHeight: 1.5 }}>
                  {n.message}
                </p>
                <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>
                  {new Date(n.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { mailboxAPI } from '@/lib/api';
import { Bell, CheckCircle2, Inbox, Loader2, Mail, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';

const iconByType = {
  order_update: Bell,
  admin_message: Megaphone,
  system: Mail,
};

const titleByType = {
  order_update: 'Order Update',
  admin_message: 'Admin Message',
  system: 'System Message',
};

export default function MailboxPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const loadMailbox = async () => {
    try {
      setLoading(true);
      const response = await mailboxAPI.getAll({ limit: 50 });
      setMessages(response?.data || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load mailbox');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadMailbox();
    }
  }, [user]);

  const markOneRead = async (messageId) => {
    try {
      await mailboxAPI.markRead(messageId);
      setMessages((current) =>
        current.map((message) =>
          message._id === messageId
            ? { ...message, isRead: true, readAt: new Date().toISOString() }
            : message
        )
      );
    } catch (error) {
      toast.error(error.message || 'Unable to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      setMarkingAll(true);
      await mailboxAPI.markAllRead();
      setMessages((current) =>
        current.map((message) => ({
          ...message,
          isRead: true,
          readAt: message.readAt || new Date().toISOString(),
        }))
      );
      toast.success('All messages marked as read');
    } catch (error) {
      toast.error(error.message || 'Unable to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Please sign in</h2>
        <Link href="/auth/login" className="text-indigo-600 font-semibold hover:underline">Sign In</Link>
      </div>
    );
  }

  const unreadCount = messages.filter((message) => !message.isRead).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mailbox</h1>
          <p className="mt-1 text-sm text-slate-500">Order updates, admin announcements, and important account notifications.</p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={markingAll || unreadCount === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {markingAll ? 'Marking...' : `Mark all read${unreadCount ? ` (${unreadCount})` : ''}`}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <Inbox className="mx-auto h-14 w-14 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-800">No messages yet</h2>
          <p className="mt-1 text-sm text-slate-500">When your order status changes or admins send updates, they appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => {
            const Icon = iconByType[message.type] || Mail;
            return (
              <div
                key={message._id}
                className={`rounded-2xl border p-4 shadow-sm transition-colors ${
                  message.isRead ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`rounded-xl p-2 ${message.isRead ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titleByType[message.type] || 'Message'}</p>
                      <h3 className="mt-0.5 text-sm font-semibold text-slate-900">{message.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{message.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>{new Date(message.createdAt).toLocaleString('en-IN')}</span>
                        {message.metadata?.orderNumber && (
                          <span>Order: {message.metadata.orderNumber}</span>
                        )}
                        {message.metadata?.link && (
                          <Link
                            href={message.metadata.link}
                            className="font-semibold text-indigo-600 hover:underline"
                          >
                            Open
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!message.isRead && (
                    <button
                      type="button"
                      onClick={() => markOneRead(message._id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

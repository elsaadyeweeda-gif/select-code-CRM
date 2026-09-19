/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CRMNotification, UserAccount } from '../types';
import { 
  Bell, BellRing, Check, Clock, Wrench, Calendar, Phone, 
  AlertTriangle, Clipboard, RefreshCw, Star, ShieldAlert, Trash2
} from 'lucide-react';

interface NotificationsCenterProps {
  currentUser: UserAccount;
  token: string;
  onNotificationReadCountChange?: (unreadCount: number) => void;
}

export default function NotificationsCenter({ 
  currentUser, 
  token,
  onNotificationReadCountChange
}: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<CRMNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotifications(data.notifications);
        
        // Count unread
        const unread = data.notifications.filter((n: any) => !n.isRead).length;
        if (onNotificationReadCountChange) {
          onNotificationReadCountChange(unread);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('خطأ في تحميل التنبيهات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Auto-poll notifications every 30 seconds for live updates
    const timer = setInterval(fetchNotifications, 30000);
    return () => clearInterval(timer);
  }, [token]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isRead: true })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        
        // Count updated unread
        const unread = notifications.filter(n => n.id !== id && !n.isRead).length;
        if (onNotificationReadCountChange) {
          onNotificationReadCountChange(unread);
        }
      }
    } catch (err) {
      console.error('Error marking as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadList = notifications.filter(n => !n.isRead);
    try {
      await Promise.all(unreadList.map(n => 
        fetch(`/api/notifications/${n.id}/read`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      ));
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      if (onNotificationReadCountChange) {
        onNotificationReadCountChange(0);
      }
    } catch (err) {
      console.error('Error marking all as read', err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const updated = notifications.filter(n => n.id !== id);
      setNotifications(updated);
      if (onNotificationReadCountChange) {
        onNotificationReadCountChange(updated.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error('Error deleting notification', err);
    }
  };

  const getNotificationIcon = (type: CRMNotification['type']) => {
    switch (type) {
      case 'new_task':
        return <Wrench className="w-5 h-5 text-teal-600" />;
      case 'demo_assignment':
        return <Calendar className="w-5 h-5 text-indigo-600" />;
      case 'trial_expiry':
        return <Clock className="w-5 h-5 text-amber-500 animate-pulse" />;
      case 'followup_reminder':
        return <Phone className="w-5 h-5 text-sky-600" />;
      case 'complaint_open':
        return <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />;
      case 'pending_task':
        return <Clipboard className="w-5 h-5 text-slate-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const unreadNotifs = notifications.filter(n => !n.isRead);
  const readNotifs = notifications.filter(n => n.isRead);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100" id="notifications-center-module">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-100 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <BellRing className="w-6 h-6 text-teal-600 animate-swing" />
            <span>مركز التنبيهات المركزي</span>
            {unreadNotifs.length > 0 && (
              <span className="bg-rose-500 text-white font-mono font-bold text-xs px-2 py-0.5 rounded-full animate-bounce">
                {unreadNotifs.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة فورية للمهام المسندة، تنبيهات صلاحية النسخ التجريبية، شكاوى العملاء الجديدة، وتوصيات المتابعة
          </p>
        </div>

        {/* Refresh & Mark All buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button 
            onClick={() => fetchNotifications()}
            className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-50 rounded-lg transition-all"
            title="تحديث قائمة التنبيهات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {unreadNotifs.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>تعليم الكل كمقروء</span>
            </button>
          )}
        </div>
      </div>

      {loading && notifications.length === 0 ? (
        <div className="text-center py-16">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-black">جاري تحديث التنبيهات من السيرفر...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
          <Bell className="w-10 h-10 text-slate-350 mx-auto mb-3" />
          <p className="text-xs font-black text-slate-500">صندوق الوارد نظيف تماماً!</p>
          <p className="text-[10px] text-slate-400 mt-1">سوف تظهر التنبيهات الفورية هنا بمجرد اتخاذ أي إجراءات دعم أو جودة</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unread Section */}
          {unreadNotifs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-rose-600 flex items-center gap-1.5 border-b border-rose-50 pb-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>تنبيهات عاجلة وغير مقروءة ({unreadNotifs.length})</span>
              </h3>

              <div className="space-y-3">
                {unreadNotifs.map((n) => (
                  <div
                    key={n.id}
                    className="p-4 bg-rose-50/20 border-r-4 border-rose-500 bg-white border border-slate-200/60 rounded-xl transition-all hover:shadow-xs flex gap-3.5 items-start justify-between relative"
                  >
                    <div className="flex gap-3">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 mt-0.5 flex-shrink-0">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 leading-tight">
                          {n.title}
                        </h4>
                        <p className="text-[10px] text-slate-600 mt-1 leading-relaxed text-justify">
                          {n.message}
                        </p>
                        <span className="text-[8px] text-slate-400 font-mono block mt-2">
                          {new Date(n.createdAt).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded-lg transition-all cursor-pointer"
                        title="تعليم كمقروء"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNotification(n.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                        title="حذف وإزالة هذا التنبيه يدوياً"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Read Section */}
          {readNotifs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-500 border-b border-slate-100 pb-2">
                <span>تنبيهات مقروءة وسابقة ({readNotifs.length})</span>
              </h3>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {readNotifs.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 bg-slate-50/40 border border-slate-150 rounded-xl flex gap-3 items-start justify-between opacity-80"
                  >
                    <div className="flex gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-100 mt-0.5 flex-shrink-0">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 leading-tight">
                          {n.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {n.message}
                        </p>
                        <span className="text-[8px] text-slate-400 font-mono block mt-1.5">
                          {new Date(n.createdAt).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteNotification(n.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                      title="حذف وإزالة هذا التنبيه يدوياً"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

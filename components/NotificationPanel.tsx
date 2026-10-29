import React from 'react';
import { NotificationItem, ViewState } from '../types';
import { X, Bell, AlertTriangle, Clock, Info, Check, ChevronRight } from 'lucide-react';

interface NotificationPanelProps {
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNavigate: (view: ViewState) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  notifications, 
  onClose, 
  onMarkAsRead, 
  onMarkAllAsRead,
  onNavigate
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle size={16} className="text-red-500" />;
      case 'schedule': return <Clock size={16} className="text-blue-500" />;
      default: return <Info size={16} className="text-gray-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'alert': return 'bg-red-50 border-red-100';
      case 'schedule': return 'bg-blue-50 border-blue-100';
      default: return 'bg-gray-50 border-gray-100';
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    onMarkAsRead(notification.id);
    if (notification.targetView) {
      onNavigate(notification.targetView);
      onClose();
    }
  };

  return (
    <div className="absolute right-0 top-14 w-80 md:w-96 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-200 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden ring-1 ring-black/5">
      {/* Header - Sólido para não vazar conteúdo ao scrollar */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-gray-700" />
          <h3 className="font-bold text-gray-800">Notificações</h3>
          {unreadCount > 0 && (
            <span className="bg-brand-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
              {unreadCount} nova(s)
            </span>
          )}
        </div>
        <div className="flex gap-2">
           <button 
            onClick={onMarkAllAsRead}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium px-2 py-1 rounded hover:bg-brand-50 transition-colors"
          >
            Ler todas
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200 overscroll-contain">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div 
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-3 mb-2 rounded-lg border cursor-pointer transition-all relative group ${
                notification.read ? 'bg-white border-transparent opacity-70 hover:opacity-100 hover:bg-gray-50' : getBgColor(notification.type) + ' shadow-sm'
              }`}
            >
              <div className="flex gap-3 items-start">
                <div className={`mt-1 p-1.5 rounded-full bg-white shadow-sm shrink-0 border border-gray-100`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-bold truncate ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                    {notification.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed line-clamp-2">
                    {notification.message}
                  </p>
                  <span className="text-[10px] text-gray-400 mt-2 block font-medium">
                    {notification.time}
                  </span>
                </div>
                {notification.targetView && (
                   <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-600 self-center transition-colors" />
                )}
                {!notification.read && !notification.targetView && (
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-2 shrink-0 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-gray-400">
            <Bell size={32} className="mx-auto mb-3 opacity-10" />
            <p className="text-sm font-medium">Nenhuma notificação no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};
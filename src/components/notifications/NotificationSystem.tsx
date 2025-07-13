import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Brain, Star, Bell, CheckCircle } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { Notification } from '../../types';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'quiz_result':
        return Brain;
      case 'achievement':
        return Trophy;
      case 'reminder':
        return Bell;
      case 'broadcast':
        // Check if it's a lesson approval notification
        if (notification.data?.icon === 'check-circle') {
          return CheckCircle;
        }
        return Star;
      default:
        return Star;
    }
  };

  const getColors = () => {
    // Special styling for lesson approval notifications
    if (notification.type === 'broadcast' && notification.data?.icon === 'check-circle') {
      return 'from-green-500 to-emerald-600';
    }
    
    switch (notification.priority) {
      case 'high':
        return 'from-error-500 to-error-600';
      case 'medium':
        return 'from-warning-500 to-warning-600';
      default:
        return 'from-primary-500 to-primary-600';
    }
  };

  const Icon = getIcon();

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
      className="bg-white rounded-lg shadow-2xl border border-gray-100 p-4 max-w-sm w-full"
    >
      <div className="flex items-start space-x-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${getColors()} rounded-full flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            {notification.title}
          </h4>
          <p className="text-sm text-gray-600">
            {notification.message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export const NotificationSystem: React.FC = () => {
  const { notifications, markNotificationRead } = useData();
  const { user } = useAuth();
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    const userNotifications = notifications.filter(
      n => n.userId === user.id && !n.readStatus
    );

    // Show new notifications
    const newNotifications = userNotifications.filter(
      n => !visibleNotifications.some(vn => vn.id === n.id)
    );

    if (newNotifications.length > 0) {
      setVisibleNotifications(prev => [...prev, ...newNotifications.slice(-3)]);
    }
  }, [notifications, user, visibleNotifications]);

  const handleClose = (notificationId: string) => {
    markNotificationRead(notificationId);
    setVisibleNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    const timers = visibleNotifications.map(notification => 
      setTimeout(() => {
        handleClose(notification.id);
      }, 5000)
    );

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [visibleNotifications]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {visibleNotifications.map(notification => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationToast
              notification={notification}
              onClose={() => handleClose(notification.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
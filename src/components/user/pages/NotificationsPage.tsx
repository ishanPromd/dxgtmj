import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faFileText, faRss, faBell, faUser, faSignOutAlt,
  faStar, faCheck, faExclamationCircle, faInfoCircle, faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { useData } from '../../../hooks/useData';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import toast from 'react-hot-toast';

interface NotificationsPageProps {
  onNavigate: (tab: string) => void;
  activeTab: string;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate, activeTab }) => {
  const { notifications, markNotificationRead, fetchUserNotifications } = useData();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  // Memoize user notifications
  const userNotifications = useMemo(() => 
    notifications.filter(n => n.userId === user?.id),
    [notifications, user?.id]
  );

  // Memoize unread notifications
  const unreadNotifications = useMemo(() => 
    userNotifications.filter(n => !n.readStatus),
    [userNotifications]
  );

  // Memoize bottom nav items
  const bottomNavItems = useMemo(() => [
    { id: 'home', name: 'Home', icon: faHome },
    { id: 'recent', name: 'Recent', icon: faFileText },
    { id: 'lessons', name: 'Lessons', icon: faRss },
    { id: 'my-lessons', name: 'My Lessons', icon: faUser },
    { id: 'notifications', name: 'Notifications', icon: faBell },
  ], []);

  const handleNotificationClick = useCallback(async (notification: any) => {
    if (!notification.readStatus) {
      await markNotificationRead(notification.id);
    }
  }, [markNotificationRead]);

  const markAllAsRead = useCallback(async () => {
    if (unreadNotifications.length === 0) return;
    
    setLoading(true);
    try {
      for (const notification of unreadNotifications) {
        await markNotificationRead(notification.id);
      }
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    } finally {
      setLoading(false);
    }
  }, [unreadNotifications, markNotificationRead]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'quiz_result':
        return faCheck;
      case 'achievement':
        return faStar;
      case 'reminder':
        return faExclamationCircle;
      case 'broadcast':
        return faInfoCircle;
      default:
        return faBell;
    }
  };

  const getNotificationIconForData = (notification: any) => {
    // Check for special notification types based on data
    if (notification.type === 'broadcast' && notification.data?.icon === 'check-circle') {
      return faCheckCircle;
    }
    return getNotificationIcon(notification.type);
  };
  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'high') return 'text-red-600 bg-red-100';
    if (priority === 'medium') return 'text-yellow-600 bg-yellow-100';
    
    switch (type) {
      case 'quiz_result':
        return 'text-green-600 bg-green-100';
      case 'achievement':
        return 'text-purple-600 bg-purple-100';
      case 'reminder':
        return 'text-orange-600 bg-orange-100';
      case 'broadcast':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getNotificationColorForData = (notification: any) => {
    // Special styling for lesson approval notifications
    if (notification.type === 'broadcast' && notification.data?.icon === 'check-circle') {
      return 'text-green-600 bg-green-100';
    }
    return getNotificationColor(notification.type, notification.priority);
  };
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="error" size="sm">High</Badge>;
      case 'medium':
        return <Badge variant="warning" size="sm">Medium</Badge>;
      case 'low':
        return <Badge variant="gray" size="sm">Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-4 py-6 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-700 p-6 text-white mb-6"
        >
          <div className="absolute top-4 right-4 w-12 h-12 bg-white/10 rounded-full"></div>
          <div className="absolute top-7 right-7 w-6 h-6 bg-white/20 rounded-full"></div>
          <div className="absolute bottom-4 right-10 w-3 h-3 bg-white/15 rounded-full"></div>
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h2 className="text-lg font-bold mb-3">Notifications</h2>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm text-xs px-3 py-1.5 ml-2"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="w-3 h-3 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Notifications Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            {unreadNotifications.length > 0 && (
              <p className="text-sm text-gray-600">
                {unreadNotifications.length} unread notification{unreadNotifications.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadNotifications.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={markAllAsRead}
              loading={loading}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {userNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-2xl"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faBell} className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600 text-sm">You're all caught up! New notifications will appear here.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {userNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl p-4 shadow-sm border transition-all duration-300 cursor-pointer hover:shadow-md relative overflow-hidden ${
                    notification.readStatus ? 'border-gray-100' : 'border-blue-200 bg-blue-50/30'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Premium animation background for unread notifications */}
                  {!notification.readStatus && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10"
                      animate={{
                        background: [
                          'linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.1))',
                          'linear-gradient(45deg, rgba(236, 72, 153, 0.1), rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
                          'linear-gradient(45deg, rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.1), rgba(59, 130, 246, 0.1))',
                        ]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                  
                  <div className="flex items-start space-x-3 relative z-10">
                    <div className="relative flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg relative ${getNotificationColorForData(notification)}`}>
                        <FontAwesomeIcon icon={getNotificationIconForData(notification)} className="w-5 h-5" />
                        <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-blue-300 rounded-full opacity-60"></div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-300 rounded-full opacity-40"></div>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2 ml-2">
                          {getPriorityBadge(notification.priority)}
                          {!notification.readStatus && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"
                            />
                          )}
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {new Date(notification.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {notification.message}
                      </p>
                      
                      {/* Notification Type Badge */}
                      <div className="mt-2">
                        <Badge 
                          variant={notification.type === 'broadcast' ? 'primary' : 'gray'} 
                          size="sm"
                        >
                          {notification.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200/50 z-50">
        <div className="w-full px-4">
          <nav className="flex justify-around py-2">
            {bottomNavItems.map((item) => (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/${item.id}`)}
                className={`relative flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
                  activeTab === item.id
                    ? 'text-blue-600 bg-blue-50 shadow-lg scale-105' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTabMobile"
                    className="absolute inset-0 bg-blue-100 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                {item.id === 'notifications' && unreadNotifications.length > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                  >
                    {unreadNotifications.length}
                  </motion.div>
                )}
              </motion.button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from "react";
import { useAuthState } from "../../hooks/useAuth";
import { paymentNotificationService } from "../../services/paymentAPI";
import { Card } from "../ui/Card";
import toast from "react-hot-toast";
import {
  Bell,
  Check,
  X,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  MarkAsRead,
} from "lucide-react";

const NotificationCenter = ({ isOpen, onClose }) => {
  const { user } = useAuthState();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !isOpen) return undefined;

    loadNotifications();
    const pollId = window.setInterval(loadNotifications, 8000);

    return () => {
      window.clearInterval(pollId);
    };
  }, [user, isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await paymentNotificationService.getUserNotifications(
        user.id,
      );

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const showToastNotification = (notification) => {
    const message = notification.message;

    switch (notification.notification_type) {
      case "payment_submitted":
        toast(message, { icon: "💳" });
        break;
      case "payment_approved":
        toast.success(message);
        break;
      case "payment_rejected":
        toast.error(message);
        break;
      default:
        toast(message);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await paymentNotificationService.markAsRead(notificationId, user.id);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await paymentNotificationService.markAllAsRead(user.id);

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await paymentNotificationService.deleteNotification(
        notificationId,
        user.id,
      );

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => {
        const notification = notifications.find((n) => n.id === notificationId);
        return notification && !notification.is_read ? prev - 1 : prev;
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      payment_submitted: { icon: DollarSign, color: "text-blue-400" },
      payment_approved: { icon: CheckCircle, color: "text-green-400" },
      payment_rejected: { icon: XCircle, color: "text-red-400" },
      payment_pending: { icon: Clock, color: "text-yellow-400" },
    };

    const { icon: Icon, color } = iconMap[type] || {
      icon: Bell,
      color: "text-gray-400",
    };
    return <Icon className={`w-5 h-5 ${color}`} />;
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-gray-900 w-full max-w-md h-full shadow-xl">
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <Bell className="w-5 h-5 me-2" />
              Notifications
              {unreadCount > 0 && (
                <span className="ms-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm flex items-center"
            >
              <MarkAsRead className="w-4 h-4 me-1" />
              Mark all as read
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-800 p-4 rounded-lg">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : notifications.length > 0 ? (
            <div className="p-4 space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-all ${
                    notification.is_read
                      ? "bg-gray-800 border-gray-700"
                      : "bg-gray-700 border-blue-600"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      {getNotificationIcon(notification.notification_type)}
                      <span className="ms-2 text-white text-sm font-medium">
                        {notification.title}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-xs">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-3">
                    {notification.message}
                  </p>

                  {notification.payment_submission && (
                    <div className="bg-gray-900 p-3 rounded text-xs text-gray-400">
                      <p>Amount: ${notification.payment_submission.amount}</p>
                      <p>
                        Method:{" "}
                        {
                          notification.payment_submission.payment_method
                            ?.method_name
                        }
                      </p>
                    </div>
                  )}

                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="mt-2 text-blue-400 hover:text-blue-300 text-xs flex items-center"
                    >
                      <Check className="w-3 h-3 me-1" />
                      Mark as read
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-gray-400 text-lg mb-2">No notifications</h3>
              <p className="text-gray-500 text-sm">
                You'll see payment updates and other notifications here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;

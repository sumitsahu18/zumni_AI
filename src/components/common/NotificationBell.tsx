import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  ShieldAlert,
  TrendingUp,
  Users,
  Megaphone,
  Briefcase,
  Share2,
  SearchCheck,
  Sparkles,
  Package,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Info,
  Award,
  Zap,
  Bookmark,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../api/client';
import './NotificationBell.css';

export interface NotificationItem {
  id: string;
  userId?: string | null;
  role?: string | null;
  title: string;
  message: string;
  category: string;
  time: string;
  createdAt?: string;
  isRead: boolean;
  priority?: 'high' | 'normal' | 'low';
  iconType?: string;
}

export interface ContextMeta {
  label: string;
  badgeColor: string;
  badgeBg: string;
}

/**
 * UI Header Pill Metadata (Role & Navigation Context)
 * Strictly visual styling and labels — zero mock notification records.
 */
const getContextMeta = (role?: string, pathname: string = ''): ContextMeta => {
  if (role === 'SUPER_ADMIN' || pathname.startsWith('/super-admin')) {
    return {
      label: 'Super Admin Alerts',
      badgeColor: '#8B5CF6',
      badgeBg: '#F3F0FF'
    };
  }

  if (role === 'ADMIN' || pathname.startsWith('/admin')) {
    return {
      label: 'Operations Hub Alerts',
      badgeColor: '#635BFF',
      badgeBg: '#EEF2FF'
    };
  }

  if (pathname.startsWith('/ads')) {
    return {
      label: 'Ads Platform Alerts',
      badgeColor: '#A855F7',
      badgeBg: '#FAF5FF'
    };
  }

  if (pathname.startsWith('/business')) {
    return {
      label: 'Business & CRM Alerts',
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5'
    };
  }

  if (pathname.startsWith('/social')) {
    return {
      label: 'Social Scheduler Alerts',
      badgeColor: '#6E56CF',
      badgeBg: '#F3F0FF'
    };
  }

  if (pathname.startsWith('/seo')) {
    return {
      label: 'SEO Workspace Alerts',
      badgeColor: '#8B5CF6',
      badgeBg: '#F3F0FF'
    };
  }

  if (pathname.startsWith('/creator')) {
    return {
      label: 'Creator Studio Alerts',
      badgeColor: '#EC4899',
      badgeBg: '#FDF2F8'
    };
  }

  if (pathname.startsWith('/warehouse')) {
    return {
      label: 'AI Warehouse Alerts',
      badgeColor: '#D97706',
      badgeBg: '#FEF3C7'
    };
  }

  return {
    label: 'User Workspace Alerts',
    badgeColor: '#0EA5E9',
    badgeBg: '#F0F9FF'
  };
};

/**
 * Dynamically computes relative time strings from MySQL timestamps
 */
function formatRelativeTime(dateInput?: string | Date): string {
  if (!dateInput) return 'just now';
  const past = new Date(dateInput).getTime();
  if (isNaN(past)) return 'recently';
  const now = Date.now();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

const renderNotificationIcon = (iconType?: string, _category?: string) => {
  switch (iconType) {
    case 'security':
      return <ShieldAlert size={16} color="#EF4444" />;
    case 'revenue':
    case 'earnings':
      return <TrendingUp size={16} color="#10B981" />;
    case 'telemetry':
      return <Zap size={16} color="#8B5CF6" />;
    case 'audit':
      return <Clock size={16} color="#6366F1" />;
    case 'user':
    case 'team':
      return <Users size={16} color="#3B82F6" />;
    case 'review':
    case 'creator':
      return <Award size={16} color="#EC4899" />;
    case 'support':
      return <Info size={16} color="#F59E0B" />;
    case 'warehouse':
    case 'storage':
    case 'collections':
      return <Package size={16} color="#D97706" />;
    case 'ads':
      return <Megaphone size={16} color="#A855F7" />;
    case 'crm':
      return <Briefcase size={16} color="#059669" />;
    case 'social':
    case 'queue':
      return <Share2 size={16} color="#6E56CF" />;
    case 'seo':
      return <SearchCheck size={16} color="#7C3AED" />;
    case 'chat':
    case 'sparkles':
      return <Sparkles size={16} color="#0EA5E9" />;
    case 'library':
      return <Bookmark size={16} color="#6366F1" />;
    case 'billing':
    case 'usage':
      return <CreditCard size={16} color="#0284C7" />;
    default:
      return <Bell size={16} color="#6E56CF" />;
  }
};

export const NotificationBell: React.FC = () => {
  const { user } = useApp();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute context meta based on current role and pathname
  const contextMeta = useMemo(() => {
    return getContextMeta(user?.role, location.pathname);
  }, [user?.role, location.pathname]);

  // Dynamic notifications: 100% sourced from MySQL Database via Express API
  const fetchDynamicNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.getNotifications();
      if (res && res.success && Array.isArray(res.notifications)) {
        const mapped: NotificationItem[] = res.notifications.map((n: any) => ({
          id: String(n.id),
          userId: n.userId || n.user_id || null,
          role: n.role || null,
          title: n.title,
          message: n.message,
          category: n.category || 'General',
          time: formatRelativeTime(n.createdAt || n.created_at),
          createdAt: n.createdAt || n.created_at,
          isRead: Boolean(n.isRead ?? n.is_read),
          priority: n.priority || 'normal',
          iconType: n.iconType || n.icon_type || 'bell'
        }));

        // Deduplicate records by ID
        const unique = new Map<string, NotificationItem>();
        mapped.forEach((item) => unique.set(item.id, item));
        setNotifications(Array.from(unique.values()));
      } else {
        setError(res?.error || 'Failed to load notifications from database.');
        setNotifications([]);
      }
    } catch (err: any) {
      console.warn('Notifications fetch error:', err);
      setError(err?.message || 'Unable to connect to notification service.');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch real notifications on initial mount and when user identity changes (never on route changes)
  useEffect(() => {
    fetchDynamicNotifications();
  }, [user?.id, user?.role, fetchDynamicNotifications]);

  // Re-fetch latest timestamps & notifications whenever dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchDynamicNotifications();
    }
  }, [isOpen, fetchDynamicNotifications]);

  // Close on outside click or escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const handleToggleRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    if (!target) return;
    const previousStatus = target.isRead;
    const newStatus = !previousStatus;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: newStatus } : n))
    );

    try {
      await apiClient.markNotificationRead(id);
    } catch (err) {
      // Rollback on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: previousStatus } : n))
      );
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const previousState = [...notifications];
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await apiClient.markAllNotificationsRead();
    } catch (err) {
      // Rollback on failure
      setNotifications(previousState);
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const previousState = [...notifications];
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      await apiClient.deleteNotification(id);
    } catch (err) {
      // Rollback on failure
      setNotifications(previousState);
    }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const previousState = [...notifications];
    setNotifications([]);

    try {
      await apiClient.clearAllNotifications();
    } catch (err) {
      // Rollback on failure
      setNotifications(previousState);
    }
  };

  return (
    <div className="notification-bell-container" ref={containerRef} style={{ position: 'relative' }}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="View notifications"
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <Bell size={18} className="bell-icon" />
        {unreadCount > 0 && (
          <span className="notification-badge-counter" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="notification-dropdown-backdrop"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="notification-dropdown-panel" role="dialog" aria-label="Notifications panel">
            {/* Header */}
            <div className="notification-panel-header">
              <div className="notification-header-title-row">
                <div className="notification-title-group">
                  <span className="notification-main-title">Notifications</span>
                  <span
                    className="notification-context-pill"
                    style={{
                      color: contextMeta.badgeColor,
                      backgroundColor: contextMeta.badgeBg,
                      borderColor: `${contextMeta.badgeColor}33`
                    }}
                  >
                    {contextMeta.label}
                  </span>
                </div>

                <div className="notification-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="notif-refresh-icon-btn"
                    onClick={() => fetchDynamicNotifications()}
                    title="Refresh from database"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748B',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px'
                    }}
                  >
                    <RefreshCw size={13} className={isLoading ? 'notif-spin' : ''} />
                  </button>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="notification-action-btn"
                      onClick={handleMarkAllRead}
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="notification-filter-tabs">
                <button
                  type="button"
                  className={`notif-filter-tab ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  className={`notif-filter-tab ${filter === 'unread' ? 'active' : ''}`}
                  onClick={() => setFilter('unread')}
                >
                  Unread ({unreadCount})
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="notification-list-body">
              {isLoading && notifications.length === 0 ? (
                <div className="notification-loading-state">
                  <div className="notif-loading-spinner" />
                  <span className="notif-loading-text">Loading notifications...</span>
                </div>
              ) : error ? (
                <div className="notification-error-state">
                  <div className="error-icon-wrap">
                    <AlertTriangle size={24} color="#EF4444" />
                  </div>
                  <div className="empty-title">Failed to load notifications</div>
                  <div className="empty-desc">{error}</div>
                  <button
                    type="button"
                    className="notif-retry-btn"
                    onClick={() => fetchDynamicNotifications()}
                  >
                    Retry
                  </button>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="notification-empty-state">
                  <div className="empty-icon-wrap">
                    <CheckCircle2 size={24} color="#10B981" />
                  </div>
                  <div className="empty-title">All caught up!</div>
                  <div className="empty-desc">
                    {filter === 'unread'
                      ? 'No unread notifications right now.'
                      : 'No new notifications.'}
                  </div>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                    onClick={(e) => handleToggleRead(notif.id, e)}
                  >
                    <div className="notification-item-icon-box">
                      {renderNotificationIcon(notif.iconType, notif.category)}
                    </div>

                    <div className="notification-item-content">
                      <div className="notification-item-top">
                        <span className="notif-category-tag">{notif.category}</span>
                        <span className="notif-timestamp">{notif.time}</span>
                      </div>

                      <div className="notif-title">{notif.title}</div>
                      <div className="notif-message">{notif.message}</div>
                    </div>

                    <div className="notification-item-actions">
                      {!notif.isRead && (
                        <div className="unread-dot" title="Unread" />
                      )}
                      <button
                        type="button"
                        className="notif-item-delete-btn"
                        onClick={(e) => handleDeleteItem(notif.id, e)}
                        title="Dismiss notification"
                        aria-label="Dismiss"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="notification-panel-footer">
                <span className="notif-footer-stats">
                  {unreadCount} unread • {notifications.length} total
                </span>
                <button
                  type="button"
                  className="notif-clear-all-btn"
                  onClick={handleClearAll}
                >
                  <Trash2 size={13} />
                  <span>Clear All</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

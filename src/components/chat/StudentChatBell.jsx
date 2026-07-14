import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMessageCircle, FiX } from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  isStudentUser,
  shouldShowStudentChatBell,
  resolveUserRole,
} from "../../lib/roles";
import {
  enrollmentService,
  notificationService,
  chatService,
} from "../../services/api";
import { paymentService } from "../../services/paymentAPI";
import { useTranslation } from "react-i18next";

const isChatNotification = (notification) =>
  notification?.action_url?.includes("tab=chat") ||
  /رسالة|message|chat/i.test(
    `${notification?.title || ""} ${notification?.message || ""}`,
  );

const StudentChatBell = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isAr = language === "ar";
  const panelRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [chatAlerts, setChatAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = Math.max(
    chatAlerts.filter((item) => !item.is_read).length,
    courses.reduce((sum, course) => sum + (course.unread_count || 0), 0),
  );

  const loadChatData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [inbox, enrollments, payments, notifications] = await Promise.all([
        chatService.getStudentChatInbox().catch(() => []),
        enrollmentService.getUserEnrollments().catch(() => []),
        paymentService.getStudentPaymentSubmissions(user.id).catch(() => []),
        notificationService
          .getUserNotifications(user.id, { limit: 20 })
          .catch(() => []),
      ]);

      const courseMap = new Map();

      (inbox || []).forEach((row) => {
        if (row.course_id) {
          courseMap.set(row.course_id, {
            id: row.course_id,
            title: row.title || t("studentChatBell.course_1"),
            thumbnail_url: row.thumbnail_url,
            message_count: row.message_count || 0,
            unread_count: row.unread_count || 0,
            last_message_at: row.last_message_at,
          });
        }
      });
      (enrollments || []).forEach((row) => {
        if (row.course?.id) {
          const existing = courseMap.get(row.course.id);
          courseMap.set(row.course.id, {
            id: row.course.id,
            title: row.course.title,
            thumbnail_url: row.course.thumbnail_url,
            message_count: existing?.message_count || 0,
            unread_count: existing?.unread_count || 0,
            last_message_at: existing?.last_message_at,
          });
        }
      });
      (payments || []).forEach((row) => {
        const courseId = row.course_id || row.courses?.id;
        if (courseId) {
          const existing = courseMap.get(courseId);
          courseMap.set(courseId, {
            id: courseId,
            title:
              row.courses?.title ||
              existing?.title ||
              t("studentChatBell.course"),
            thumbnail_url:
              row.courses?.thumbnail_url || existing?.thumbnail_url,
            message_count: existing?.message_count || 0,
            unread_count: existing?.unread_count || 0,
            last_message_at: existing?.last_message_at,
          });
        }
      });

      const sortedCourses = Array.from(courseMap.values()).sort((a, b) => {
        if ((b.message_count || 0) !== (a.message_count || 0)) {
          return (b.message_count || 0) - (a.message_count || 0);
        }
        return (
          new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
        );
      });

      setCourses(sortedCourses);
      setChatAlerts((notifications || []).filter(isChatNotification));
    } catch (err) {
      console.error("Failed to load chat bell data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !shouldShowStudentChatBell(user)) return;
    loadChatData();
    const pollId = window.setInterval(loadChatData, 10000);
    return () => window.clearInterval(pollId);
  }, [isAuthenticated, user?.id, user?.role]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const openChat = async (courseId, notification = null) => {
    if (notification?.id && !notification.is_read) {
      await notificationService.markAsRead(notification.id).catch(() => {});
    }
    setOpen(false);
    navigate(`/courses/${courseId}/learn?tab=chat`);
  };

  if (!isAuthenticated || !shouldShowStudentChatBell(user)) return null;

  return (
    <div className="position-relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) loadChatData();
        }}
        className="btn btn-light position-relative rounded-circle p-2"
        title={t("dashboardExtra.instructorChat")}
        aria-label={t("dashboardExtra.instructorChat")}
      >
        <FiMessageCircle size={20} />

        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="dropdown-menu d-block shadow border rounded-3 p-0 mt-2"
          style={{
            width: "100%",
            minWidth: "320px",
            maxWidth: "420px",
            right: 0,
            left: "auto",
            position: "absolute",
            zIndex: 1055,
          }}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center border-bottom p-3">
            <h6 className="mb-0">{t("dashboardExtra.instructorChat")}</h6>

            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setOpen(false)}
            >
              <FiX />
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              maxHeight: "420px",
              overflowY: "auto",
            }}
          >
            {loading ? (
              <div className="text-center py-5">
                <div
                  className="spinner-border spinner-border-sm text-primary mb-2"
                  role="status"
                />
                <p className="mb-0 small">{t("studentChatBell.loading")}</p>
              </div>
            ) : (
              <>
                {/* Alerts */}
                {chatAlerts.length > 0 && (
                  <div className="border-bottom p-3">
                    <small className="text-primary fw-bold d-block mb-3">
                      {t("studentChatBell.newMessages")}
                    </small>

                    {chatAlerts.slice(0, 5).map((alert) => {
                      const courseId =
                        alert.course_id ||
                        alert.action_url?.match(/\/courses\/([^/]+)/)?.[1];

                      return (
                        <button
                          key={alert.id}
                          type="button"
                          className={`btn w-100 text-start mb-2 ${
                            alert.is_read ? "btn-light" : "btn-primary"
                          }`}
                          onClick={() => courseId && openChat(courseId, alert)}
                        >
                          <div className="fw-semibold">{alert.title}</div>

                          <small className="text-muted d-block text-truncate">
                            {alert.message}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Courses */}
                <div className="p-3">
                  <small className="text-secondary fw-bold d-block mb-3">
                    {t("studentChatBell.openCourseChat")}
                  </small>

                  {courses.length === 0 ? (
                    <div className="text-center">
                      <p className="small text-muted">
                        {t("studentChatBell.browseCoursesAndUseChatWithIns")}
                      </p>

                      <Link
                        to="/courses"
                        className="btn btn-primary btn-sm"
                        onClick={() => setOpen(false)}
                      >
                        {t("dashboardExtra.browseCoursesLink")}
                      </Link>
                    </div>
                  ) : (
                    courses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        className="btn btn-light border w-100 d-flex align-items-center justify-content-between mb-2"
                        onClick={() => openChat(course.id)}
                      >
                        <div className="d-flex align-items-center flex-grow-1 overflow-hidden">
                          <FiMessageCircle className="text-primary me-2 flex-shrink-0" />

                          <span className="text-truncate">{course.title}</span>
                        </div>

                        {(course.unread_count > 0 ||
                          course.message_count > 0) && (
                          <span className="badge bg-primary rounded-pill ms-2">
                            {course.unread_count > 0
                              ? course.unread_count
                              : course.message_count}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentChatBell;

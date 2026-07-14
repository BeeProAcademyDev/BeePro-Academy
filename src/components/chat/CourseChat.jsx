import { useCallback, useEffect, useRef, useState } from "react";
import { FiMessageCircle, FiSend, FiUser } from "react-icons/fi";
import { chatService } from "../../services/api";
import { requireInstructor } from "../../lib/authGuards";
import "./CourseChat.css";
import { useTranslation } from "react-i18next";

const CourseChat = ({
  courseId,
  instructorId,
  user,
  language = "ar",
  hasAccess = true,
}) => {
  const { t } = useTranslation();
  const [roster, setRoster] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const activeConversationRef = useRef(null);
  const messageIdsRef = useRef(new Set());

  const isAr = language === "ar";
  const isInstructor = user?.id === instructorId || requireInstructor(user);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const applyMessages = useCallback(
    (items, { scroll = true } = {}) => {
      const next = items || [];
      messageIdsRef.current = new Set(next.map((item) => item.id));
      setMessages(next);
      if (scroll) {
        setTimeout(scrollToBottom, 80);
      }
    },
    [scrollToBottom],
  );

  const appendMessage = useCallback(
    (incoming) => {
      if (!incoming?.id) return;
      if (messageIdsRef.current.has(incoming.id)) return;

      messageIdsRef.current.add(incoming.id);
      setMessages((prev) => [...prev, incoming]);
      setTimeout(scrollToBottom, 80);
    },
    [scrollToBottom],
  );

  const loadMessages = useCallback(
    async (conversationId, { scroll = true } = {}) => {
      const data = await chatService.getMessages(conversationId);
      applyMessages(data || [], { scroll });
      if (user?.id) {
        await chatService.markMessagesAsRead(conversationId, user.id);
      }
    },
    [applyMessages, user?.id],
  );

  const openConversation = useCallback(
    async (conversation) => {
      if (!conversation?.id) return;
      setActiveConversation(conversation);
      await loadMessages(conversation.id);
    },
    [loadMessages],
  );

  const openStudentChat = useCallback(
    async (studentEntry) => {
      if (!courseId || !studentEntry?.user_id) return;

      setError("");
      try {
        const conversation = await chatService.getOrCreateConversation({
          courseId,
          studentId: studentEntry.user_id,
          instructorId,
        });
        setActiveConversation(conversation);
        setConversations((prev) => {
          const exists = prev.some((item) => item.id === conversation.id);
          return exists ? prev : [conversation, ...prev];
        });
        setRoster((prev) =>
          prev.map((entry) =>
            entry.user_id === studentEntry.user_id
              ? { ...entry, conversation_id: conversation.id }
              : entry,
          ),
        );
        await loadMessages(conversation.id);
      } catch (err) {
        setError(err.message || t("courseChat.failedToOpenConversation"));
      }
    },
    [courseId, instructorId, isAr, loadMessages],
  );

  const initStudentChat = useCallback(async () => {
    if (!courseId || !user?.id || !instructorId) {
      throw new Error(t("courseChat.courseOrInstructorDataIsMissin"));
    }

    const conversation = await chatService.getOrCreateConversation({
      courseId,
      studentId: user.id,
      instructorId,
    });

    if (!conversation?.id) {
      throw new Error(t("courseChat.couldNotOpenChatConversation"));
    }

    setActiveConversation(conversation);
    setConversations([conversation]);
    await loadMessages(conversation.id);
    return conversation;
  }, [courseId, user?.id, instructorId, isAr, loadMessages]);

  const initChat = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (isInstructor) {
        const paidStudents =
          await chatService.getInstructorChatRoster(courseId);
        setRoster(paidStudents || []);

        const list = await chatService.getInstructorConversations(courseId);
        setConversations(list || []);

        const firstWithConversation = (paidStudents || []).find(
          (entry) => entry.conversation_id,
        );
        if (firstWithConversation?.conversation_id) {
          const existing = (list || []).find(
            (item) => item.id === firstWithConversation.conversation_id,
          );
          if (existing) {
            await openConversation(existing);
          } else {
            await openStudentChat(firstWithConversation);
          }
        }
      } else {
        await initStudentChat();
      }
    } catch (err) {
      console.error("Chat init error:", err);
      setError(err.message || t("courseChat.failedToLoadChat"));
    } finally {
      setLoading(false);
    }
  }, [
    courseId,
    isInstructor,
    isAr,
    openConversation,
    openStudentChat,
    initStudentChat,
  ]);

  useEffect(() => {
    if (!courseId || !user?.id || !hasAccess) {
      setLoading(false);
      return;
    }

    if (!instructorId) {
      setLoading(true);
      return;
    }

    initChat();
  }, [courseId, user?.id, instructorId, hasAccess, initChat]);

  useEffect(() => {
    if (!courseId || !hasAccess) return undefined;

    const handleIncoming = (incoming) => {
      if (!incoming?.id) return;

      const activeId = activeConversationRef.current?.id;
      if (activeId && incoming.conversation_id === activeId) {
        appendMessage(incoming);
        if (incoming.sender_id !== user?.id) {
          chatService.markMessagesAsRead(activeId, user.id);
        }
      }

      if (isInstructor && incoming.sender_id !== user?.id) {
        setRoster((prev) =>
          prev.map((entry) =>
            entry.conversation_id === incoming.conversation_id
              ? {
                  ...entry,
                  unread_count: (entry.unread_count || 0) + 1,
                  last_message_at: incoming.created_at,
                }
              : entry,
          ),
        );
      }
    };

    return undefined;
  }, [courseId, hasAccess, user?.id, isInstructor, appendMessage]);

  useEffect(() => {
    if (!activeConversation?.id || !hasAccess) return undefined;

    const pollId = window.setInterval(() => {
      loadMessages(activeConversation.id, { scroll: false });
    }, 3000);

    return () => window.clearInterval(pollId);
  }, [activeConversation?.id, hasAccess, loadMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !activeConversation?.id || sending) return;

    setSending(true);
    setError("");

    try {
      const sent = await chatService.sendMessage({
        conversationId: activeConversation.id,
        senderId: user.id,
        content,
        courseId,
      });
      appendMessage(sent);
      setNewMessage("");
    } catch (err) {
      setError(err.message || t("courseChat.failedToSendMessage"));
    } finally {
      setSending(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="course-chat course-chat--locked">
        <FiMessageCircle className="w-6 h-6" />
        <p>{t("courseChat.youMustBeLoggedInAsARegistered")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="course-chat course-chat--loading">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const rosterItems = isInstructor
    ? roster.length > 0
      ? roster
      : conversations.map((conv) => ({
          user_id: conv.student_id,
          full_name: conv.student?.full_name,
          email: conv.student?.email,
          conversation_id: conv.id,
          unread_count: 0,
        }))
    : [];

  return (
    <div className="course-chat container-fluid py-3">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div className="d-flex align-items-center gap-2">
          <FiMessageCircle className="text-primary fs-4" />
          <h4 className="mb-0">{t("courseChat.chatWithInstructor")}</h4>
        </div>

        <span className="badge bg-secondary text-white px-3 py-2">
          {t("courseChat.chatPollingEnabled")}
        </span>
      </div>

      <div className="row g-3">
        {/* Students */}
        {isInstructor && (
          <div className="col-12 col-lg-4">
            <div className="card shadow-sm h-100">
              <div className="card-header">
                <strong>{t("courseChat.student")}</strong>
              </div>

              <div
                className="card-body p-2"
                style={{
                  maxHeight: "600px",
                  overflowY: "auto",
                }}
              >
                {rosterItems.length === 0 ? (
                  <p className="text-center text-muted mb-0">
                    {t("courseChat.noRegisteredStudentsOnThePlatf")}
                  </p>
                ) : (
                  rosterItems.map((entry) => {
                    const isActive =
                      activeConversation?.student_id === entry.user_id ||
                      activeConversation?.id === entry.conversation_id;

                    return (
                      <button
                        key={entry.user_id}
                        type="button"
                        onClick={() => {
                          if (entry.conversation_id) {
                            const existing = conversations.find(
                              (item) => item.id === entry.conversation_id,
                            );

                            if (existing) {
                              openConversation(existing);
                              return;
                            }
                          }

                          openStudentChat(entry);
                        }}
                        className={`btn w-100 text-start d-flex justify-content-between align-items-center mb-2 ${
                          isActive ? "btn-primary" : "btn-outline-secondary"
                        }`}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <FiUser />
                          <span className="text-truncate">
                            {entry.full_name ||
                              entry.email ||
                              t("courseChat.student")}
                          </span>
                        </div>

                        {entry.unread_count > 0 && (
                          <span className="badge bg-danger">
                            {entry.unread_count}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat */}
        <div className={isInstructor ? "col-12 col-lg-8" : "col-12"}>
          <div className="card shadow-sm h-100">
            <div
              className="card-body"
              style={{
                height: "65vh",
                overflowY: "auto",
              }}
            >
              {!activeConversation ? (
                <div className="h-100 d-flex justify-content-center align-items-center text-muted">
                  {isInstructor
                    ? t("courseChat.selectAStudentFromTheListToSta")
                    : error || t("courseChat.couldNotOpenTheConversation")}
                </div>
              ) : messages.length === 0 ? (
                <div className="h-100 d-flex justify-content-center align-items-center text-muted">
                  {t("courseChat.startChattingNow")}
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`d-flex mb-3 ${
                        isMine ? "justify-content-end" : "justify-content-start"
                      }`}
                    >
                      <div
                        className={`p-3 rounded shadow-sm ${
                          isMine ? "bg-primary text-white" : "bg-light"
                        }`}
                        style={{
                          maxWidth: "80%",
                          wordBreak: "break-word",
                        }}
                      >
                        <strong className="d-block mb-1">
                          {isMine
                            ? t("courseChat.you")
                            : msg.sender?.full_name ||
                              (isInstructor
                                ? t("dashboardExtra.student")
                                : t("courseChat.instructor"))}
                        </strong>

                        <p className="mb-1">{msg.content}</p>

                        <small className="opacity-75">
                          {new Date(msg.created_at).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </small>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {error && (
              <div className="alert alert-danger rounded-0 mb-0">{error}</div>
            )}

            {activeConversation && (
              <div className="card-footer">
                <form onSubmit={handleSend} className="row g-2">
                  <div className="col">
                    <input
                      className="form-control"
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t("courseChat.typeYourMessage")}
                      disabled={sending}
                    />
                  </div>

                  <div className="col-auto">
                    <button
                      className="btn btn-primary h-100"
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                    >
                      <FiSend />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseChat;

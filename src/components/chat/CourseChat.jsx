import { useCallback, useEffect, useRef, useState } from 'react'
import { FiMessageCircle, FiSend, FiUser, FiWifi, FiWifiOff } from 'react-icons/fi'
import { chatService } from '../../services/api'
import { requireInstructor } from '../../lib/authGuards'
import supabase from '../../lib/supabase'
import './CourseChat.css'

const CourseChat = ({
  courseId,
  instructorId,
  user,
  language = 'ar',
  hasAccess = true
}) => {
  const [roster, setRoster] = useState([])
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING')
  const messagesEndRef = useRef(null)
  const wsChannelRef = useRef(null)
  const dbChannelRef = useRef(null)
  const activeConversationRef = useRef(null)
  const messageIdsRef = useRef(new Set())

  const isAr = language === 'ar'
  const isInstructor = user?.id === instructorId || requireInstructor(user)

  useEffect(() => {
    activeConversationRef.current = activeConversation
  }, [activeConversation])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const applyMessages = useCallback((items, { scroll = true } = {}) => {
    const next = items || []
    messageIdsRef.current = new Set(next.map((item) => item.id))
    setMessages(next)
    if (scroll) {
      setTimeout(scrollToBottom, 80)
    }
  }, [scrollToBottom])

  const appendMessage = useCallback((incoming) => {
    if (!incoming?.id) return
    if (messageIdsRef.current.has(incoming.id)) return

    messageIdsRef.current.add(incoming.id)
    setMessages((prev) => [...prev, incoming])
    setTimeout(scrollToBottom, 80)
  }, [scrollToBottom])

  const loadMessages = useCallback(async (conversationId, { scroll = true } = {}) => {
    const data = await chatService.getMessages(conversationId)
    applyMessages(data || [], { scroll })
    if (user?.id) {
      await chatService.markMessagesAsRead(conversationId, user.id)
    }
  }, [applyMessages, user?.id])

  const openConversation = useCallback(async (conversation) => {
    if (!conversation?.id) return
    setActiveConversation(conversation)
    await loadMessages(conversation.id)
  }, [loadMessages])

  const openStudentChat = useCallback(async (studentEntry) => {
    if (!courseId || !studentEntry?.user_id) return

    setError('')
    try {
      const conversation = await chatService.getOrCreateConversation({
        courseId,
        studentId: studentEntry.user_id,
        instructorId
      })
      setActiveConversation(conversation)
      setConversations((prev) => {
        const exists = prev.some((item) => item.id === conversation.id)
        return exists ? prev : [conversation, ...prev]
      })
      setRoster((prev) =>
        prev.map((entry) =>
          entry.user_id === studentEntry.user_id
            ? { ...entry, conversation_id: conversation.id }
            : entry
        )
      )
      await loadMessages(conversation.id)
    } catch (err) {
      setError(err.message || (isAr ? 'تعذر فتح المحادثة' : 'Failed to open conversation'))
    }
  }, [courseId, instructorId, isAr, loadMessages])

  const initStudentChat = useCallback(async () => {
    if (!courseId || !user?.id || !instructorId) {
      throw new Error(isAr ? 'بيانات الكورس أو المدرس غير متاحة' : 'Course or instructor data is missing')
    }

    const conversation = await chatService.getOrCreateConversation({
      courseId,
      studentId: user.id,
      instructorId
    })

    if (!conversation?.id) {
      throw new Error(isAr ? 'تعذر فتح محادثة الدردشة' : 'Could not open chat conversation')
    }

    setActiveConversation(conversation)
    setConversations([conversation])
    await loadMessages(conversation.id)
    return conversation
  }, [courseId, user?.id, instructorId, isAr, loadMessages])

  const initChat = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (isInstructor) {
        const paidStudents = await chatService.getInstructorChatRoster(courseId)
        setRoster(paidStudents || [])

        const list = await chatService.getInstructorConversations(courseId)
        setConversations(list || [])

        const firstWithConversation = (paidStudents || []).find((entry) => entry.conversation_id)
        if (firstWithConversation?.conversation_id) {
          const existing = (list || []).find((item) => item.id === firstWithConversation.conversation_id)
          if (existing) {
            await openConversation(existing)
          } else {
            await openStudentChat(firstWithConversation)
          }
        }
      } else {
        await initStudentChat()
      }
    } catch (err) {
      console.error('Chat init error:', err)
      setError(err.message || (isAr ? 'تعذر تحميل المحادثة' : 'Failed to load chat'))
    } finally {
      setLoading(false)
    }
  }, [courseId, isInstructor, isAr, openConversation, openStudentChat, initStudentChat])

  useEffect(() => {
    if (!courseId || !user?.id || !hasAccess) {
      setLoading(false)
      return
    }

    if (!instructorId) {
      setLoading(true)
      return
    }

    initChat()
  }, [courseId, user?.id, instructorId, hasAccess, initChat])

  useEffect(() => {
    if (!courseId || !hasAccess || !supabase) return undefined

    const handleIncoming = (incoming) => {
      if (!incoming?.id) return

      const activeId = activeConversationRef.current?.id
      if (activeId && incoming.conversation_id === activeId) {
        appendMessage(incoming)
        if (incoming.sender_id !== user?.id) {
          chatService.markMessagesAsRead(activeId, user.id)
        }
      }

      if (isInstructor && incoming.sender_id !== user?.id) {
        setRoster((prev) =>
          prev.map((entry) =>
            entry.conversation_id === incoming.conversation_id
              ? { ...entry, unread_count: (entry.unread_count || 0) + 1, last_message_at: incoming.created_at }
              : entry
          )
        )
      }
    }

    const wsChannel = chatService.subscribeToCourseChat(courseId, {
      onMessage: handleIncoming,
      onStatus: setConnectionStatus
    })
    wsChannelRef.current = wsChannel

    return () => {
      if (wsChannelRef.current) {
        supabase.removeChannel(wsChannelRef.current)
        wsChannelRef.current = null
      }
    }
  }, [courseId, hasAccess, user?.id, isInstructor, appendMessage])

  useEffect(() => {
    if (!activeConversation?.id || !supabase) return undefined

    const conversationId = activeConversation.id

    const dbChannel = supabase
      .channel(`course-chat-db-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'course_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          appendMessage(payload.new)
          if (payload.new.sender_id !== user?.id) {
            chatService.markMessagesAsRead(conversationId, user.id)
          }
        }
      )
      .subscribe()

    dbChannelRef.current = dbChannel

    return () => {
      if (dbChannelRef.current) {
        supabase.removeChannel(dbChannelRef.current)
        dbChannelRef.current = null
      }
    }
  }, [activeConversation?.id, user?.id, appendMessage])

  useEffect(() => {
    if (!activeConversation?.id || !hasAccess) return undefined

    const pollId = window.setInterval(() => {
      loadMessages(activeConversation.id, { scroll: false })
    }, 3000)

    return () => window.clearInterval(pollId)
  }, [activeConversation?.id, hasAccess, loadMessages])

  const handleSend = async (e) => {
    e.preventDefault()
    const content = newMessage.trim()
    if (!content || !activeConversation?.id || sending) return

    setSending(true)
    setError('')

    try {
      const sent = await chatService.sendMessage({
        conversationId: activeConversation.id,
        senderId: user.id,
        content,
        courseId
      })
      appendMessage(sent)
      setNewMessage('')
    } catch (err) {
      setError(err.message || (isAr ? 'فشل إرسال الرسالة' : 'Failed to send message'))
    } finally {
      setSending(false)
    }
  }

  const isConnected = connectionStatus === 'SUBSCRIBED'

  if (!hasAccess) {
    return (
      <div className="course-chat course-chat--locked">
        <FiMessageCircle className="w-6 h-6" />
        <p>
          {isAr
            ? 'يجب تسجيل الدخول كطالب في المنصة لاستخدام الدردشة.'
            : 'You must be logged in as a registered student to use chat.'}
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="course-chat course-chat--loading">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const rosterItems = isInstructor
    ? (roster.length > 0 ? roster : conversations.map((conv) => ({
        user_id: conv.student_id,
        full_name: conv.student?.full_name,
        email: conv.student?.email,
        conversation_id: conv.id,
        unread_count: 0
      })))
    : []

  return (
    <div className="course-chat">
      <div className="course-chat__header">
        <div className="course-chat__header-main">
          <FiMessageCircle className="w-5 h-5 text-primary-500" />
          <h2>{isAr ? 'الدردشة المباشرة مع المدرس' : 'Real-time chat with instructor'}</h2>
        </div>
        <span className={`course-chat__status ${isConnected ? 'course-chat__status--online' : ''}`}>
          {isConnected ? <FiWifi className="w-4 h-4" /> : <FiWifiOff className="w-4 h-4" />}
          {isConnected
            ? (isAr ? 'متصل (WebSocket)' : 'Connected (WebSocket)')
            : (isAr ? 'جاري الاتصال...' : 'Connecting...')}
        </span>
      </div>

      {isInstructor && (
        <div className="course-chat__students">
          {rosterItems.length === 0 ? (
            <p className="course-chat__empty-inline">
              {isAr ? 'لا يوجد طلاب مسجّلون في المنصة بعد.' : 'No registered students on the platform yet.'}
            </p>
          ) : (
            rosterItems.map((entry) => {
              const isActive =
                activeConversation?.student_id === entry.user_id
                || activeConversation?.id === entry.conversation_id

              return (
                <button
                  key={entry.user_id}
                  type="button"
                  className={`course-chat__student-btn ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (entry.conversation_id) {
                      const existing = conversations.find((item) => item.id === entry.conversation_id)
                      if (existing) {
                        openConversation(existing)
                        return
                      }
                    }
                    openStudentChat(entry)
                  }}
                >
                  <FiUser className="w-4 h-4" />
                  <span>{entry.full_name || entry.email || (isAr ? 'طالب' : 'Student')}</span>
                  {entry.unread_count > 0 && (
                    <span className="course-chat__badge">{entry.unread_count}</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}

      {!activeConversation && isInstructor && (
        <p className="course-chat__empty">
          {isAr
            ? 'اختر طالباً من القائمة لبدء المحادثة المباشرة.'
            : 'Select a student from the list to start real-time chat.'}
        </p>
      )}

      {!activeConversation && !isInstructor && (
        <div className="course-chat__empty">
          <p>{error || (isAr ? 'تعذر فتح المحادثة.' : 'Could not open the conversation.')}</p>
          <button type="button" className="btn btn-primary btn-sm mt-3" onClick={initChat}>
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {activeConversation && (
        <>
          <div className="course-chat__messages">
            {messages.length === 0 ? (
              <p className="course-chat__empty">
                {isAr ? 'ابدأ المحادثة الآن...' : 'Start chatting now...'}
              </p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user?.id
                const senderName = isMine
                  ? (isAr ? 'أنت' : 'You')
                  : (msg.sender?.full_name || (isInstructor ? (isAr ? 'الطالب' : 'Student') : (isAr ? 'المدرس' : 'Instructor')))

                return (
                  <div
                    key={msg.id}
                    className={`course-chat__message ${isMine ? 'course-chat__message--mine' : 'course-chat__message--theirs'}`}
                  >
                    <span className="course-chat__sender">{senderName}</span>
                    <p>{msg.content}</p>
                    <time>
                      {new Date(msg.created_at).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </time>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && <p className="course-chat__error">{error}</p>}

          <form className="course-chat__input" onSubmit={handleSend}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isAr ? 'اكتب رسالتك...' : 'Type your message...'}
              disabled={sending}
            />
            <button type="submit" disabled={sending || !newMessage.trim()}>
              <FiSend className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default CourseChat

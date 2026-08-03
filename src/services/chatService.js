import supabase from '../lib/supabase'
import { isSupabaseAvailable } from './helpers'

const getCourseChatChannelName = (courseId) => `course-chat-ws-${courseId}`

/** PostgREST may return composite RPC rows as an object or a one-element array */
const normalizeRpcRow = (data) => {
  if (Array.isArray(data)) return data[0] || null
  if (data && typeof data === 'object') return data
  return null
}

export const chatService = {
  getCourseChatChannelName,

  subscribeToCourseChat(courseId, handlers = {}) {
    if (!isSupabaseAvailable() || !courseId) {
      return null
    }

    const { onMessage, onConversationUpdate, onStatus } = handlers
    const channel = supabase.channel(getCourseChatChannelName(courseId), {
      config: { broadcast: { self: true } }
    })

    if (onMessage) {
      channel.on('broadcast', { event: 'message' }, ({ payload }) => {
        onMessage(payload)
      })
    }

    if (onConversationUpdate) {
      channel.on('broadcast', { event: 'conversation' }, ({ payload }) => {
        onConversationUpdate(payload)
      })
    }

    channel.subscribe((status) => {
      onStatus?.(status)
    })

    return channel
  },

  async broadcastChatMessage(courseId, message) {
    if (!isSupabaseAvailable() || !courseId || !message) {
      return
    }

    const channel = supabase.channel(getCourseChatChannelName(courseId), {
      config: { broadcast: { self: true } }
    })

    await new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => {
        supabase.removeChannel(channel)
        resolve()
      }, 3000)

      channel.subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return

        window.clearTimeout(timeoutId)
        await channel.send({
          type: 'broadcast',
          event: 'message',
          payload: message
        })
        supabase.removeChannel(channel)
        resolve()
      })
    })
  },

  async getOrCreateConversation({ courseId, studentId, instructorId }) {
    if (!isSupabaseAvailable()) {
      return {
        id: 'mock-conversation-id',
        course_id: courseId,
        student_id: studentId,
        instructor_id: instructorId
      }
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const authUserId = sessionData?.session?.user?.id
    const isSelfStudent = authUserId && studentId === authUserId

    if (isSelfStudent) {
      const { data: myConvRaw, error: myConvError } = await supabase.rpc('get_my_course_conversation', {
        p_course_id: courseId
      })
      const myConv = normalizeRpcRow(myConvRaw)

      if (!myConvError && myConv?.id) {
        try {
          const hydrated = await this._hydrateConversation(myConv.id)
          return hydrated
        } catch {
          return myConv
        }
      }

      const myConvMissing =
        myConvError?.code === 'PGRST202' ||
        `${myConvError?.message || ''}`.toLowerCase().includes('could not find the function')

      if (!myConvMissing && myConvError) {
        console.warn('get_my_course_conversation failed:', myConvError.message)
      }
    }

    const { data: rpcRaw, error: rpcError } = await supabase.rpc('get_or_create_course_conversation', {
      p_course_id: courseId,
      p_student_id: studentId
    })
    const rpcData = normalizeRpcRow(rpcRaw)

    if (!rpcError && rpcData?.id) {
      try {
        const hydrated = await this._hydrateConversation(rpcData.id)
        return hydrated
      } catch {
        return rpcData
      }
    }

    const rpcMissing =
      rpcError?.code === 'PGRST202' ||
      `${rpcError?.message || ''}`.toLowerCase().includes('could not find the function')

    if (!rpcMissing && rpcError) {
      throw rpcError
    }

    const { data: existing, error: fetchError } = await supabase
      .from('course_conversations')
      .select(`
        *,
        student:users!student_id(id, full_name, email, avatar_url),
        instructor:users!instructor_id(id, full_name, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (existing) {
      return existing
    }

    const { data, error } = await supabase
      .from('course_conversations')
      .insert({
        course_id: courseId,
        student_id: studentId,
        instructor_id: instructorId
      })
      .select(`
        *,
        student:users!student_id(id, full_name, email, avatar_url),
        instructor:users!instructor_id(id, full_name, email, avatar_url)
      `)
      .single()

    if (error) throw error
    return data
  },

  async _hydrateConversation(conversationId) {
    const { data, error } = await supabase
      .from('course_conversations')
      .select(`
        *,
        student:users!student_id(id, full_name, email, avatar_url),
        instructor:users!instructor_id(id, full_name, email, avatar_url)
      `)
      .eq('id', conversationId)
      .single()

    if (error) throw error
    return data
  },

  async getInstructorChatRoster(courseId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase.rpc('get_instructor_course_chat_roster', {
      p_course_id: courseId
    })

    if (!error && data?.success !== false) {
      return data?.students || []
    }

    const rpcMissing =
      error?.code === 'PGRST202' ||
      `${error?.message || ''}`.toLowerCase().includes('could not find the function')

    if (!rpcMissing && data?.success === false) {
      throw new Error(data.error || 'Failed to load chat roster')
    }

    if (!rpcMissing && error) {
      throw error
    }

    const { data: registeredStudents, error: studentsError } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url, role')
      .order('full_name', { ascending: true })
      .limit(500)

    if (studentsError) throw studentsError

    const studentRows = (registeredStudents || []).filter((row) => {
      const role = (row.role || 'student').toString().trim().toLowerCase()
      return !['teacher', 'instructor', 'admin', 'pending_instructor'].includes(role)
    })

    const conversations = await this.getInstructorConversations(courseId)
    const conversationByStudent = new Map(
      (conversations || []).map((conv) => [conv.student_id, conv])
    )

    return studentRows.map((row) => {
      const conv = conversationByStudent.get(row.id)
      return {
        user_id: row.id,
        full_name: row.full_name,
        email: row.email,
        avatar_url: row.avatar_url,
        conversation_id: conv?.id || null,
        last_message_at: conv?.last_message_at || null,
        unread_count: 0
      }
    })
  },

  async getStudentChatInbox() {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_student_chat_inbox')

    if (!rpcError && Array.isArray(rpcData)) {
      return rpcData
    }

    const rpcMissing =
      rpcError?.code === 'PGRST202' ||
      `${rpcError?.message || ''}`.toLowerCase().includes('could not find the function')

    if (!rpcMissing && rpcError) {
      console.warn('get_student_chat_inbox RPC failed:', rpcError.message)
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData?.session?.user?.id
    if (!userId) return []

    const { data: conversations, error } = await supabase
      .from('course_conversations')
      .select(`
        id,
        course_id,
        last_message_at,
        course:courses(id, title, thumbnail_url)
      `)
      .eq('student_id', userId)
      .order('last_message_at', { ascending: false })

    if (error) throw error

    const enriched = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { count } = await supabase
          .from('course_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)

        return {
          conversation_id: conv.id,
          course_id: conv.course_id,
          title: conv.course?.title || conv.course_id,
          thumbnail_url: conv.course?.thumbnail_url || null,
          last_message_at: conv.last_message_at,
          message_count: count || 0,
          unread_count: 0
        }
      })
    )

    return enriched.sort((a, b) => {
      if ((b.message_count || 0) !== (a.message_count || 0)) {
        return (b.message_count || 0) - (a.message_count || 0)
      }
      return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
    })
  },

  async getInstructorConversations(courseId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase
      .from('course_conversations')
      .select(`
        *,
        student:users!student_id(id, full_name, email, avatar_url),
        instructor:users!instructor_id(id, full_name, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .order('last_message_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getMessages(conversationId, { limit = 100 } = {}) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_course_chat_messages', {
      p_conversation_id: conversationId,
      p_limit: limit
    })

    if (!rpcError && rpcData != null) {
      const rows = Array.isArray(rpcData) ? rpcData : [rpcData].filter(Boolean)
      if (rows.length > 0) {
        const hydrated = await this._hydrateMessages(rows)
        return hydrated
      }
    }

    const rpcMissing =
      rpcError?.code === 'PGRST202' ||
      `${rpcError?.message || ''}`.toLowerCase().includes('could not find the function')

    if (!rpcMissing && rpcError) {
      console.warn('get_course_chat_messages RPC failed:', rpcError.message)
    }

    const { data, error } = await supabase
      .from('course_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw error
    const hydrated = await this._hydrateMessages(data || [])
    return hydrated
  },

  async _hydrateMessages(messages) {
    if (!messages?.length) return []

    const senderIds = [...new Set(messages.map((row) => row.sender_id).filter(Boolean))]
    if (senderIds.length === 0) return messages

    const { data: senders, error: sendersError } = await supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', senderIds)

    if (sendersError) {
      return messages
    }

    const senderMap = new Map((senders || []).map((sender) => [sender.id, sender]))

    return messages.map((message) => ({
      ...message,
      sender: senderMap.get(message.sender_id) || null
    }))
  },

  async sendMessage({ conversationId, senderId, content, courseId = null }) {
    if (!isSupabaseAvailable()) {
      return {
        id: `mock-msg-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        created_at: new Date().toISOString()
      }
    }

    const trimmed = content.trim()
    const { data: rpcRaw, error: rpcError } = await supabase.rpc('send_course_chat_message', {
      p_conversation_id: conversationId,
      p_content: trimmed
    })
    const rpcData = normalizeRpcRow(rpcRaw)

    let message = null

    if (!rpcError && rpcData?.id) {
      const hydrated = await this._hydrateMessages([rpcData])
      message = hydrated[0]
    } else {
      const { data, error } = await supabase
        .from('course_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: trimmed
        })
        .select(`
          *,
          sender:users!sender_id(id, full_name, avatar_url)
        `)
        .single()

      if (error) throw error
      message = data
    }

    if (courseId && message) {
      await this.broadcastChatMessage(courseId, message)
    }

    return message
  },

  async markMessagesAsRead(conversationId, userId) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    const { error } = await supabase
      .from('course_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return { success: true }
  }
}

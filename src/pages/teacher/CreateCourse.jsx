import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { courseService, lessonService, meetingService, notificationService } from '../../services/api'
import { googleCalendarService } from '../../lib/googleCalendar'
import { generateJitsiRoomName } from '../../lib/jitsi'
import './CreateCourse.css'

const CreateCourse = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const videoInputRef = useRef(null)
  
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // Course data
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    category: 'programming',
    level: 'beginner',
    price: 0,
    thumbnail_url: '',
    language: 'ar'
  })
  
  // Lessons data
  const [lessons, setLessons] = useState([])
  const [currentLesson, setCurrentLesson] = useState({
    title: '',
    description: '',
    video_url: '',
    content_type: 'video',
    duration: 0,
    files: []
  })
  
  // Meeting data
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [meetingPlatform, setMeetingPlatform] = useState('google_meet')
  const [meetingData, setMeetingData] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60
  })
  const [scheduledMeetings, setScheduledMeetings] = useState([])
  
  // File uploads
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadedFiles, setUploadedFiles] = useState([])

  const categories = [
    { value: 'programming', label: 'البرمجة', labelEn: 'Programming' },
    { value: 'it', label: 'تكنولوجيا المعلومات', labelEn: 'IT' },
    { value: 'financial_markets', label: 'الأسواق المالية', labelEn: 'Financial Markets' }
  ]

  const levels = [
    { value: 'beginner', label: 'مبتدئ', labelEn: 'Beginner' },
    { value: 'intermediate', label: 'متوسط', labelEn: 'Intermediate' },
    { value: 'advanced', label: 'متقدم', labelEn: 'Advanced' }
  ]

  const contentTypes = [
    { value: 'video', label: '🎬 فيديو', icon: '🎬' },
    { value: 'document', label: '📝 مستند', icon: '📝' },
    { value: 'article', label: '📄 مقال', icon: '📄' },
    { value: 'quiz', label: '❓ اختبار', icon: '❓' },
    { value: 'assignment', label: '📊 مهمة', icon: '📊' },
    { value: 'live_session', label: '🎥 بث مباشر', icon: '🎥' }
  ]

  // Handle course data changes
  const handleCourseChange = (e) => {
    const { name, value } = e.target
    setCourseData(prev => ({ ...prev, [name]: value }))
  }

  // Handle lesson data changes
  const handleLessonChange = (e) => {
    const { name, value } = e.target
    setCurrentLesson(prev => ({ ...prev, [name]: value }))
  }

  // Handle thumbnail upload
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadProgress(prev => ({ ...prev, thumbnail: 0 }))
    
    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = Math.min((prev.thumbnail || 0) + 10, 90)
          return { ...prev, thumbnail: newProgress }
        })
      }, 200)

      // In real implementation, upload to Supabase Storage
      const url = URL.createObjectURL(file)
      
      clearInterval(interval)
      setUploadProgress(prev => ({ ...prev, thumbnail: 100 }))
      setCourseData(prev => ({ ...prev, thumbnail_url: url }))
      
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, thumbnail: null }))
      }, 1000)
    } catch (err) {
      setError('فشل رفع الصورة')
      setUploadProgress(prev => ({ ...prev, thumbnail: null }))
    }
  }

  // Handle video upload
  const handleVideoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadProgress(prev => ({ ...prev, video: 0 }))
    
    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = Math.min((prev.video || 0) + 5, 90)
          return { ...prev, video: newProgress }
        })
      }, 300)

      // In real implementation, upload to Supabase Storage
      const url = URL.createObjectURL(file)
      
      // Get video duration
      const video = document.createElement('video')
      video.src = url
      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          setCurrentLesson(prev => ({
            ...prev,
            video_url: url,
            duration: Math.round(video.duration / 60)
          }))
          resolve()
        }
      })
      
      clearInterval(interval)
      setUploadProgress(prev => ({ ...prev, video: 100 }))
      
      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, video: null }))
      }, 1000)
    } catch (err) {
      setError('فشل رفع الفيديو')
      setUploadProgress(prev => ({ ...prev, video: null }))
    }
  }

  // Handle file uploads (PDF, Excel, etc.)
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    for (const file of files) {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))
      
      try {
        // Simulate upload progress
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            const newProgress = Math.min((prev[fileId] || 0) + 15, 90)
            return { ...prev, [fileId]: newProgress }
          })
        }, 200)

        // In real implementation, upload to Supabase Storage
        const url = URL.createObjectURL(file)
        
        clearInterval(interval)
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }))
        
        const fileData = {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          url: url
        }
        
        setUploadedFiles(prev => [...prev, fileData])
        setCurrentLesson(prev => ({
          ...prev,
          files: [...prev.files, fileData]
        }))
        
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[fileId]
            return newProgress
          })
        }, 1000)
      } catch (err) {
        setError(`فشل رفع الملف: ${file.name}`)
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[fileId]
          return newProgress
        })
      }
    }
  }

  // Remove uploaded file
  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    setCurrentLesson(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== fileId)
    }))
  }

  // Add lesson to list
  const addLesson = () => {
    if (!currentLesson.title) {
      setError('يرجى إدخال عنوان الدرس')
      return
    }

    setLessons(prev => [...prev, { ...currentLesson, order_index: prev.length + 1 }])
    setCurrentLesson({
      title: '',
      description: '',
      video_url: '',
      content_type: 'video',
      duration: 0,
      files: []
    })
    setUploadedFiles([])
    setSuccess('تمت إضافة الدرس بنجاح!')
    setTimeout(() => setSuccess(null), 3000)
  }

  // Remove lesson
  const removeLesson = (index) => {
    setLessons(prev => prev.filter((_, i) => i !== index))
  }

  const openMeetingModal = (platform) => {
    setMeetingPlatform(platform)
    setShowMeetingModal(true)
  }

  const createMeetingSession = async () => {
    if (!meetingData.title || !meetingData.scheduled_at) {
      setError('يرجى إدخال عنوان الاجتماع والوقت')
      return
    }

    setIsLoading(true)
    try {
      let meeting

      if (meetingPlatform === 'jitsi') {
        const jitsiRoomName = generateJitsiRoomName(courseData.title || 'course', meetingData.title)
        meeting = {
          ...meetingData,
          platform: 'jitsi',
          jitsi_room_name: jitsiRoomName,
          meet_link: null,
          created_by: user?.id,
          created_at: new Date().toISOString()
        }
      } else {
        const { meetLink, eventId } = await googleCalendarService.createGoogleMeetEvent({
          title: meetingData.title,
          description: meetingData.description,
          scheduledAt: meetingData.scheduled_at,
          durationMinutes: meetingData.duration_minutes
        })

        meeting = {
          ...meetingData,
          platform: 'google_meet',
          meet_link: meetLink,
          calendar_event_id: eventId,
          created_by: user?.id,
          created_at: new Date().toISOString()
        }
      }

      setScheduledMeetings(prev => [...prev, meeting])
      setShowMeetingModal(false)
      setMeetingData({
        title: '',
        description: '',
        scheduled_at: '',
        duration_minutes: 60
      })
      setSuccess(
        meetingPlatform === 'jitsi'
          ? 'تم إنشاء جلسة Jitsi داخل المنصة بنجاح!'
          : 'تم إنشاء جلسة Google Meet من Google Calendar بنجاح!'
      )
    } catch (err) {
      setError(err.message || (meetingPlatform === 'jitsi' ? 'فشل إنشاء جلسة Jitsi' : 'فشل إنشاء جلسة Google Meet'))
    } finally {
      setIsLoading(false)
    }
  }

  // Copy meet link
  const copyMeetLink = (link) => {
    navigator.clipboard.writeText(link)
    setSuccess('تم نسخ الرابط!')
    setTimeout(() => setSuccess(null), 2000)
  }

  // Submit course
  const handleSubmit = async () => {
    if (!courseData.title || !courseData.description) {
      setError('يرجى إدخال جميع البيانات المطلوبة')
      return
    }

    if (lessons.length === 0) {
      setError('يرجى إضافة درس واحد على الأقل')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create course (set as published so it appears in marketplace)
      const course = await courseService.createCourse({
        ...courseData,
        instructor_id: user?.id,
        is_published: true
      })

      // Create lessons
      for (const lesson of lessons) {
        await lessonService.createLesson({
          ...lesson,
          course_id: course.id
        })
      }

      // Create meetings if any
      for (const meeting of scheduledMeetings) {
        await meetingService.createMeeting({
          ...meeting,
          course_id: course.id
        })
      }

      // Send notification to all enrolled students (if editing existing course)
      if (scheduledMeetings.length > 0) {
        await notificationService.notifyStudents({
          course_id: course.id,
          title: `جلسة جديدة: ${scheduledMeetings[0].title}`,
          message: `تم جدولة جلسة مباشرة جديدة في كورس "${courseData.title}"`,
          type: 'meeting'
        })
      }

      setSuccess('تم إنشاء الكورس بنجاح!')
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err.message || 'فشل إنشاء الكورس')
    } finally {
      setIsLoading(false)
    }
  }

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get file icon
  const getFileIcon = (type) => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('spreadsheet') || type.includes('excel')) return '📊'
    if (type.includes('presentation') || type.includes('powerpoint')) return '📑'
    if (type.includes('document') || type.includes('word')) return '📝'
    if (type.includes('image')) return '🖼️'
    if (type.includes('video')) return '🎬'
    return '📁'
  }

  return (
    <div className="create-course-page">
      <div className="create-course-container">
        {/* Header */}
        <div className="create-course-header">
          <h1>🎓 إنشاء كورس جديد</h1>
          <p>أنشئ كورسك التعليمي وشاركه مع الطلاب</p>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-number">{step > 1 ? '✓' : '1'}</div>
            <span>معلومات الكورس</span>
          </div>
          <div className="step-line" />
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-number">{step > 2 ? '✓' : '2'}</div>
            <span>إضافة الدروس</span>
          </div>
          <div className="step-line" />
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <span>المراجعة والنشر</span>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Step 1: Course Info */}
        {step === 1 && (
          <div className="step-content">
            <div className="form-section">
              <h2>📝 معلومات الكورس الأساسية</h2>
              
              <div className="form-group">
                <label>عنوان الكورس *</label>
                <input
                  type="text"
                  name="title"
                  value={courseData.title}
                  onChange={handleCourseChange}
                  placeholder="مثال: تعلم البرمجة بلغة Python من الصفر"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>وصف الكورس *</label>
                <textarea
                  name="description"
                  value={courseData.description}
                  onChange={handleCourseChange}
                  placeholder="اكتب وصفاً تفصيلياً للكورس..."
                  className="form-control"
                  rows={5}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>التصنيف</label>
                  <select
                    name="category"
                    value={courseData.category}
                    onChange={handleCourseChange}
                    className="form-control"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>المستوى</label>
                  <select
                    name="level"
                    value={courseData.level}
                    onChange={handleCourseChange}
                    className="form-control"
                  >
                    {levels.map(lvl => (
                      <option key={lvl.value} value={lvl.value}>
                        {lvl.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>السعر (جنيه)</label>
                  <input
                    type="number"
                    name="price"
                    value={courseData.price}
                    onChange={handleCourseChange}
                    min="0"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>صورة الكورس</label>
                <div 
                  className="thumbnail-upload"
                  onClick={() => document.getElementById('thumbnail-input').click()}
                >
                  {courseData.thumbnail_url ? (
                    <img src={courseData.thumbnail_url} alt="Thumbnail" />
                  ) : (
                    <div className="upload-placeholder">
                      <span className="upload-icon">📷</span>
                      <p>انقر لرفع صورة الكورس</p>
                      <small>PNG, JPG حتى 5MB</small>
                    </div>
                  )}
                  {uploadProgress.thumbnail !== null && uploadProgress.thumbnail !== undefined && (
                    <div className="upload-progress">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${uploadProgress.thumbnail}%` }}
                      />
                    </div>
                  )}
                </div>
                <input
                  id="thumbnail-input"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div className="step-actions">
              <button 
                className="btn btn-primary"
                onClick={() => setStep(2)}
                disabled={!courseData.title || !courseData.description}
              >
                التالي: إضافة الدروس
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Add Lessons */}
        {step === 2 && (
          <div className="step-content">
            <div className="form-section">
              <div className="section-header">
                <h2>📚 إضافة الدروس</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-meet"
                    onClick={() => openMeetingModal('jitsi')}
                  >
                    <span>🎥</span>
                    إنشاء Jitsi
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => openMeetingModal('google_meet')}
                  >
                    <span>📅</span>
                    Google Meet
                  </button>
                </div>
              </div>

              {/* Scheduled Meetings */}
              {scheduledMeetings.length > 0 && (
                <div className="scheduled-meetings">
                  <h3>📅 الجلسات المجدولة</h3>
                  {scheduledMeetings.map((meeting, index) => (
                    <div key={index} className="meeting-card">
                      <div className="meeting-info">
                        <h4>{meeting.title}</h4>
                        <p>{new Date(meeting.scheduled_at).toLocaleString('ar-EG')}</p>
                        <span className="meeting-duration">{meeting.duration_minutes} دقيقة</span>
                        <span className="meeting-platform">
                          {meeting.platform === 'jitsi' ? '🎥 Jitsi' : '📅 Google Meet'}
                        </span>
                      </div>
                      <div className="meeting-actions">
                        {meeting.platform === 'jitsi' ? (
                          <span className="btn btn-link">غرفة: {meeting.jitsi_room_name}</span>
                        ) : (
                          <>
                            <a
                              href={meeting.meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-link"
                            >
                              🔗 فتح الرابط
                            </a>
                            <button
                              className="btn btn-copy"
                              onClick={() => copyMeetLink(meeting.meet_link)}
                            >
                              📋 نسخ
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Current Lesson Form */}
              <div className="lesson-form">
                <div className="form-group">
                  <label>عنوان الدرس *</label>
                  <input
                    type="text"
                    name="title"
                    value={currentLesson.title}
                    onChange={handleLessonChange}
                    placeholder="مثال: مقدمة في البرمجة"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>وصف الدرس</label>
                  <textarea
                    name="description"
                    value={currentLesson.description}
                    onChange={handleLessonChange}
                    placeholder="وصف مختصر للدرس..."
                    className="form-control"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>نوع المحتوى</label>
                  <div className="content-type-selector">
                    {contentTypes.map(type => (
                      <button
                        key={type.value}
                        className={`type-btn ${currentLesson.content_type === type.value ? 'active' : ''}`}
                        onClick={() => setCurrentLesson(prev => ({ ...prev, content_type: type.value }))}
                      >
                        <span className="type-icon">{type.icon}</span>
                        <span>{type.label.split(' ')[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Upload */}
                {currentLesson.content_type === 'video' && (
                  <div className="form-group">
                    <label>رفع الفيديو</label>
                    <div 
                      className="video-upload"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      {currentLesson.video_url ? (
                        <div className="video-preview">
                          <video src={currentLesson.video_url} controls />
                          <p>مدة الفيديو: {currentLesson.duration} دقيقة</p>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <span className="upload-icon">🎬</span>
                          <p>انقر لرفع فيديو الدرس</p>
                          <small>MP4, WebM حتى 500MB</small>
                        </div>
                      )}
                      {uploadProgress.video !== null && uploadProgress.video !== undefined && (
                        <div className="upload-progress">
                          <div 
                            className="progress-bar" 
                            style={{ width: `${uploadProgress.video}%` }}
                          />
                          <span>{uploadProgress.video}%</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}

                {/* File Uploads */}
                <div className="form-group">
                  <label>الملفات المرفقة (PDF, Excel, صور)</label>
                  <div 
                    className="files-upload"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="upload-placeholder">
                      <span className="upload-icon">📎</span>
                      <p>انقر لرفع الملفات</p>
                      <small>PDF, Excel, Word, صور</small>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="uploaded-files">
                      {uploadedFiles.map(file => (
                        <div key={file.id} className="file-item">
                          <span className="file-icon">{getFileIcon(file.type)}</span>
                          <div className="file-info">
                            <p className="file-name">{file.name}</p>
                            <span className="file-size">{formatFileSize(file.size)}</span>
                          </div>
                          <button 
                            className="btn-remove"
                            onClick={() => removeFile(file.id)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Progress */}
                  {Object.keys(uploadProgress).filter(k => k.startsWith('file_')).map(key => (
                    <div key={key} className="upload-progress-item">
                      <div className="progress-bar" style={{ width: `${uploadProgress[key]}%` }} />
                    </div>
                  ))}
                </div>

                <button 
                  className="btn btn-add-lesson"
                  onClick={addLesson}
                  disabled={!currentLesson.title}
                >
                  <span>+</span>
                  إضافة الدرس
                </button>
              </div>

              {/* Added Lessons */}
              {lessons.length > 0 && (
                <div className="lessons-list">
                  <h3>📖 الدروس المضافة ({lessons.length})</h3>
                  {lessons.map((lesson, index) => (
                    <div key={index} className="lesson-item">
                      <div className="lesson-order">{index + 1}</div>
                      <div className="lesson-info">
                        <h4>{lesson.title}</h4>
                        <div className="lesson-meta">
                          <span>{contentTypes.find(t => t.value === lesson.content_type)?.icon}</span>
                          <span>{lesson.duration} دقيقة</span>
                          {lesson.files.length > 0 && (
                            <span>📎 {lesson.files.length} ملفات</span>
                          )}
                        </div>
                      </div>
                      <button 
                        className="btn-remove"
                        onClick={() => removeLesson(index)}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="step-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setStep(1)}
              >
                <span>←</span>
                السابق
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setStep(3)}
                disabled={lessons.length === 0}
              >
                التالي: المراجعة
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Publish */}
        {step === 3 && (
          <div className="step-content">
            <div className="form-section">
              <h2>👁️ مراجعة الكورس</h2>

              <div className="review-section">
                <div className="review-card">
                  {courseData.thumbnail_url && (
                    <img 
                      src={courseData.thumbnail_url} 
                      alt={courseData.title}
                      className="review-thumbnail"
                    />
                  )}
                  <div className="review-info">
                    <h3>{courseData.title}</h3>
                    <p>{courseData.description}</p>
                    <div className="review-meta">
                      <span>📁 {categories.find(c => c.value === courseData.category)?.label}</span>
                      <span>📊 {levels.find(l => l.value === courseData.level)?.label}</span>
                      <span>💰 {courseData.price} جنيه</span>
                    </div>
                  </div>
                </div>

                <div className="review-lessons">
                  <h4>📚 الدروس ({lessons.length})</h4>
                  <ul>
                    {lessons.map((lesson, index) => (
                      <li key={index}>
                        <span className="lesson-num">{index + 1}</span>
                        {lesson.title}
                        <span className="lesson-type">
                          {contentTypes.find(t => t.value === lesson.content_type)?.icon}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {scheduledMeetings.length > 0 && (
                  <div className="review-meetings">
                    <h4>🎥 الجلسات المباشرة ({scheduledMeetings.length})</h4>
                    <ul>
                      {scheduledMeetings.map((meeting, index) => (
                        <li key={index}>
                          {meeting.title} - {new Date(meeting.scheduled_at).toLocaleDateString('ar-EG')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="notify-option">
                <label>
                  <input type="checkbox" defaultChecked />
                  <span>إرسال إشعار للطلاب عند نشر الكورس</span>
                </label>
              </div>
            </div>

            <div className="step-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setStep(2)}
              >
                <span>←</span>
                السابق
              </button>
              <button 
                className="btn btn-success"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    جاري النشر...
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    نشر الكورس
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Google Meet Modal */}
      {showMeetingModal && (
        <div className="modal-overlay" onClick={() => setShowMeetingModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{meetingPlatform === 'jitsi' ? '🎥 إنشاء جلسة Jitsi داخل المنصة' : '📅 إنشاء جلسة Google Meet'}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowMeetingModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>عنوان الجلسة *</label>
                <input
                  type="text"
                  value={meetingData.title}
                  onChange={e => setMeetingData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="مثال: جلسة مراجعة الفصل الأول"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>الوصف</label>
                <textarea
                  value={meetingData.description}
                  onChange={e => setMeetingData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف مختصر للجلسة..."
                  className="form-control"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>موعد الجلسة *</label>
                  <input
                    type="datetime-local"
                    value={meetingData.scheduled_at}
                    onChange={e => setMeetingData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>المدة (دقيقة)</label>
                  <input
                    type="number"
                    value={meetingData.duration_minutes}
                    onChange={e => setMeetingData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                    min="15"
                    max="180"
                    className="form-control"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowMeetingModal(false)}
              >
                إلغاء
              </button>
              <button 
                className="btn btn-meet"
                onClick={createMeetingSession}
                disabled={isLoading || !meetingData.title || !meetingData.scheduled_at}
              >
                {isLoading ? 'جاري الإنشاء...' : (meetingPlatform === 'jitsi' ? '🎥 إنشاء جلسة Jitsi' : '📅 إنشاء الرابط')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateCourse
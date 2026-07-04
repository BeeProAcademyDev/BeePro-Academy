import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.join(__dirname, '../src/i18n/locales')

const teacherWizard = {
  editTitle: { en: 'Edit Course', ar: 'تعديل الكورس' },
  editSubtitle: { en: 'Update course content and add new lessons', ar: 'قم بتحديث محتوى الكورس وإضافة دروس جديدة' },
  stepCourseInfo: { en: 'Course Info', ar: 'معلومات الكورس' },
  stepEditLessons: { en: 'Edit Lessons', ar: 'تعديل الدروس' },
  stepReviewSave: { en: 'Review & Save', ar: 'المراجعة والحفظ' },
  basicInfo: { en: 'Basic Course Information', ar: 'معلومات الكورس الأساسية' },
  courseTitle: { en: 'Course Title *', ar: 'عنوان الكورس *' },
  courseTitlePlaceholder: { en: 'Example: Learn Python Programming from Scratch', ar: 'مثال: تعلم البرمجة بلغة Python من الصفر' },
  courseDescription: { en: 'Course Description *', ar: 'وصف الكورس *' },
  category: { en: 'Category', ar: 'القسم' },
  level: { en: 'Level', ar: 'المستوى' },
  price: { en: 'Price (USD)', ar: 'السعر (USD)' },
  thumbnail: { en: 'Course Thumbnail', ar: 'صورة الكورس' },
  uploadThumbnail: { en: 'Upload Thumbnail', ar: 'رفع الصورة' },
  thumbnailHint: { en: 'PNG, JPG up to 5MB', ar: 'PNG, JPG حتى 5MB' },
  googleMeetLink: { en: 'Google Meet Link', ar: 'رابط Google Meet' },
  publishStatus: { en: 'Publish Status', ar: 'حالة النشر' },
  published: { en: 'Published', ar: 'منشور' },
  draft: { en: 'Draft', ar: 'مسودة' },
  next: { en: 'Next', ar: 'التالي' },
  back: { en: 'Back', ar: 'رجوع' },
  saveCourse: { en: 'Save Course', ar: 'حفظ الكورس' },
  saving: { en: 'Saving...', ar: 'جاري الحفظ...' },
  backToDashboard: { en: 'Back to Dashboard', ar: 'العودة للوحة التحكم' },
  editLessons: { en: 'Edit Lessons', ar: 'تعديل الدروس' },
  scheduledSessions: { en: 'Scheduled Sessions', ar: 'الجلسات المجدولة' },
  lessonsCount: { en: 'Lessons', ar: 'الدروس' },
  reviewChanges: { en: 'Review Changes', ar: 'مراجعة التعديلات' },
  liveSessionsCount: { en: 'Live Sessions', ar: 'الجلسات المباشرة' },
  lessonsToDelete: { en: 'Lessons to delete', ar: 'سيتم حذف {{count}} دروس' },
  sessionsToDelete: { en: 'Sessions to delete', ar: 'سيتم حذف {{count}} جلسات' },
  addLesson: { en: 'Add Lesson', ar: 'إضافة درس' },
  lessonTitle: { en: 'Lesson Title', ar: 'عنوان الدرس' },
  lessonDescription: { en: 'Lesson Description', ar: 'وصف الدرس' },
  contentType: { en: 'Content Type', ar: 'نوع المحتوى' },
  duration: { en: 'Duration (minutes)', ar: 'المدة (دقيقة)' },
  videoUrl: { en: 'Video URL', ar: 'رابط الفيديو' },
  uploadVideo: { en: 'Upload Video', ar: 'رفع فيdeo' },
  scheduleMeeting: { en: 'Schedule Meeting', ar: 'جدولة اجتماع' },
  meetingTitle: { en: 'Meeting Title', ar: 'عنوان الاجتماع' },
  meetingTime: { en: 'Meeting Time', ar: 'وقت الاجتماع' },
  copyLink: { en: 'Copy Link', ar: 'نسخ الرابط' },
  deleteLesson: { en: 'Delete Lesson', ar: 'حذف الدرس' },
  editLesson: { en: 'Edit Lesson', ar: 'تعديل الدرس' },
  createTitle: { en: 'Create New Course', ar: 'إنشاء كورس جديد' },
  createSubtitle: { en: 'Build your course step by step', ar: 'أنشئ كورسك خطوة بخطوة' },
  creating: { en: 'Creating...', ar: 'جاري الإنشاء...' },
  createCourse: { en: 'Create Course', ar: 'إنشاء الكورس' },
  errCourseIdMissing: { en: 'Course ID is missing', ar: 'معرف الكورس غير موجود' },
  errNoPermission: { en: 'You do not have permission to edit this course', ar: 'ليس لديك صلاحية لتعديل هذا الكورس' },
  errLoadFailed: { en: 'Failed to load course data', ar: 'فشل تحميل بيانات الكورس' },
  errThumbnailFailed: { en: 'Failed to upload image', ar: 'فشل رفع الصورة' },
  errVideoFailed: { en: 'Failed to upload video', ar: 'فشل رفع الفيديو' },
  errLessonTitle: { en: 'Please enter a lesson title', ar: 'يرجى إدخال عنوان الدرس' },
  successLessonAdded: { en: 'Lesson added successfully!', ar: 'تمت إضافة الدرس بنجاح!' },
  errMeetingFields: { en: 'Please enter meeting title and time', ar: 'يرجى إدخال عنوان الاجتماع والوقت' },
  successLinkCopied: { en: 'Link copied!', ar: 'تم نسخ الرابط!' },
  errRequiredFields: { en: 'Please fill in all required fields', ar: 'يرجى إدخال جميع البيانات المطلوبة' },
  errMinOneLesson: { en: 'Please add at least one lesson', ar: 'يرجى إضافة درس واحد على الأقل' },
  errInvalidMeetLink: { en: 'Invalid Google Meet link. Use a link like https://meet.google.com/abc-defg-hij', ar: 'رابط Google Meet غير صالح. استخدم رابطاً مثل https://meet.google.com/abc-defg-hij' },
  successCourseUpdated: { en: 'Course updated successfully!', ar: 'تم تحديث الكورس بنجاح!' },
  successCourseCreated: { en: 'Course created successfully!', ar: 'تم إنشاء الكورس بنجاح!' },
  contentVideo: { en: 'Video', ar: 'فيديو' },
  contentDocument: { en: 'Document', ar: 'مستند' },
  contentArticle: { en: 'Article', ar: 'مقال' },
  contentQuiz: { en: 'Quiz', ar: 'اختبار' },
  contentAssignment: { en: 'Assignment', ar: 'مهمة' },
  contentLive: { en: 'Live Session', ar: 'بث مباشر' },
}

const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'))
const ar = JSON.parse(fs.readFileSync(path.join(localesDir, 'ar.json'), 'utf8'))

en.teacherWizard = {}
ar.teacherWizard = {}
for (const [key, val] of Object.entries(teacherWizard)) {
  en.teacherWizard[key] = val.en
  ar.teacherWizard[key] = val.ar
}

fs.writeFileSync(path.join(localesDir, 'en.json'), JSON.stringify(en, null, 2))
fs.writeFileSync(path.join(localesDir, 'ar.json'), JSON.stringify(ar, null, 2))

// Replace in EditCourse and CreateCourse
const files = [
  '../src/pages/teacher/EditCourse.jsx',
  '../src/pages/teacher/CreateCourse.jsx',
]

const replacements = Object.entries(teacherWizard).flatMap(([key, val]) => [
  [val.ar, `t('teacherWizard.${key}')`],
])

for (const rel of files) {
  const filePath = path.join(__dirname, rel)
  let content = fs.readFileSync(filePath, 'utf8')

  if (!content.includes('useTranslation')) {
    content = content.replace(
      "import { useState",
      "import { useTranslation } from 'react-i18next'\nimport { useState"
    )
    content = content.replace(
      /const (EditCourse|CreateCourse) = \(\) => \{\n/,
      "const $1 = () => {\n  const { t } = useTranslation()\n"
    )
  }

  for (const [arabic, replacement] of replacements) {
    content = content.split(`'${arabic}'`).join(`{${replacement}}`)
    content = content.split(`"${arabic}"`).join(`{${replacement}}`)
    content = content.replace(new RegExp(`>${arabic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`, 'g'), `>{${replacement}}<`)
  }

  // Fix setError/setSuccess - should be t() not {t()}
  content = content.replace(/set(Error|Success)\(\{t\(/g, 'set$1(t(')
  content = content.replace(/set(Error|Success)\(t\('([^']+)'\)\}\)/g, "set$1(t('$2'))")

  fs.writeFileSync(filePath, content)
  console.log('Updated', rel)
}

console.log('Teacher wizard i18n applied')

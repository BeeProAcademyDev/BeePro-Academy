import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, '../src')

// Map: [englishText, arabicText] -> translationKey
const mappings = [
  // Dashboard
  ["Failed to load courses", 'فشل تحميل الكورسات', 'dashboardExtra.loadCoursesFailed'],
  ["Failed to update payment status", 'فشل تحديث حالة الدفع', 'dashboardExtra.paymentUpdateFailed'],
  ["Only admins can delete courses", 'هذا الإجراء متاح للأدمن فقط', 'dashboardExtra.adminOnlyDelete'],
  ["Course deleted successfully", 'تم حذف الكورس بنجاح', 'dashboardExtra.courseDeleted'],
  ["Failed to delete course", 'فشل حذف الكورس', 'dashboardExtra.courseDeleteFailed'],
  ["Profile saved successfully", 'تم حفظ بيانات الملف الشخصي', 'dashboardExtra.profileSaved'],
  ["Failed to save profile", 'تعذر حفظ الملف الشخصي', 'dashboardExtra.profileSaveFailed'],
  ["Profile photo updated", 'تم تحديث صورة الملف الشخصي', 'dashboardExtra.photoUpdated'],
  ["Failed to upload photo", 'تعذر رفع الصورة', 'dashboardExtra.photoUploadFailed'],
  ["Manage Courses", 'إدارة الكورسات', 'dashboardExtra.manageCourses'],
  ["Admin Panel", 'لوحة الإدارة', 'dashboardExtra.adminPanel'],
  ["Create Course", 'إنشاء كورس', 'dashboardExtra.createCourse'],
  ["Browse Courses", 'تصفح الدورات', 'dashboardExtra.browseCourses'],
  ["Instructor chat", 'دردشة المدرس', 'dashboardExtra.instructorChat'],
  ["Message your instructor", 'تواصل مع المدرس مباشرة', 'dashboardExtra.messageInstructor'],
  ["Open chat", 'فتح الدردشة', 'dashboardExtra.openChat'],
  ["Browse courses", 'تصفح الكورسات', 'dashboardExtra.browseCoursesLink'],
  ["Live session notifications", 'إشعارات الجلسات المباشرة', 'dashboardExtra.liveNotifications'],
  ["Join session", 'دخول الجلسة', 'dashboardExtra.joinSession'],
  ["Jitsi link", 'رابط Jitsi', 'dashboardExtra.jitsiLink'],
  ["Purchased Courses", 'الدورات التي تم شراؤها', 'dashboardExtra.purchasedCourses'],
  ["Purchased on:", 'تاريخ الشراء:', 'dashboardExtra.purchasedOn'],
  ["Chat with instructor", 'الدردشة مع المدرس', 'dashboardExtra.chatWithInstructor'],
  ["Chat", 'دردشة', 'dashboardExtra.chat'],
  ["Join live session", 'الانضمام للجلسة المباشرة', 'dashboardExtra.joinLive'],
  ["Live", 'جلسة مباشرة', 'dashboardExtra.live'],
  ["Open Course", 'دخول الدورة', 'dashboardExtra.openCourse'],
  ["No purchased courses yet", 'لا توجد دورات تم شراؤها بعد', 'dashboardExtra.noPurchasedCourses'],
  ["Payment History", 'سجل المدفوعات', 'dashboardExtra.paymentHistory'],
  ["Date", 'التاريخ', 'dashboardExtra.date'],
  ["Course", 'الدورة', 'dashboardExtra.course'],
  ["Amount", 'المبلغ', 'dashboardExtra.amount'],
  ["Method", 'الطريقة', 'dashboardExtra.method'],
  ["Reference", 'مرجع العملية', 'dashboardExtra.reference'],
  ["Payment Details", 'تفاصيل الدفع', 'dashboardExtra.paymentDetails'],
  ["Status", 'الحالة', 'dashboardExtra.status'],
  ["Review Notes", 'ملاحظات المراجعة', 'dashboardExtra.reviewNotes'],
  ["Proof", 'الإيصال', 'dashboardExtra.proof'],
  ["View", 'عرض', 'dashboardExtra.view'],
  ["No payment transactions yet", 'لا توجد عمليات دفع بعد', 'dashboardExtra.noPayments'],
  ["No Enrolled Courses", 'لا توجد دورات مسجلة', 'dashboardExtra.noEnrolledCourses'],
  ["Create New Course", 'إنشاء كورس جديد', 'dashboardExtra.createNewCourse'],
  ["Courses", 'الكورسات', 'dashboardExtra.coursesTab'],
  ["Course Payments", 'مدفوعات الكورسات', 'dashboardExtra.coursePayments'],
  ["Student Chat", 'دردشة الطلاب', 'dashboardExtra.studentChat'],
  ["Pending", 'معلقة', 'dashboardExtra.pending'],
  ["Approved", 'مقبولة', 'dashboardExtra.approved'],
  ["Approved total", 'إجمالي المقبول', 'dashboardExtra.approvedTotal'],
  ["Payment requests for my courses", 'طلبات الدفع لكورساتي', 'dashboardExtra.paymentRequests'],
  ["Student", 'الطالب', 'dashboardExtra.student'],
  ["Actions", 'الإجراءات', 'dashboardExtra.actions'],
  ["Processing...", 'جارٍ...', 'dashboardExtra.processing'],
  ["Approve", 'قبول', 'dashboardExtra.approve'],
  ["Reject", 'رفض', 'dashboardExtra.reject'],
  ["View Proof", 'عرض الإيصال', 'dashboardExtra.viewProof'],
  ["No payment requests yet", 'لا توجد طلبات دفع بعد', 'dashboardExtra.noPaymentRequests'],
  ["Chat with all registered students", 'الدردشة مع جميع الطلاب المسجّلين', 'dashboardExtra.chatAllStudents'],
  ["Create a course first to start chatting.", 'أنشئ كورساً أولاً لبدء الدردشة.', 'dashboardExtra.createCourseFirst'],
  ["Select course", 'اختر الكورس', 'dashboardExtra.selectCourse'],
  ["All Courses", 'كل الكورسات', 'dashboardExtra.allCourses'],
  ["My Courses", 'كورساتي', 'dashboardExtra.myCourses'],
  ["Enrolled Students", 'الطلاب المسجلين', 'dashboardExtra.enrolledStudents'],
  ["All Platform Courses", 'كل كورسات المنصة', 'dashboardExtra.allPlatformCourses'],
  ["lessons", 'دروس', 'dashboardExtra.lessons'],
  ["Published", 'منشور', 'dashboardExtra.published'],
  ["Draft", 'مسودة', 'dashboardExtra.draft'],
  ["Edit", 'تعديل', 'dashboardExtra.edit'],
  ["Delete course", 'حذف الكورس', 'dashboardExtra.deleteCourse'],
  ["You haven't created any courses yet", 'لم تقم بإنشاء أي كورسات بعد', 'dashboardExtra.noCoursesCreated'],
  ["Quick Actions", 'إجراءات سريعة', 'dashboardExtra.quickActions'],
  ["Live Session", 'جلسة مباشرة', 'dashboardExtra.liveSession'],
  ["Marketplace", 'السوق', 'dashboardExtra.marketplace'],
  ["User Management", 'إدارة المستخدمين', 'dashboardExtra.userManagement'],
  ["Payment Management", 'إدارة المدفوعات', 'dashboardExtra.paymentManagement'],
  ["Total Payments", 'إجمالي المدفوعات', 'dashboardExtra.totalPayments'],
  ["Pending Payments", 'المدفوعات المعلقة', 'dashboardExtra.pendingPayments'],
  ["Active Payment Methods", 'طرق الدفع النشطة', 'dashboardExtra.activePaymentMethods'],
  ["Add Payment Method", 'إضافة وسيلة دفع', 'dashboardExtra.addPaymentMethod'],
  ["Payment Type", 'نوع الدفع', 'dashboardExtra.paymentType'],
  ["Display Name", 'الاسم المعروض', 'dashboardExtra.displayName'],
  ["Payment Instructions", 'تعليمات التحويل', 'dashboardExtra.paymentInstructions'],
  ["Save Payment Method", 'حفظ وسيلة الدفع', 'dashboardExtra.savePaymentMethod'],
  ["No payment methods yet", 'لا توجد وسائل دفع بعد', 'dashboardExtra.noPaymentMethods'],
  ["Recent Payment Submissions", 'طلبات الدفع الأخيرة', 'dashboardExtra.recentSubmissions'],
  ["Payment Method", 'طريقة الدفع', 'dashboardExtra.paymentMethod'],
  ["No payment submissions yet", 'لا توجد طلبات دفع بعد', 'dashboardExtra.noSubmissions'],
  ["No progress data available", 'لا توجد بيانات تقدم', 'dashboardExtra.noProgressData'],
  ["Certificate of Completion", 'شهادة إتمام', 'dashboardExtra.certificateOfCompletion'],
  ["Successfully Completed", 'تم الإتمام بنجاح', 'dashboardExtra.successfullyCompleted'],
  ["Download Certificate", 'تحميل الشهادة', 'dashboardExtra.downloadCertificate'],
  ["No Certificates Yet", 'لا توجد شهادات', 'dashboardExtra.noCertificates'],
  ["Upload Profile Photo", 'رفع صورة شخصية', 'dashboardExtra.uploadPhoto'],
  ["Instructor Bio", 'وصف المعلم', 'dashboardExtra.instructorBio'],
  ["Learning Hours", 'ساعات التعلم', 'dashboardExtra.learningHours'],
  // Navbar common
  ["Teach", 'سجّل كمدرس', 'nav.teach'],
  ["Alerts & chat", 'الإشعارات والدردشة', 'navExtra.alertsAndChat'],
  ["Switch to English", 'Switch to English', 'language.switchToEnglish'],
  ["Switch to Arabic", 'Switch to Arabic', 'language.switchToArabic'],
  ["Close menu", 'إغلاق القائمة', 'navExtra.closeMenu'],
  ["Open menu", 'فتح القائمة', 'navExtra.openMenu'],
  ["Navigation menu", 'القائمة', 'navExtra.navigationMenu'],
  ["Light Mode", 'الوضع الفاتح', 'theme.lightMode'],
  ["Dark Mode", 'الوضع الداكن', 'theme.darkMode'],
  ["User", 'مستخدم', 'roles.user'],
  ["Bestseller", 'الأكثر مبيعاً', 'courseExtra.bestseller'],
  ["Instructor", 'المدرب', 'courseExtra.instructorFallback'],
  ["Blogs", 'المدونة', 'nav.blogs'],
  ["United Arab Emirates", 'الإمارات العربية المتحدة', 'location.uae'],
  // Auth
  ["Login failed", 'حدث خطأ في تسجيل الدخول', 'authExtra.loginFailed'],
  ["An unexpected error occurred", 'حدث خطأ غير متوقع', 'authExtra.unexpectedError'],
  ["Google sign in failed", 'فشل تسجيل الدخول بواسطة Google', 'authExtra.googleSignInFailed'],
  ["or", 'أو', 'authExtra.or'],
  ["Continue with Google", 'تسجيل الدخول بواسطة Google', 'authExtra.continueWithGoogle'],
  ["Want to teach?", 'تريد التدريس؟', 'authExtra.wantToTeach'],
  ["Register as a teacher", 'سجّل كمدرس', 'navExtra.registerAsTeacher'],
  ["Enter your credentials to access your account", 'أدخل بياناتك للوصول إلى حسابك', 'authExtra.loginSubtitle'],
]

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let changes = 0

  for (const [en, ar, key] of mappings) {
    const patterns = [
      new RegExp(`language === 'ar' \\? '${escapeRegex(ar)}' : '${escapeRegex(en)}'`, 'g'),
      new RegExp(`language === 'ar' \\? "${escapeRegex(ar)}" : "${escapeRegex(en)}"`, 'g'),
      new RegExp(`isAr \\? '${escapeRegex(ar)}' : '${escapeRegex(en)}'`, 'g'),
      new RegExp(`isAr \\? "${escapeRegex(ar)}" : "${escapeRegex(en)}"`, 'g'),
      // reversed order (en first in ternary - rare)
      new RegExp(`language === 'ar' \\? '${escapeRegex(en)}' : '${escapeRegex(ar)}'`, 'g'),
    ]

    for (const pattern of patterns) {
      const before = content
      content = content.replace(pattern, `{t('${key}')}`)
      if (content !== before) changes++
    }
  }

  // Special multiline patterns for Dashboard
  const multilinePatterns = [
    [
      /language === 'ar'\s*\?\s*'Complete your courses to earn certificates'\s*:\s*'Complete your courses to earn certificates'/g,
      "{t('dashboardExtra.completeForCertificates')}"
    ],
    [
      /language === 'ar'\s*\?\s*'أكمل دوراتك للحصول على شهادات معتمدة'\s*:\s*'Complete your courses to earn certificates'/g,
      "{t('dashboardExtra.completeForCertificates')}"
    ],
    [
      /language === 'ar'\s*\?\s*'اكتب نبذة قصيرة عن خبرتك وما سيستفيده الطلاب من دوراتك'\s*:\s*'Write a short bio about your experience and what students can expect from your courses'/g,
      "{t('dashboardExtra.bioPlaceholder')}"
    ],
    [
      /language === 'ar'\s*\?\s*'ستظهر الصورة للزوار في صفحة الكورس\.'\s*:\s*'This photo appears to visitors on course pages\.'/g,
      "{t('dashboardExtra.photoHint')}"
    ],
    [
      /language === 'ar'\s*\?\s*'مثال: \\+2010xxxxxxx أو pay@paypal\.com أو 0x\.\.\.\. ويمكنك أيضا إدخال JSON'\s*:\s*'Example: \\+2010xxxxxxx or pay@paypal\.com or 0x\.\.\.\. You can also enter JSON'/g,
      "{t('dashboardExtra.paymentDetailsPlaceholder')}"
    ],
    [
      /language === 'ar'\s*\?\s*'مثال: اكتب اسمك في ملاحظات التحويل'\s*:\s*'Example: add your name in transfer note'/g,
      "{t('dashboardExtra.instructionsPlaceholder')}"
    ],
    [
      /language === 'ar'\s*\?\s*'جارٍ التنفيذ\.\.\.'\s*:\s*'Processing\.\.\.'/g,
      "{t('dashboardExtra.executing')}"
    ],
    [
      /language === 'ar'\s*\?\s*'جارٍ التحميل\.\.\.'\s*:\s*'Loading\.\.\.'/g,
      "{t('common.loading')}"
    ],
    [
      /language === 'ar'\s*\?\s*'English'\s*:\s*'العربية'/g,
      "{t('language.english')}"
    ],
    [
      /language === 'ar'\s*\?\s*'العربية'\s*:\s*'English'/g,
      "{t('language.arabic')}"
    ],
    [
      /language === 'ar'\s*\?\s*'مستخدم'\s*:\s*'User'/g,
      "{t('roles.user')}"
    ],
    [
      /language === 'ar'\s*\?\s*'طالب'\s*:\s*'Student'/g,
      "{t('roles.student')}"
    ],
    [
      /language === 'ar'\s*\?\s*'مدرس'\s*:\s*'Teacher'/g,
      "{t('roles.teacher')}"
    ],
    [
      /language === 'ar'\s*\?\s*'مدير'\s*:\s*'Admin'/g,
      "{t('roles.admin')}"
    ],
  ]

  for (const [pattern, replacement] of multilinePatterns) {
    const before = content
    content = content.replace(pattern, replacement)
    if (content !== before) changes++
  }

  if (changes > 0) {
    fs.writeFileSync(filePath, content)
    console.log(`${path.relative(srcDir, filePath)}: ${changes} replacements`)
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) migrateFile(full)
  }
}

walk(srcDir)
console.log('Migration complete')

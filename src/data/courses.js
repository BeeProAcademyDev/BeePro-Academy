// Placeholder data for courses
export const courses = [
  {
    id: 'financial-markets-demo',
    title: 'تحليل الأسواق المالية',
    titleEn: 'Financial Markets Analysis',
    description: 'تعلم قراءة الأسواق المالية وإدارة المخاطر وبناء قرارات تداول مبنية على التحليل.',
    descriptionEn: 'Learn market analysis, risk management, and structured trading decisions.',
    instructor: {
      id: '4',
      name: 'خالد سعيد',
      nameEn: 'Khaled Saeed',
      avatar: '/assets/abdullah1.jpg',
      title: 'محلل مالي معتمد',
      titleEn: 'Certified Financial Analyst'
    },
    thumbnail: '/assets/anlysis.jpg',
    category: 'financial_markets',
    level: 'advanced',
    duration: 40,
    lessons: 95,
    students: 520,
    rating: 4.9,
    reviews: 145,
    price: 499,
    originalPrice: 999,
    isFree: false,
    isPopular: true,
    isBestseller: true,
    tags: ['Trading', 'Technical Analysis', 'Risk Management'],
    createdAt: '2025-04-20',
    updatedAt: '2025-12-10'
  },
  {
    id: 'data-analysis-demo',
    title: 'تحليل البيانات للأعمال',
    titleEn: 'Data Analysis for Business',
    description: 'حوّل البيانات إلى قرارات باستخدام التحليل الإحصائي، التصوير البياني، وأدوات ذكاء الأعمال.',
    descriptionEn: 'Turn data into decisions with statistics, visualization, and business intelligence tools.',
    instructor: {
      id: '2',
      name: 'BeePro Academy',
      nameEn: 'BeePro Academy',
      avatar: '/assets/platform-logo.jpg',
      title: 'Data Mentor',
      titleEn: 'Data Mentor'
    },
    thumbnail: '/assets/data.jpg',
    category: 'data_analysis',
    level: 'intermediate',
    duration: 32,
    lessons: 72,
    students: 740,
    rating: 4.7,
    reviews: 189,
    price: 349,
    originalPrice: 699,
    isFree: false,
    isPopular: true,
    isBestseller: false,
    tags: ['Data Visualization', 'Python', 'Business Intelligence'],
    createdAt: '2025-03-05',
    updatedAt: '2025-10-15'
  },
  {
    id: 'it-demo',
    title: 'تكنولوجيا المعلومات والبنية التحتية',
    titleEn: 'Information Technology Infrastructure',
    description: 'تعلم الشبكات، الأمن السيبراني، الحوسبة السحابية، وإدارة الأنظمة.',
    descriptionEn: 'Learn networking, cybersecurity, cloud computing, and system administration.',
    instructor: {
      id: '3',
      name: 'محمد علي',
      nameEn: 'Mohamed Ali',
      avatar: '/assets/abdullah1.jpg',
      title: 'خبير تكنولوجيا معلومات',
      titleEn: 'IT Expert'
    },
    thumbnail: '/assets/it2.jpg',
    category: 'it',
    level: 'beginner',
    duration: 28,
    lessons: 65,
    students: 650,
    rating: 4.7,
    reviews: 189,
    price: 249,
    originalPrice: 499,
    isFree: false,
    isBestseller: false,
    tags: ['Networking', 'Cybersecurity', 'Cloud'],
    createdAt: '2025-06-01',
    updatedAt: '2025-11-25'
  }
]

// Categories data
export const categories = [
  {
    id: 'financial_markets',
    name: 'الأسواق المالية',
    nameEn: 'Financial Markets',
    description: 'تعلم التحليل المالي والتداول في الأسواق',
    descriptionEn: 'Learn financial analysis and market trading',
    icon: 'trending-up',
    color: 'from-yellow-500 to-orange-600',
    coursesCount: 1,
    image: '/assets/anlysis.jpg'
  },
  {
    id: 'data_analysis',
    name: 'تحليل البيانات',
    nameEn: 'Data Analysis',
    description: 'تعلم تحليل البيانات والتصور وذكاء الأعمال',
    descriptionEn: 'Learn data analysis, visualization, and business intelligence',
    icon: 'bar-chart',
    color: 'from-sky-500 to-blue-600',
    coursesCount: 1,
    image: '/assets/data.jpg'
  },
  {
    id: 'it',
    name: 'تكنولوجيا المعلومات',
    nameEn: 'Information Technology',
    description: 'تعلم الشبكات والأمن السيبراني وإدارة الأنظمة',
    descriptionEn: 'Learn networking, cybersecurity and system administration',
    icon: 'server',
    color: 'from-green-500 to-teal-600',
    coursesCount: 1,
    image: '/assets/it2.jpg'
  }
]

// Course lessons data
export const courseLessons = {
  '1': [
    {
      id: '1-1',
      title: 'مقدمة في تطوير الويب',
      titleEn: 'Introduction to Web Development',
      duration: 15,
      type: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      isFree: true,
      order: 1
    },
    {
      id: '1-2',
      title: 'أساسيات HTML',
      titleEn: 'HTML Basics',
      duration: 45,
      type: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      isFree: true,
      order: 2
    },
    {
      id: '1-3',
      title: 'تنسيق الصفحات باستخدام CSS',
      titleEn: 'Styling Pages with CSS',
      duration: 60,
      type: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      isFree: false,
      order: 3
    },
    {
      id: '1-4',
      title: 'مشروع تطبيقي: صفحة هبوط',
      titleEn: 'Project: Landing Page',
      duration: 90,
      type: 'project',
      videoUrl: null,
      isFree: false,
      order: 4
    }
  ]
}

// Stats data
export const stats = {
  students: 15000,
  courses: 70,
  instructors: 25,
  hours: 2500
}

// Testimonials
export const testimonials = [
  {
    id: '1',
    name: 'علي محمد',
    nameEn: 'Ali Mohamed',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    role: 'مطور ويب',
    roleEn: 'Web Developer',
    content: 'بفضل BeePro Academy تمكنت من الحصول على وظيفة أحلامي كمطور ويب. المحتوى ممتاز والمدربين محترفين.',
    contentEn: 'Thanks to BeePro Academy, I was able to land my dream job as a web developer. The content is excellent and the instructors are professional.',
    rating: 5
  },
  {
    id: '2',
    name: 'فاطمة أحمد',
    nameEn: 'Fatima Ahmed',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    role: 'مصممة جرافيك',
    roleEn: 'Graphic Designer',
    content: 'دورات التصميم ساعدتني كثيراً في تطوير مهاراتي. أنصح بشدة بهذه المنصة.',
    contentEn: 'The design courses helped me a lot in developing my skills. I highly recommend this platform.',
    rating: 5
  },
  {
    id: '3',
    name: 'محمد سالم',
    nameEn: 'Mohamed Salem',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    role: 'متداول',
    roleEn: 'Trader',
    content: 'دورة التحليل الفني غيرت نظرتي للأسواق المالية. الآن أتداول بثقة أكبر.',
    contentEn: 'The technical analysis course changed my view of financial markets. Now I trade with more confidence.',
    rating: 5
  }
]

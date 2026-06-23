// Category metadata for navigation and home page
export const courses = []

export const categories = [
  {
    id: 'financial_markets',
    name: 'الأسواق المالية',
    nameEn: 'Financial Markets',
    description: 'تعلم التحليل المالي والتداول في الأسواق',
    descriptionEn: 'Learn financial analysis and market trading',
    icon: 'trending-up',
    color: 'from-yellow-500 to-orange-600',
    coursesCount: 0,
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
    coursesCount: 0,
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
    coursesCount: 0,
    image: '/assets/it2.jpg'
  }
]

export const courseLessons = {}

export const stats = {
  students: 15000,
  courses: 70,
  instructors: 25,
  hours: 2500
}

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

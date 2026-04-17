import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { FiUsers, FiAward, FiBookOpen, FiGlobe, FiArrowRight } from 'react-icons/fi'

const About = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()

  const teamMembers = [
    {
      name: 'Ahmed Saeid',
      title: language === 'ar' ? 'محاضر أكاديمي أول وخبير تحليل البيانات المالية' : 'Senior Academic Lecturer & Financial Data Analysis Expert',
      badge: language === 'ar' ? 'خبير عالمي' : 'Global Expert',
      avatar: '🧔‍♂️',
      about: language === 'ar' 
        ? 'أحمد سعيد محاضر أكاديمي عالمي معروف بخبرته الاستثنائية في تحليل بيانات الشركات والأسواق المالية والأسهم.'
        : 'Ahmed Saeid is a world-renowned academic lecturer with exceptional expertise in company, financial, and stock data analysis.',
    },
    {
      name: 'Abdullah Kofiyh',
      title: language === 'ar' ? 'الرئيس التنفيذي ومدير المنصة' : 'CEO & Platform Administrator',
      badge: language === 'ar' ? 'قائد شاب - 30 عام' : 'Young Leader - 30 years',
      avatar: '/assets/abdullah1.jpg',
      isImage: true,
      about: language === 'ar'
        ? 'عبدالله كوفية هو الرئيس التنفيذي صاحب الرؤية ومدير منصة BePro-Academy.'
        : 'Abdullah Kofiyh is the visionary CEO and Platform Administrator of BePro-Academy.',
    },
    {
      name: 'Abdullah Babrouk',
      title: language === 'ar' ? 'مدير التسويق والعلاقات العامة' : 'Chief Marketing & Public Relations Officer',
      badge: language === 'ar' ? 'قائد تسويق شاب - 30 عام' : 'Young Marketing Leader - 30 years',
      avatar: '/assets/abdullah2.jpg',
      isImage: true,
      about: language === 'ar'
        ? 'عبدالله بابروك هو مدير التسويق والعلاقات العامة الديناميكي لدينا.'
        : 'Abdullah Babrouk is our dynamic Chief Marketing & Public Relations Officer.',
    }
  ]

  const stats = [
    { number: '250+', label: language === 'ar' ? 'طالب نشط' : 'Active Students' },
    { number: '95%', label: language === 'ar' ? 'معدل النجاح' : 'Success Rate' },
    { number: '500+', label: language === 'ar' ? 'فيديو تعليمي' : 'Video Lessons' },
    { number: '24/7', label: language === 'ar' ? 'دعم متواصل' : 'Support Access' }
  ]

  const values = [
    {
      icon: FiBookOpen,
      title: language === 'ar' ? 'التعليم الشامل' : 'Comprehensive Education',
      description: language === 'ar'
        ? 'نقدم مناهج شاملة تغطي جميع جوانب الأسواق المالية والتحليل الفني والأساسي.'
        : 'We provide comprehensive curricula covering all aspects of financial markets, technical and fundamental analysis.'
    },
    {
      icon: FiUsers,
      title: language === 'ar' ? 'خبراء متميزون' : 'Expert Instructors',
      description: language === 'ar'
        ? 'تعلم من نخبة الخبراء والمحترفين في مجال الأسواق المالية.'
        : 'Learn from elite experts and professionals in the financial markets field.'
    },
    {
      icon: FiAward,
      title: language === 'ar' ? 'شهادات معتمدة' : 'Certified Credentials',
      description: language === 'ar'
        ? 'احصل على شهادات معتمدة تعزز مسيرتك المهنية في عالم المال.'
        : 'Earn certified credentials that boost your career in the financial world.'
    },
    {
      icon: FiGlobe,
      title: language === 'ar' ? 'مجتمع عالمي' : 'Global Community',
      description: language === 'ar'
        ? 'انضم إلى مجتمع عالمي من المتعلمين والمحترفين في الأسواق المالية.'
        : 'Join a global community of learners and professionals in financial markets.'
    }
  ]

  return (
    <div className="bepro-page pt-20">
      {/* Hero Section */}
      <section className="py-20">
        <div className="bepro-container">
          <div className="bepro-page-header">
            <h1>{language === 'ar' ? 'من نحن' : 'About Us'}</h1>
            <p>
              {language === 'ar'
                ? 'BePro Academy هي منصة تعليمية رائدة تهدف إلى تطوير مهارات الأفراد في البرمجة والتصميم وتقنية المعلومات والأسواق المالية.'
                : 'BePro Academy is a leading educational platform aimed at developing individuals\' skills in Programming, Design, IT, and Financial Markets.'
              }
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="bepro-container">
          <div className="bepro-grid-4">
            {stats.map((stat, index) => (
              <div key={index} className="bepro-stat-card animate-fadeInUp" style={{ animationDelay: `${index * 0.1}s` }}>
                <span className="bepro-stat-number">{stat.number}</span>
                <span className="bepro-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="bepro-container">
          <div className="bepro-grid-2">
            <div className="bepro-card animate-fadeInUp">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="text-3xl">🎯</span>
                {language === 'ar' ? 'مهمتنا' : 'Our Mission'}
              </h3>
              <p className="text-white/80 text-lg leading-relaxed">
                {language === 'ar'
                  ? 'تمكين الأفراد من تحقيق أهدافهم المالية من خلال توفير تعليم عالي الجودة ومناهج متقدمة في تحليل الأسواق المالية والتداول الاحترافي.'
                  : 'Empowering individuals to achieve their financial goals by providing high-quality education and advanced curricula in financial market analysis and professional trading.'
                }
              </p>
            </div>
            <div className="bepro-card animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <span className="text-3xl">👁️</span>
                {language === 'ar' ? 'رؤيتنا' : 'Our Vision'}
              </h3>
              <p className="text-white/80 text-lg leading-relaxed">
                {language === 'ar'
                  ? 'أن نكون المنصة التعليمية الرائدة عالمياً في مجال الأسواق المالية، ونساهم في بناء جيل من المحللين والمتداولين المحترفين.'
                  : 'To be the world\'s leading educational platform in financial markets, contributing to building a generation of professional analysts and traders.'
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16">
        <div className="bepro-container">
          <h2 className="bepro-section-title">
            {language === 'ar' ? 'قيمنا' : 'Our Values'}
          </h2>
          <div className="bepro-grid-4 mt-12">
            {values.map((value, index) => (
              <div key={index} className="bepro-card text-center animate-fadeInUp" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#009FFD] to-[#2A93D5] flex items-center justify-center">
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-white/70">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="bepro-container">
          <h2 className="bepro-section-title">
            {language === 'ar' ? 'فريقنا' : 'Our Team'}
          </h2>
          <p className="bepro-section-subtitle">
            {language === 'ar'
              ? 'تعرف على الخبراء الذين يقفون وراء نجاح BePro Academy'
              : 'Meet the experts behind the success of BePro Academy'
            }
          </p>
          <div className="bepro-grid-3 mt-12">
            {teamMembers.map((member, index) => (
              <div key={index} className="bepro-card text-center animate-fadeInUp" style={{ animationDelay: `${index * 0.15}s` }}>
                <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-[#009FFD] to-[#2A93D5] flex items-center justify-center">
                  {member.isImage ? (
                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{member.avatar}</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>
                <p className="text-[#00D9FF] font-medium mb-2">{member.title}</p>
                <span className="inline-block px-4 py-1 bg-white/10 rounded-full text-white/80 text-sm mb-4">
                  {member.badge}
                </span>
                <p className="text-white/70 text-sm">{member.about}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="bepro-container">
          <div className="bepro-card-white text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {language === 'ar' ? 'ابدأ رحلتك معنا اليوم' : 'Start Your Journey With Us Today'}
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              {language === 'ar'
                ? 'انضم إلى آلاف الطلاب الذين يثقون في BePro Academy لتحقيق أهدافهم المالية والمهنية.'
                : 'Join thousands of students who trust BePro Academy to achieve their financial and professional goals.'
              }
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/courses" className="bepro-btn-primary">
                {language === 'ar' ? 'تصفح الدورات' : 'Browse Courses'}
                <FiArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/contact" className="bepro-btn-secondary" style={{ color: '#009FFD', borderColor: '#009FFD' }}>
                {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About
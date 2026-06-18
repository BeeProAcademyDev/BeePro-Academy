import { useLanguage } from '../contexts/LanguageContext'
import LandingContactSection from '../components/landing/LandingContactSection'
import LandingFooter from '../components/landing/LandingFooter'
import { FiUsers, FiAward, FiBookOpen, FiGlobe } from 'react-icons/fi'

const About = () => {
  const { language } = useLanguage()

  const teamMembers = [
    {
      name: 'Ahmed Mohamed',
      title: language === 'ar'
        ? 'محلل أسهم وعملات رقمية مستقل / مدير محافظ'
        : 'Independent Stock & Crypto Analyst / Portfolio Manager',
      badge: language === 'ar' ? 'خبير أسواق' : 'Market Expert',
      avatar: '/assets/photo_5987888613921852797_y.jpg',
      isImage: true,
      about: language === 'ar'
        ? 'محلل مستقل للأسهم والعملات الرقمية ومدير محافظ بخبرة في أسواق أمريكا والسعودية والعملات الرقمية، يجمع بين التحليل الفني والأساسي لبناء استراتيجيات محافظ متوازنة المخاطر.'
        : 'Independent stock and crypto analyst and portfolio manager with experience across U.S. equities, Saudi markets, and digital assets, combining technical and fundamental analysis for risk-adjusted portfolio strategies.',
    },
    {
      name: 'Abdullah Kofiyh',
      title: language === 'ar' ? 'الرئيس التنفيذي ومدير المنصة' : 'CEO & Platform Administrator',
      badge: language === 'ar' ? 'الرئيس التنفيذي' : 'CEO',
      avatar: '/assets/abdullah1.jpg',
      isImage: true,
      about: language === 'ar'
        ? 'عبدالله كوفية هو الرئيس التنفيذي صاحب الرؤية ومدير منصة BeePro-Academy.'
        : 'Abdullah Kofiyh is the visionary CEO and Platform Administrator of BeePro-Academy.',
    },
    {
      name: 'Abdullah Babrouk',
      title: language === 'ar' ? 'مدير التسويق والعلاقات العامة' : 'Chief Marketing & Public Relations Officer',
      badge: language === 'ar' ? 'مدير التسويق' : 'Marketing Director',
      avatar: '/assets/abdullah2.jpg',
      isImage: true,
      about: language === 'ar'
        ? 'عبدالله بابروك هو مدير التسويق والعلاقات العامة الديناميكي لدينا.'
        : 'Abdullah Babrouk is our dynamic Chief Marketing & Public Relations Officer.',
    }
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
    <>
      <div className="bepro-page">
        <section className="py-20">
          <div className="bepro-container">
            <div className="bepro-page-header">
              <h1>{language === 'ar' ? 'من نحن' : 'About Us'}</h1>
              <p>
                {language === 'ar'
                  ? 'BeePro Academy هي منصة تعليمية رائدة تهدف إلى تطوير مهارات الأفراد في البرمجة والتصميم وتقنية المعلومات والأسواق المالية.'
                  : 'BeePro Academy is a leading educational platform aimed at developing individuals\' skills in Programming, Design, IT, and Financial Markets.'
                }
              </p>
            </div>
          </div>
        </section>

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
                    ? 'مهمتنا هي تزويد الأفراد الذين يسعون لتطوير أنفسهم شخصياً ومهنياً بالمعرفة والمهارات الأساسية اللازمة لتحقيق أهدافهم.'
                    : 'Our mission is to equip individuals dedicated to their personal and professional development with essential knowledge and skills.'
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
                    ? 'إن تحقيق مكانة بين المؤسسات الأكاديمية الرائدة في الشرق الأوسط هو رؤيتنا.'
                    : 'Achieving a position among the leading academic institutions in the Middle East is our vision.'
                  }
                </p>
              </div>
            </div>
          </div>
        </section>

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

        <section className="py-16 pb-20">
          <div className="bepro-container">
            <h2 className="bepro-section-title">
              {language === 'ar' ? 'فريقنا' : 'Our Team'}
            </h2>
            <p className="bepro-section-subtitle">
              {language === 'ar'
                ? 'تعرف على الخبراء الذين يقفون وراء نجاح BeePro Academy'
                : 'Meet the experts behind the success of BeePro Academy'
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
      </div>

      <LandingContactSection />
      <LandingFooter />
    </>
  )
}

export default About

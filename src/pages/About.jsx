import { useLanguage } from '../contexts/LanguageContext'
import LandingContactSection from '../components/landing/LandingContactSection'
import LandingFooter from '../components/landing/LandingFooter'
import { FiUsers, FiAward, FiBookOpen, FiGlobe } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'

const About = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()

  const teamMembers = [
    {
      name: 'Ahmed Mohamed',
      title: t('about.independentStockCryptoAnalystP'),
      badge: t('about.marketExpert'),
      avatar: '/assets/photo_5987888613921852797_y.jpg',
      isImage: true,
      about: t('about.independentStockAndCryptoAnaly'),
    },
    {
      name: 'Abdullah Kofiyh',
      title: t('about.ceoPlatformAdministrator'),
      badge: t('about.ceo'),
      avatar: '/assets/abdullah1.jpg',
      isImage: true,
      about: t('about.abdullahKofiyhIsTheVisionaryCe'),
    },
    {
      name: 'Abdullah Babrouk',
      title: t('about.chiefMarketingPublicRelationsO'),
      badge: t('about.marketingDirector'),
      avatar: '/assets/abdullah2.jpg',
      isImage: true,
      about: t('about.abdullahBabroukIsOurDynamicChi'),
    }
  ]

  const values = [
    {
      icon: FiBookOpen,
      title: t('about.comprehensiveEducation'),
      description: t('about.weProvideComprehensiveCurricul')
    },
    {
      icon: FiUsers,
      title: t('about.expertInstructors'),
      description: t('about.learnFromEliteExpertsAndProfes')
    },
    {
      icon: FiAward,
      title: t('about.certifiedCredentials'),
      description: t('about.earnCertifiedCredentialsThatBo')
    },
    {
      icon: FiGlobe,
      title: t('about.globalCommunity'),
      description: t('about.joinAGlobalCommunityOfLearners')
    }
  ]

  return (
    <>
      <div className="bepro-page">
        <section className="py-20">
          <div className="bepro-container">
            <div className="bepro-page-header">
              <h1>{t('about.aboutUs')}</h1>
              <p>
                {t('about.beeproAcademyIsALeadingEducati')}
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
                  {t('about.ourMission')}
                </h3>
                <p className="text-white/80 text-lg leading-relaxed">
                  {t('about.ourMissionIsToEquipIndividuals')}
                </p>
              </div>
              <div className="bepro-card animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                  <span className="text-3xl">👁️</span>
                  {t('about.ourVision')}
                </h3>
                <p className="text-white/80 text-lg leading-relaxed">
                  {t('about.achievingAPositionAmongTheLead')}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="bepro-container">
            <h2 className="bepro-section-title">
              {t('about.ourValues')}
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
              {t('about.ourTeam')}
            </h2>
            <p className="bepro-section-subtitle">
              {t('about.meetTheExpertsBehindTheSuccess')}
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

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent } from '../lib/analytics';
import { normalizeSignupAccountType } from '../lib/roles';
import { formatErrorMessage } from '../lib/supabaseErrors';
import SiteNavbar from '../components/layout/SiteNavbar';
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCheckCircle,
  FiEdit3,
  FiEye,
  FiMail,
  FiMessageCircle,
  FiMonitor,
  FiPlayCircle,
  FiShield,
  FiTarget,
  FiTool,
  FiTrendingUp,
  FiUsers,
  FiVideo
} from 'react-icons/fi';
import './LandingPage.css';

const VISION_MISSION_CONTENT = {
  vision: {
    titleEn: 'Our Vision',
    titleAr: 'رؤيتنا',
    textEn: 'Achieving a position among the leading academic institutions in the Middle East is our vision.',
    textAr: 'إن تحقيق مكانة بين المؤسسات الأكاديمية الرائدة في الشرق الأوسط هو رؤيتنا.'
  },
  mission: {
    titleEn: 'Our Mission',
    titleAr: 'مهمتنا',
    textEn: 'Our mission is to equip individuals dedicated to their personal and professional development with essential knowledge and skills.',
    textAr: 'مهمتنا هي تزويد الأفراد الذين يسعون لتطوير أنفسهم شخصياً ومهنياً بالمعرفة والمهارات الأساسية اللازمة لتحقيق أهدافهم.'
  }
};

// Hero Section Component
const HeroSection = () => {
  const videoRef = useRef(null);
  const { i18n } = useTranslation();
  const [latestPosts, setLatestPosts] = useState([]);

  const isAr = i18n.language === 'ar';

  useEffect(() => {
    // Set video playback speed to 0.5 (slow motion)
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    import('../services/api')
      .then(({ blogService }) => blogService.getPublishedPosts())
      .then((posts) => {
        if (mounted) setLatestPosts((posts || []).slice(0, 3));
      })
      .catch((error) => {
        console.warn('Unable to load landing blog posts:', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="hero-container">
      <section className="video-section">
        <video
          ref={videoRef}
          className="video-bg"
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          style={{ pointerEvents: 'none' }}
          poster="/assets/hero-background.png"
        >
          <source src="/assets/section1.mp4" type="video/mp4" />
        </video>
        <div className="video-overlay">
          <div className="hero-content">
            <div className="hero-title-wrapper">
              <h1>BeePro Academy</h1>
              <div className="hero-title-particles">
                {[...Array(10)].map((_, i) => <span key={i}></span>)}
              </div>
            </div>
            <div className="hero-blog-panel">
              <div className="hero-blog-header">
                <span>{isAr ? 'مدونة المنصة' : 'Platform Blogs'}</span>
                <Link to="/blogs">{isAr ? 'عرض الكل' : 'View all'}</Link>
              </div>
              <div className="hero-blog-list">
                {latestPosts.length > 0 ? latestPosts.map((post) => (
                  <Link key={post.id} to="/blogs" className="hero-blog-item">
                    <strong>{isAr ? post.title || post.title_en : post.title_en || post.title}</strong>
                    <span>{isAr ? post.excerpt || post.excerpt_en : post.excerpt_en || post.excerpt}</span>
                  </Link>
                )) : (
                  <Link to="/blogs" className="hero-blog-item hero-blog-item-empty">
                    <strong>{isAr ? 'اقرأ أحدث مقالات BeePro Academy' : 'Read BeePro Academy articles'}</strong>
                    <span>{isAr ? 'مقالات تعليمية مرتبطة بكورسات المنصة.' : 'Learning articles connected to the platform courses.'}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const BlogPreviewSection = () => {
  const { i18n } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const isAr = i18n.language === 'ar';

  useEffect(() => {
    let mounted = true;

    import('../services/api')
      .then(({ blogService }) => blogService.getPublishedPosts())
      .then((rows) => {
        if (mounted) setPosts((rows || []).slice(0, 3));
      })
      .catch((error) => {
        console.warn('Unable to load homepage blog posts:', error);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const fallbackPosts = [
    {
      id: 'fallback-learning-path',
      title: 'كيف تختار مسارك التعليمي في BeePro Academy',
      title_en: 'How to Choose Your Learning Path at BeePro Academy',
      excerpt: 'تعرف على طريقة اختيار الكورس المناسب حسب هدفك ومستواك الحالي.',
      excerpt_en: 'Learn how to choose the right course based on your goal and current level.'
    },
    {
      id: 'fallback-market-analysis',
      title: 'لماذا يحتاج المتداول إلى أساس تعليمي قوي؟',
      title_en: 'Why Traders Need a Strong Learning Foundation',
      excerpt: 'المعرفة المنظمة تساعدك على قراءة السوق وتقليل القرارات العشوائية.',
      excerpt_en: 'Structured knowledge helps you read the market and reduce random decisions.'
    },
    {
      id: 'fallback-practice',
      title: 'كيف تحول الدروس إلى تطبيق عملي؟',
      title_en: 'How to Turn Lessons into Practical Work',
      excerpt: 'ابدأ بملاحظات صغيرة، ثم مشروع تطبيقي، ثم مراجعة مستمرة لما تعلمته.',
      excerpt_en: 'Start with notes, build a practical project, then keep reviewing what you learn.'
    }
  ];

  const visiblePosts = posts.length > 0 ? posts : fallbackPosts;

  return (
    <section className="homepage-blogs-section" id="blogs">
      <div className="homepage-blogs-container">
        <div className="homepage-blogs-header">
          <span>{isAr ? 'مدونة BeePro Academy' : 'BeePro Academy Blog'}</span>
          <h2>{isAr ? 'أحدث المقالات التعليمية' : 'Latest Learning Articles'}</h2>
          <p>
            {isAr
              ? 'مقالات مرتبطة بكورسات المنصة تظهر للعميل من الصفحة الرئيسية.'
              : 'Course-aware articles shown directly on the homepage.'}
          </p>
        </div>

        <div className="homepage-blogs-grid">
          {visiblePosts.map((post, index) => (
            <Link
              key={post.id}
              to="/blogs"
              className="homepage-blog-card"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="homepage-blog-card-label">
                {post.category || (isAr ? 'تعليم' : 'Education')}
              </div>
              <h3>{isAr ? post.title || post.title_en : post.title_en || post.title}</h3>
              <p>{isAr ? post.excerpt || post.excerpt_en : post.excerpt_en || post.excerpt}</p>
              <span>{isAr ? 'قراءة المقال' : 'Read article'}</span>
            </Link>
          ))}
        </div>

        <Link to="/blogs" className="homepage-blogs-btn">
          {isLoading
            ? (isAr ? 'جاري تحميل المقالات...' : 'Loading articles...')
            : (isAr ? 'عرض صفحة المقالات' : 'Open Blog Page')}
        </Link>
      </div>
    </section>
  );
};
// Animated Statements Section
const StatementsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const statements = [
    { text: "Unlock your financial future with", highlight: "BeePro-Academy", suffix: "'s expert-led courses." },
    { text: "", highlight: "BeePro-Academy", suffix: " empowers you to master real-world market analysis skills." },
    { text: "Achieve your certification in finance and analysis—only at", highlight: "BeePro-Academy", suffix: "." },
    { text: "Join", highlight: "BeePro-Academy", suffix: "'s vibrant learning community and learn from top industry mentors." },
    { text: "Start your journey at", highlight: "BeePro-Academy", suffix: " to become a financial analysis professional." },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % statements.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [statements.length]);

  return (
    <section className="statements-section">
      <div className="particles" id="particles">
        {[...Array(50)].map((_, i) => (
          <div 
            key={i} 
            className="particle" 
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${20 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>
      
      <div className="statement-container">
        {statements.map((statement, index) => (
          <p 
            key={index} 
            className={`statement ${index === currentIndex ? 'active' : ''}`}
          >
            {statement.text} <span className="highlight">{statement.highlight}</span>{statement.suffix}
          </p>
        ))}
      </div>
      
      <div className="progress-container">
        {statements.map((_, index) => (
          <div 
            key={index} 
            className={`progress-dot ${index === currentIndex ? 'active' : ''}`}
          />
        ))}
      </div>
    </section>
  );
};

// Vision & Mission Section
const VisionMissionSection = () => {
  return (
    <section className="vision-mission-section" id="vision-mission">
      <div className="vision-mission-container">
        <div className="vision-mission-header">
          <span className="vision-mission-badge">BeePro Academy</span>
          <h2>Vision & Mission</h2>
          <p className="vision-mission-subtitle">رؤيتنا ومهمتنا</p>
        </div>

        <div className="vision-mission-grid">
          <article className="vision-mission-card vision-card">
            <div className="vm-card-icon" aria-hidden="true"><FiEye /></div>
            <div className="vm-card-labels">
              <h3>{VISION_MISSION_CONTENT.vision.titleEn}</h3>
              <h4>{VISION_MISSION_CONTENT.vision.titleAr}</h4>
            </div>
            <div className="vm-card-body">
              <p className="vm-text-en" dir="ltr">{VISION_MISSION_CONTENT.vision.textEn}</p>
              <p className="vm-text-ar" dir="rtl">{VISION_MISSION_CONTENT.vision.textAr}</p>
            </div>
          </article>

          <article className="vision-mission-card mission-card">
            <div className="vm-card-icon" aria-hidden="true"><FiTarget /></div>
            <div className="vm-card-labels">
              <h3>{VISION_MISSION_CONTENT.mission.titleEn}</h3>
              <h4>{VISION_MISSION_CONTENT.mission.titleAr}</h4>
            </div>
            <div className="vm-card-body">
              <p className="vm-text-en" dir="ltr">{VISION_MISSION_CONTENT.mission.textEn}</p>
              <p className="vm-text-ar" dir="rtl">{VISION_MISSION_CONTENT.mission.textAr}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

// Teacher Signup CTA
const TeacherSignupSection = ({ onTeachClick }) => {
  return (
    <section className="teacher-signup-section" id="teach">
      <div className="teacher-signup-container">
        <div className="teacher-signup-content">
          <span className="teacher-signup-badge">For Educators</span>
          <h2>Share Your Expertise on BeePro Academy</h2>
          <p>
            Create courses, host live sessions, and connect with students across financial markets,
            data analysis, and IT. Instructor accounts require admin approval before you can publish.
          </p>
          <ul className="teacher-signup-benefits">
            <li>Build and manage your own courses</li>
            <li>Live classes via Jitsi or Google Meet</li>
            <li>Real-time chat with enrolled students</li>
            <li>Custom payment methods for paid courses</li>
          </ul>
          <button type="button" className="teacher-signup-btn" onClick={onTeachClick}>
            Register as a Teacher
          </button>
        </div>
      </div>
    </section>
  );
};

// Platform Features Section
const PlatformSection = () => {
  const features = [
    {
      icon: FiTrendingUp,
      title: 'Financial Markets Analysis & Risk Management',
      description: 'Master financial markets with comprehensive courses covering technical analysis, fundamental analysis, risk assessment, and portfolio management strategies.',
      link: '/financial-markets'
    },
    {
      icon: FiBarChart2,
      title: 'Data Analysis',
      description: 'Transform raw data into actionable insights. Learn statistical analysis, data visualization, Python/R programming, and business intelligence tools.',
      link: '/data-analysis'
    },
    {
      icon: FiMonitor,
      title: 'IT',
      description: 'Build your IT expertise with courses in cloud computing, network administration, cybersecurity, and enterprise system management.',
      link: '/it'
    }
  ];

  return (
    <section className="platform-section">
      <div className="platform-overlay"></div>
      <div className="platform-container">
        <div className="platform-header">
          <h2>Master Financial Markets Analysis</h2>
          <p>BeePro-Academy is your gateway to professional financial education. Learn from industry experts, gain practical skills, and transform your career in finance.</p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <Link
              key={index}
              to={feature.link}
              className="feature-card"
              style={{ animationDelay: `${0.1 * (index + 1)}s`, textDecoration: 'none' }}
              onClick={() => trackEvent('course_view', { content_category: feature.title })}
            >
              <div className="feature-icon"><feature.icon /></div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// Stats Section with Video Shadow Effect
const StatsSection = () => {
  const features = [
    'Live Trading Sessions',
    'Real Market Analysis',
    'Professional Certification',
    'Lifetime Access'
  ];

  return (
    <section className="new-background-section" style={{ position: 'relative', minHeight: '500px', overflow: 'hidden', padding: '3rem 2rem' }}>
      {/* Video Shadow Effect - positioned underneath */}
      <video
        style={{ 
          position: 'absolute',
          bottom: '-50px',
          left: '50%',
          transform: 'translateX(-50%) scale(0.8)',
          width: '90%',
          height: '80%',
          objectFit: 'cover',
          borderRadius: '20px',
          opacity: '0.4',
          filter: 'blur(3px) brightness(0.6)',
          zIndex: 1,
          pointerEvents: 'none',
          boxShadow: '0 25px 50px rgba(0,0,0,0.8)'
        }}
        autoPlay
        muted
        loop
        playsInline
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
      >
        <source src="/assets/eduvideo (2).mp4" type="video/mp4" />
      </video>
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 3 }}>
        <div className="new-section-content">
          <h2>Your Journey to Financial Excellence Starts Here with BeePro-Academy</h2>
          
          <div className="education-features">
            {features.map((feature, index) => (
              <div key={index} className="education-feature" style={{
                backgroundColor: 'rgba(148, 163, 184, 0.28)',
                padding: '0.5rem',
                borderRadius: '6px',
                backdropFilter: 'blur(5px)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.16)'
              }}>
                <span className="feature-check"><FiCheckCircle /></span>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Category Sections Component - Educational Platform Sections
const CategorySections = () => {
  const categories = [
    {
      id: 'it',
      title: 'Information Technology',
      subtitle: 'Build the Future Infrastructure',
      description: 'Explore networking, cybersecurity, and cloud technologies. Become the backbone of modern digital enterprises.',
      backgroundImage: '/assets/it2.jpg',
      icon: FiMonitor,
      features: ['Cloud Computing', 'Cybersecurity', 'Network Administration', 'System Management'],
      color: '#4ECDC4',
      useVideo: false
    },
    {
      id: 'data',
      title: 'Data Analysis',
      subtitle: 'Turn Data into Decisions',
      description: 'Master statistics, data visualization, and analytical skills. Transform raw data into actionable business insights.',
      backgroundImage: '/assets/data.jpg',
      icon: FiBarChart2,
      features: ['Statistical Analysis', 'Data Visualization', 'Python & R', 'Business Intelligence'],
      color: '#45B7D1',
      useVideo: false
    },
    {
      id: 'finance',
      title: 'Financial Markets Analysis',
      subtitle: 'Navigate the Markets',
      description: 'Understand market data, trading strategies, and investment insights. Build expertise in financial analysis and risk management.',
      backgroundVideo: '/assets/eduvideo.mp4',
      backgroundImage: '/assets/anlysis.jpg',
      icon: FiTrendingUp,
      features: ['Technical Analysis', 'Trading Strategies', 'Risk Management', 'Portfolio Management'],
      color: '#96CEB4',
      useVideo: true
    }
  ];

  return (
    <section className="category-sections">
      {categories.map((category, index) => (
        <div
          key={category.id}
          className={`category-section category-section-${index % 2 === 0 ? 'left' : 'right'}`}
          id={category.id}
          style={{
            '--category-color': category.color
          }}
        >
          {category.useVideo ? (
            <video
              className="category-video-bg"
              autoPlay
              muted
              loop
              playsInline
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              style={{ pointerEvents: 'none' }}
              poster={category.backgroundImage}
            >
              <source src={category.backgroundVideo} type="video/mp4" />
            </video>
          ) : (
            <div
              className="category-background"
              style={{
                backgroundImage: `url(${category.backgroundImage})`
              }}
            />
          )}
          <div className="category-overlay" />
          <div className="category-content">
            <div className="category-icon"><category.icon /></div>
            <h2 className="category-title">{category.title}</h2>
            <p className="category-subtitle">{category.subtitle}</p>
            <p className="category-description">{category.description}</p>
            <div className="category-features">
              {category.features.map((feature, idx) => (
                <span key={idx} className="category-feature-tag">
                  {feature}
                </span>
              ))}
            </div>
            <div className="category-buttons">
              <a href={`/courses?category=${category.id}`} className="category-btn primary">
                View Courses
              </a>
              <a href={`#${category.id}-details`} className="category-btn secondary">
                Learn More
              </a>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};

// Contact Section
const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitMessage(`Thank you ${formData.name}! Message sent successfully.`);
      trackEvent('contact_submit', { form_name: 'landing_contact', subject: formData.subject });
      setFormData({ name: '', phone: '', email: '', subject: '', message: '' });
      
      setTimeout(() => setSubmitMessage(''), 3000);
    }, 1500);
  };

  return (
    <section className="contact-section" id="contact">
      <div className="contact-container">
        <div className="contact-header">
          <h2>Get in Touch</h2>
          <p>Have questions about our courses, pricing, or anything else? We're here to help!</p>
        </div>
        
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contact-name">Full Name *</label>
              <input 
                type="text" 
                id="contact-name" 
                name="name"
                className="form-control" 
                placeholder="John Doe" 
                value={formData.name}
                onChange={handleChange}
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="contact-phone">Phone Number</label>
              <input 
                type="tel" 
                id="contact-phone" 
                name="phone"
                className="form-control" 
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="contact-email">Email Address *</label>
            <input 
              type="email" 
              id="contact-email" 
              name="email"
              className="form-control" 
              placeholder="john@example.com" 
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="contact-subject">What would you like to know? *</label>
            <select 
              id="contact-subject" 
              name="subject"
              className="form-control" 
              value={formData.subject}
              onChange={handleChange}
              required
            >
              <option value="">Select a topic</option>
              <option value="course-types">Course Types & Content</option>
              <option value="pricing">Pricing & Payment Options</option>
              <option value="schedule">Schedule & Duration</option>
              <option value="certification">Certification Details</option>
              <option value="prerequisites">Prerequisites & Requirements</option>
              <option value="other">Other Questions</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="contact-message">Your Message *</label>
            <textarea 
              id="contact-message" 
              name="message"
              className="form-control" 
              placeholder="Please tell us more about your inquiry..." 
              value={formData.message}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" className="submit-contact-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
        
        {submitMessage && (
          <div className="success-message">{submitMessage}</div>
        )}
        
        <div className="contact-info">
          <h3>Or reach us directly</h3>
          <div className="contact-methods">
            <div className="contact-method">
              <span className="contact-method-icon"><FiMail /></span>
              <span>info@beepro-academy.com</span>
            </div>
            <div className="contact-method">
              <span className="contact-method-icon"><FiMessageCircle /></span>
              <span>Live Chat Available</span>
            </div>
          </div>
          
          <div className="social-media-section">
            <h3>Follow us on social media</h3>
            <div className="social-media-links">
              <a href="#" className="social-link" title="Community"><span><FiUsers /></span></a>
              <a href="#" className="social-link" title="Video Lessons"><span><FiPlayCircle /></span></a>
              <a href="#" className="social-link" title="Learning Updates"><span><FiActivity /></span></a>
              <a href="#" className="social-link" title="Support"><span><FiMessageCircle /></span></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Chatbot Widget Component
const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { type: 'bot', text: "Hi! Welcome to BeePro-Academy!", time: 'Just now' },
    { type: 'bot', text: "I'm here to help you explore our financial education programs. What would you like to know?", time: 'Just now' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setShowNotification(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateBotResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('course') || lowerMessage.includes('program')) {
      return "We offer comprehensive courses in:\n\n- Technical Analysis\n- Trading Strategies\n- Risk Management\n- Financial Modeling\n\nEach course includes video lessons, practical exercises, and expert mentorship!";
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return "We have flexible pricing options:\n\n• Basic Plan: $99/month\n• Pro Plan: $199/month\n• Lifetime Access: $999\n\nAll plans include certification and lifetime updates!";
    } else if (lowerMessage.includes('certif')) {
      return "Our certifications are industry-recognized and include:\n\n- Certified Market Analyst\n- Professional Trader Certificate\n- Risk Management Specialist\n\nThese credentials will boost your finance career!";
    } else if (lowerMessage.includes('start') || lowerMessage.includes('begin')) {
      return "Getting started is easy!\n\n1. Click 'Sign Up' to create your account\n2. Choose your learning path\n3. Start with our free introduction course\n4. Progress at your own pace\n\nWould you like me to guide you to the registration?";
    } else if (lowerMessage.includes('support') || lowerMessage.includes('help')) {
      return "We provide 24/7 support through:\n\n- Email: info@beepro-academy.com\n- Live chat (you're using it now!)\n- Community forums\n\nHow can I assist you today?";
    } else {
      return "Thanks for your question! Our courses cover everything from basic market analysis to advanced trading strategies. What specific aspect of financial education interests you most?";
    }
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const sendMessage = (text = inputValue) => {
    if (!text.trim()) return;
    
    const newUserMessage = { type: 'user', text: text.trim(), time: getCurrentTime() };
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      const botResponse = generateBotResponse(text);
      setMessages(prev => [...prev, { type: 'bot', text: botResponse, time: getCurrentTime() }]);
    }, 1500);
  };

  const quickReplies = [
    { icon: FiBookOpen, text: 'Course Info', query: 'Tell me about courses' },
    { icon: FiAward, text: 'Certifications', query: 'What certifications do you offer?' },
    { icon: FiTrendingUp, text: 'Pricing', query: 'Show pricing options' },
    { icon: FiTarget, text: 'Get Started', query: 'How do I get started?' }
  ];

  return (
    <div className="chatbot-widget">
      <div 
        className={`chatbot-button ${isOpen ? 'active' : ''}`} 
        onClick={() => { setIsOpen(!isOpen); setShowNotification(false); }}
      >
        {showNotification && !isOpen && <div className="chat-notification">1</div>}
        <svg className="chat-icon" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        <svg className="close-icon" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </div>
      
      <div className={`chatbot-window ${isOpen ? 'active' : ''}`}>
        <div className="chat-header">
          <div className="bot-avatar">
            <FiMessageCircle />
            <div className="online-indicator"></div>
          </div>
          <div className="chat-header-info">
            <h3>BeePro Assistant</h3>
            <p>Always here to help</p>
          </div>
        </div>
        
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.type}`}>
              <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
              <div className="message-time">{msg.time}</div>
            </div>
          ))}
          {isTyping && (
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="quick-replies">
          {quickReplies.map((reply, index) => (
            <div 
              key={index} 
              className="quick-reply" 
              onClick={() => sendMessage(reply.query)}
            >
              <reply.icon />
              {reply.text}
            </div>
          ))}
        </div>
        
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button className="send-button" onClick={() => sendMessage()}>
            <svg className="send-icon" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Footer Component
const LandingFooter = () => {
  return (
    <footer className="landing-footer">
      <div className="footer-content">
        <div className="footer-grid">
          {/* About BeePro-Academy */}
          <div className="footer-section">
            <div className="landing-footer-logo">
              <img src="/assets/platform-logo.jpg" alt="BeePro Academy" />
              <span>BeePro Academy</span>
            </div>
            <h3>About BeePro-Academy</h3>
            <p>
              BeePro-Academy is the premier destination for financial markets education. We combine cutting-edge technology with expert instruction to deliver transformative learning experiences.
            </p>
            <div className="footer-badges">
              <span className="footer-badge">250+ Students</span>
              <span className="footer-badge">95% Success</span>
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul className="footer-links">
              <li><Link to="/courses"><FiBookOpen /> Browse Courses</Link></li>
              <li><Link to="/teacher/create-course"><FiEdit3 /> Create Course</Link></li>
              <li><a href="#instructors"><FiUsers /> Meet Our Experts</a></li>
              <li><a href="#certification"><FiAward /> Certification Programs</a></li>
              <li><a href="#contact"><FiMail /> Contact Support</a></li>
            </ul>
          </div>
          
          {/* Resources */}
          <div className="footer-section">
            <h3>Resources</h3>
            <ul className="footer-links">
              <li><Link to="/blogs"><FiBookOpen /> Market Analysis Blog</Link></li>
              <li><a href="#webinars"><FiVideo /> Live Webinars</a></li>
              <li><a href="#tools"><FiTool /> Trading Tools</a></li>
              <li><a href="#community"><FiUsers /> Student Community</a></li>
            </ul>
          </div>
          
          {/* Platform Features */}
          <div className="footer-section">
            <h3>Platform Features</h3>
            <div className="footer-features">
              <div className="footer-feature"><span><FiCheckCircle /></span> HD Video Lessons</div>
              <div className="footer-feature"><span><FiVideo /></span> Live Trading Sessions</div>
              <div className="footer-feature"><span><FiMonitor /></span> Mobile App Access</div>
              <div className="footer-feature"><span><FiShield /></span> Lifetime Updates</div>
            </div>
          </div>
        </div>
        
        {/* Bottom Footer */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <div className="footer-brand">
              <div className="footer-brand-logo">
                <img src="/assets/platform-logo.jpg" alt="BeePro Academy" />
                <h2>BEEPRO-ACADEMY</h2>
              </div>
              <p>© 2024 BeePro-Academy. All rights reserved.</p>
            </div>
            <div className="footer-legal">
              <a href="#terms">Terms of Service</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#refund">Refund Policy</a>
            </div>
          </div>
          
          <div className="footer-credits">
            <p>Powered by Advanced Financial Education Technology</p>
            <p>Platform Administrators: Abdullah Kofiyh & Abdullah Babrouk | Lead Instructor: Mohammed</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Auth Modal Component
const AuthModal = ({ isOpen, onClose, initialTab = 'login', initialAccountType = 'student', redirectTo = '/dashboard' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [accountType, setAccountType] = useState('student');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, register } = useAuth();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setActiveTab(initialTab);
      setAccountType(normalizeSignupAccountType(initialAccountType));
      setError('');
      setSuccess('');
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialTab, initialAccountType]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await login(loginData.email, loginData.password);
      if (result.success) {
        trackEvent('login', { method: 'email' });
        onClose();
        navigate(redirectTo || '/dashboard', { replace: true });
      } else {
        setError(formatErrorMessage(result.error) || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!registerData.phone.trim()) {
      setError('Phone number is required');
      setIsLoading(false);
      return;
    }
    
    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }
    
    try {
      const result = await register({
        email: registerData.email,
        password: registerData.password,
        fullName: registerData.name,
        phone: registerData.phone,
        role: accountType
      });
      
      if (result.success) {
        const emailNotice = result.emailDeliveryFailed
          ? 'Account created, but the confirmation email could not be sent. Sign in directly, or disable "Confirm email" in Supabase Dashboard → Authentication → Email.'
          : null;

        if (result.pendingApproval) {
          trackEvent('instructor_application', { method: 'email' });
          setSuccess(
            emailNotice
              ? `${emailNotice} Instructor application submitted — admin approval required before teaching.`
              : 'Instructor application submitted. An admin must approve your account before you can teach.'
          );
        } else {
          trackEvent('sign_up', { method: 'email', account_type: accountType });
          setSuccess(
            emailNotice || 'Account created! Please check your email for verification or login now.'
          );
        }
        setRegisterData({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
        setTimeout(() => setActiveTab('login'), 2500);
      } else {
        const errText = formatErrorMessage(result.error);
        const message = errText.includes('VITE_ADMIN_EMAILS')
          ? 'Admin registration is only available for authorized emails in VITE_ADMIN_EMAILS.'
          : (errText || 'Registration failed. Please try again.');
        setError(message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { authService } = await import('../services/api');
      await authService.signInWithGoogle();
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <button className="auth-modal-close" onClick={onClose}>✕</button>
          <h2>{activeTab === 'login' ? 'Welcome Back' : 'Join BeePro-Academy'}</h2>
          <p>{activeTab === 'login' ? 'Continue your journey in finance' : 'Start your financial education today'}</p>
        </div>
        <div className="auth-modal-body">
          {error && (
            <div className="auth-error">
              <span>⚠️</span> {error}
            </div>
          )}
          {success && (
            <div className="auth-success">
              <FiCheckCircle /> {success}
            </div>
          )}
          
          <div className="auth-tabs">
            <button
              className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
            >
              Login
            </button>
            <button
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => { setActiveTab('register'); setError(''); setSuccess(''); }}
            >
              Sign Up
            </button>
          </div>
          
          {activeTab === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="login-email">Email Address</label>
                <input
                  type="email"
                  id="login-email"
                  className="form-control"
                  placeholder="Enter your email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  type="password"
                  id="login-password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
              <div className="auth-forgot-row">
                <Link
                  to="/forgot-password"
                  className="auth-forgot-link"
                  onClick={onClose}
                >
                  {t('auth.login.forgot')}
                </Link>
              </div>
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login to Account'}
              </button>
              
              <div className="auth-divider">
                <span>or</span>
              </div>
              
              <button type="button" className="google-btn" onClick={handleGoogleAuth}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="form-group">
                <label htmlFor="register-name">Full Name</label>
                <input
                  type="text"
                  id="register-name"
                  className="form-control"
                  placeholder="Enter your full name"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-phone">Phone Number</label>
                <input
                  type="tel"
                  id="register-phone"
                  className="form-control"
                  placeholder="Enter your phone number"
                  value={registerData.phone}
                  onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="form-group account-type">
                <label>Account Type</label>
                <div className="type-options">
                  <div className="type-option">
                    <input
                      type="radio"
                      id="account-student"
                      name="accountType"
                      checked={accountType === 'student'}
                      onChange={() => setAccountType('student')}
                    />
                    <label htmlFor="account-student">Student</label>
                  </div>
                  <div className="type-option">
                    <input
                      type="radio"
                      id="account-teacher"
                      name="accountType"
                      checked={accountType === 'teacher'}
                      onChange={() => setAccountType('teacher')}
                    />
                    <label htmlFor="account-teacher">Teacher</label>
                  </div>
                  <div className="type-option">
                    <input
                      type="radio"
                      id="account-admin"
                      name="accountType"
                      checked={accountType === 'admin'}
                      onChange={() => setAccountType('admin')}
                    />
                    <label htmlFor="account-admin">Admin</label>
                  </div>
                </div>
                {accountType === 'teacher' && (
                  <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#b45309' }}>
                    Teacher accounts require admin approval before you can create courses.
                  </p>
                )}
                {accountType === 'admin' && (
                  <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#64748b' }}>
                    Admin signup is limited to emails configured in VITE_ADMIN_EMAILS.
                  </p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="register-email">Email Address</label>
                <input
                  type="email"
                  id="register-email"
                  className="form-control"
                  placeholder="Enter your email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-password">Password</label>
                <input
                  type="password"
                  id="register-password"
                  className="form-control"
                  placeholder="Create a password (min 6 chars)"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-confirm">Confirm Password</label>
                <input
                  type="password"
                  id="register-confirm"
                  className="form-control"
                  placeholder="Confirm your password"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
              
              <div className="auth-divider">
                <span>or</span>
              </div>
              
              <button type="button" className="google-btn" onClick={handleGoogleAuth}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Landing Page Component
const LandingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    tab: 'login',
    accountType: 'student'
  });

  const rawRedirect = searchParams.get('redirect') || '/dashboard';
  const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
    ? rawRedirect
    : '/dashboard';

  useEffect(() => {
    const authTab = searchParams.get('auth');
    if (authTab === 'login' || authTab === 'register') {
      const role = searchParams.get('role');
      setAuthModal({
        isOpen: true,
        tab: authTab,
        accountType: role === 'teacher' ? 'teacher' : 'student'
      });
    }
  }, [searchParams]);

  const openAuthModal = (tab, accountType = 'student') => {
    setAuthModal({ isOpen: true, tab, accountType });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, tab: 'login', accountType: 'student' });
    const next = new URLSearchParams(searchParams);
    next.delete('auth');
    next.delete('role');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="landing-page">
      <SiteNavbar onAuthClick={openAuthModal} />
      <HeroSection />
      <BlogPreviewSection />
      <StatementsSection />
      <VisionMissionSection />
      <PlatformSection />
      <StatsSection />
      <CategorySections />
      <ContactSection />
      <LandingFooter />
      <ChatbotWidget />
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        initialTab={authModal.tab}
        initialAccountType={authModal.accountType}
        redirectTo={redirectTo}
      />
    </div>
  );
};

export default LandingPage;


import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import './LandingPage.css';

// Hero Section Component
const HeroSection = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    // Set video playback speed to 0.5 (slow motion)
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }
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
              <h1>BePro Academy</h1>
              <div className="hero-title-particles">
                {[...Array(10)].map((_, i) => <span key={i}></span>)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Animated Statements Section
const StatementsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const statements = [
    { text: "Unlock your financial future with", highlight: "BePro-Academy", suffix: "'s expert-led courses." },
    { text: "", highlight: "BePro-Academy", suffix: " empowers you to master real-world market analysis skills." },
    { text: "Achieve your certification in finance and analysis—only at", highlight: "BePro-Academy", suffix: "." },
    { text: "Join", highlight: "BePro-Academy", suffix: "'s vibrant learning community and learn from top industry mentors." },
    { text: "Start your journey at", highlight: "BePro-Academy", suffix: " to become a financial analysis professional." },
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

// Platform Features Section
const PlatformSection = () => {
  const features = [
    {
      icon: '📊',
      title: 'Financial Markets Analysis & Risk Management',
      description: 'Master financial markets with comprehensive courses covering technical analysis, fundamental analysis, risk assessment, and portfolio management strategies.',
      link: '/financial-markets'
    },
    {
      icon: '📈',
      title: 'Data Analysis',
      description: 'Transform raw data into actionable insights. Learn statistical analysis, data visualization, Python/R programming, and business intelligence tools.',
      link: '/data-analysis'
    },
    {
      icon: '🖥️',
      title: 'IT',
      description: 'Build your IT expertise with courses in cloud computing, network administration, cybersecurity, and enterprise system management.',
      link: '/it'
    },
    {
      icon: '💻',
      title: 'Programming',
      description: 'From beginner to advanced, master programming languages, software development, mobile apps, and modern frameworks for full-stack development.',
      link: '/programming'
    },
    {
      icon: '🎨',
      title: 'Graphic Design',
      description: 'Unleash your creativity with courses in UI/UX design, branding, digital illustration, motion graphics, and professional design tools.',
      link: '/graphic-design'
    }
  ];

  return (
    <section className="platform-section">
      <div className="platform-overlay"></div>
      <div className="platform-container">
        <div className="platform-header">
          <h2>Master Financial Markets Analysis</h2>
          <p>BePro-Academy is your gateway to professional financial education. Learn from industry experts, gain practical skills, and transform your career in finance.</p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <Link
              key={index}
              to={feature.link}
              className="feature-card"
              style={{ animationDelay: `${0.1 * (index + 1)}s`, textDecoration: 'none' }}
            >
              <div className="feature-icon">{feature.icon}</div>
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
  const stats = [
    { number: '250+', label: 'Active Students' },
    { number: '95%', label: 'Success Rate' },
    { number: '500+', label: 'Video Lessons' },
    { number: '24/7', label: 'Support Access' }
  ];

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
          <h2>Your Journey to Financial Excellence Starts Here with BePro-Academy</h2>
          
          <div className="education-stats">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card" style={{ 
                animationDelay: `${0.2 * (index + 1)}s`,
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
              }}>
                <span className="stat-number">{stat.number}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
          
          <div className="education-features">
            {features.map((feature, index) => (
              <div key={index} className="education-feature" style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                padding: '0.5rem',
                borderRadius: '6px',
                backdropFilter: 'blur(5px)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <span className="feature-check">✓</span>
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
      id: 'programming',
      title: 'Programming',
      subtitle: 'Master the Art of Code',
      description: 'Dive into software development, web programming, and coding languages. From Python to JavaScript, build the skills that power the digital world.',
      backgroundImage: '/assets/code4.jpg',
      icon: '💻',
      features: ['Web Development', 'Mobile Apps', 'Software Engineering', 'Full-Stack Development'],
      color: '#00D9FF',
      useVideo: false
    },
    {
      id: 'design',
      title: 'Graphic Design',
      subtitle: 'Unleash Your Creativity',
      description: 'Transform ideas into stunning visuals. Master creative design, UI/UX principles, and visual arts to create impactful digital experiences.',
      backgroundImage: '/assets/grapich1.jpg',
      icon: '🎨',
      features: ['UI/UX Design', 'Brand Identity', 'Digital Illustration', 'Motion Graphics'],
      color: '#FF6B6B',
      useVideo: false
    },
    {
      id: 'it',
      title: 'Information Technology',
      subtitle: 'Build the Future Infrastructure',
      description: 'Explore networking, cybersecurity, and cloud technologies. Become the backbone of modern digital enterprises.',
      backgroundImage: '/assets/it2.jpg',
      icon: '🖥️',
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
      icon: '📊',
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
      icon: '📈',
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
            <div className="category-icon">{category.icon}</div>
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
              <span className="contact-method-icon">📧</span>
              <span>info@bepro-academy.com</span>
            </div>
            <div className="contact-method">
              <span className="contact-method-icon">💬</span>
              <span>Live Chat Available</span>
            </div>
          </div>
          
          <div className="social-media-section">
            <h3>Follow us on social media</h3>
            <div className="social-media-links">
              <a href="#" className="social-link" title="Facebook"><span>📘</span></a>
              <a href="#" className="social-link" title="YouTube"><span>📺</span></a>
              <a href="#" className="social-link" title="Instagram"><span>📷</span></a>
              <a href="#" className="social-link" title="Snapchat"><span>👻</span></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Team Icons Component
const TeamIcons = () => {
  const [activePopup, setActivePopup] = useState(null);

  const openWhatsApp = (phoneNumber) => {
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    let message = "Hello, I'm interested in learning more about BePro-Academy.";
    
    if (cleanNumber.includes('201035801035')) {
      message = "Hello Ahmed Saeid, I'm interested in your financial analysis courses at BePro-Academy.";
    } else if (cleanNumber.includes('966538751281')) {
      message = "Hello Abdullah Kofiyh, I'm interested in enrolling at BePro-Academy.";
    } else if (cleanNumber.includes('966558007339')) {
      message = "Hello Abdullah Babrouk, I'm interested in partnership opportunities with BePro-Academy.";
    }
    
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const teamMembers = {
    ahmedsaeid: {
      name: 'Ahmed Saeid',
      title: 'Senior Academic Lecturer & Financial Data Analysis Expert',
      badge: 'Global Expert',
      avatar: '🧔‍♂️',
      about: 'Ahmed Saeid is a world-renowned academic lecturer with exceptional expertise in company, financial, and stock data analysis. With decades of experience in both academic and professional spheres, he has established himself as a leading authority in financial markets analysis and economic data interpretation.',
      expertise: [
        { icon: '📊', text: 'Financial Data Analysis' },
        { icon: '💹', text: 'Stock Market Analytics' },
        { icon: '🏢', text: 'Company Valuation' },
        { icon: '📈', text: 'Economic Data Interpretation' },
        { icon: '🎯', text: 'Risk Assessment' },
        { icon: '🔍', text: 'Market Research' }
      ],
      achievements: [
        'Delivered keynote presentations at over 50 international financial conferences',
        'Guest lecturer at leading universities including Harvard, Oxford, and MIT',
        'Published 30+ peer-reviewed papers on financial markets analysis',
        'Conducted specialized workshops for Fortune 500 companies',
        'Mentored 1000+ professionals in advanced financial data analysis',
        'Recipient of the Global Excellence Award in Financial Education (2023)'
      ],
      phone: '+201035801035'
    },
    abdullahkofiyh: {
      name: 'Abdullah Kofiyh',
      title: 'CEO & Platform Administrator',
      badge: 'Young Leader - 30 years',
      avatar: '/assets/abdullah1.jpg',
      isImage: true,
      isCeo: true,
      about: 'Abdullah Kofiyh is the visionary CEO and Platform Administrator of BePro-Academy. With a passion for democratizing financial education, he has built a world-class platform that connects top educators with ambitious learners globally.',
      vision: 'Under Abdullah Kofiyh\'s leadership, BePro-Academy has become a premier destination for financial education, offering cutting-edge courses, expert mentorship, and industry-recognized certifications. His commitment to excellence ensures every student receives the highest quality educational experience.',
      phone: '+966538751281',
      email: 'info@bepro-academy.com'
    },
    abdullahbabrouk: {
      name: 'Abdullah Babrouk',
      title: 'Chief Marketing & Public Relations Officer (CMO & PRO)',
      badge: 'Young Marketing Leader - 30 years',
      avatar: '/assets/abdullah2.jpg',
      isImage: true,
      hasWhatsapp: true,
      about: 'Abdullah Babrouk is our dynamic Chief Marketing & Public Relations Officer. A young visionary leader in his 30s, he drives BePro-Academy\'s marketing strategies and public relations initiatives with innovative approaches and modern marketing techniques.',
      expertise: [
        { icon: '📱', text: 'Digital Marketing' },
        { icon: '📢', text: 'Public Relations' },
        { icon: '🎯', text: 'Brand Strategy' },
        { icon: '📈', text: 'Growth Marketing' },
        { icon: '🤝', text: 'Partnership Development' },
        { icon: '💬', text: 'Social Media Strategy' }
      ],
      phone: '+966558007339'
    }
  };

  return (
    <>
      <div className="team-icons">
        <div className="team-button mohammed" onClick={() => setActivePopup('ahmedsaeid')}>
          <span>🧔‍♂️</span>
          <span className="team-tooltip">Expert Instructor</span>
        </div>
        <div className="team-button abdullah" onClick={() => setActivePopup('abdullahkofiyh')}>
          <img src="/assets/abdullah1.jpg" alt="Abdullah Kofiyh - CEO" />
          <span className="team-tooltip">CEO - 30 years</span>
        </div>
        <div className="team-button babrouk" onClick={() => setActivePopup('abdullahbabrouk')}>
          <img src="/assets/abdullah2.jpg" alt="Abdullah Babrouk - CMO" />
          <span className="whatsapp-badge">💬</span>
          <span className="team-tooltip">CMO & PRO - 30 years</span>
        </div>
      </div>

      {/* Popup Overlay */}
      <div 
        className={`popup-overlay ${activePopup ? 'active' : ''}`} 
        onClick={() => setActivePopup(null)}
      />

      {/* Team Member Popups */}
      {Object.entries(teamMembers).map(([key, member]) => (
        <div key={key} className={`team-popup ${activePopup === key ? 'active' : ''}`}>
          <div className={`popup-header ${member.isCeo ? 'ceo' : ''}`}>
            <button className="popup-close" onClick={() => setActivePopup(null)}>✕</button>
          </div>
          <div className="popup-content">
            <div className="member-header">
              <div className={`member-avatar ${member.isCeo ? 'ceo' : ''}`}>
                {member.isImage ? (
                  <img src={member.avatar} alt={member.name} />
                ) : (
                  member.avatar
                )}
              </div>
              <div className="member-info">
                <h2>{member.name}</h2>
                <p className="title">{member.title}</p>
                <span className="badge">{member.badge}</span>
              </div>
            </div>
            
            <div className="popup-section">
              <h3>📖 About</h3>
              <p>{member.about}</p>
            </div>
            
            {member.vision && (
              <div className="popup-section">
                <h3>🎯 Leadership Vision</h3>
                <p>{member.vision}</p>
              </div>
            )}
            
            {member.expertise && (
              <div className="popup-section">
                <h3>💡 Areas of Expertise</h3>
                <div className="expertise-grid">
                  {member.expertise.map((item, index) => (
                    <div key={index} className="expertise-card">
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {member.achievements && (
              <div className="popup-section">
                <h3>🏆 Key Achievements</h3>
                <ul className="achievements-list">
                  {member.achievements.map((achievement, index) => (
                    <li key={index}>{achievement}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="popup-section">
              <h3>📞 {member.isCeo ? 'Contact Information' : 'Direct Contact'}</h3>
              <div className="whatsapp-contact-box">
                <p className="whatsapp-title">
                  <span>💬</span> WhatsApp Direct Contact
                </p>
                <p className="whatsapp-number">📱 {member.phone}</p>
                {member.email && <p className="whatsapp-email">📧 Email: {member.email}</p>}
                <button 
                  className="whatsapp-button"
                  onClick={() => openWhatsApp(member.phone)}
                >
                  <span>💬</span> Open WhatsApp Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

// Chatbot Widget Component
const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { type: 'bot', text: "Hi! 👋 Welcome to BePro-Academy!", time: 'Just now' },
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
      return "We offer comprehensive courses in:\n\n📈 Technical Analysis\n💼 Trading Strategies\n🎯 Risk Management\n📊 Financial Modeling\n\nEach course includes video lessons, practical exercises, and expert mentorship!";
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      return "We have flexible pricing options:\n\n• Basic Plan: $99/month\n• Pro Plan: $199/month\n• Lifetime Access: $999\n\nAll plans include certification and lifetime updates!";
    } else if (lowerMessage.includes('certif')) {
      return "Our certifications are industry-recognized and include:\n\n🏆 Certified Market Analyst\n🏆 Professional Trader Certificate\n🏆 Risk Management Specialist\n\nThese credentials will boost your finance career!";
    } else if (lowerMessage.includes('start') || lowerMessage.includes('begin')) {
      return "Getting started is easy!\n\n1. Click 'Sign Up' to create your account\n2. Choose your learning path\n3. Start with our free introduction course\n4. Progress at your own pace\n\nWould you like me to guide you to the registration?";
    } else if (lowerMessage.includes('support') || lowerMessage.includes('help')) {
      return "We provide 24/7 support through:\n\n📧 Email: info@bepro-academy.com\n💬 Live chat (you're using it now!)\n👥 Community forums\n\nHow can I assist you today?";
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
    { text: '📚 Course Info', query: 'Tell me about courses' },
    { text: '🏆 Certifications', query: 'What certifications do you offer?' },
    { text: '💰 Pricing', query: 'Show pricing options' },
    { text: '🚀 Get Started', query: 'How do I get started?' }
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
            🤖
            <div className="online-indicator"></div>
          </div>
          <div className="chat-header-info">
            <h3>BePro Assistant</h3>
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
          {/* About BePro-Academy */}
          <div className="footer-section">
            <h3>About BePro-Academy</h3>
            <p>
              BePro-Academy is the premier destination for financial markets education. We combine cutting-edge technology with expert instruction to deliver transformative learning experiences.
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
              <li><Link to="/courses">📚 Browse Courses</Link></li>
              <li><Link to="/create-course">✏️ Create Course</Link></li>
              <li><a href="#instructors">👨‍🏫 Meet Our Experts</a></li>
              <li><a href="#certification">🏆 Certification Programs</a></li>
              <li><a href="#contact">📧 Contact Support</a></li>
            </ul>
          </div>
          
          {/* Resources */}
          <div className="footer-section">
            <h3>Resources</h3>
            <ul className="footer-links">
              <li><a href="#blog">📝 Market Analysis Blog</a></li>
              <li><a href="#webinars">🎥 Live Webinars</a></li>
              <li><a href="#tools">🛠️ Trading Tools</a></li>
              <li><a href="#community">👥 Student Community</a></li>
            </ul>
          </div>
          
          {/* Platform Features */}
          <div className="footer-section">
            <h3>Platform Features</h3>
            <div className="footer-features">
              <div className="footer-feature"><span>✓</span> HD Video Lessons</div>
              <div className="footer-feature"><span>✓</span> Live Trading Sessions</div>
              <div className="footer-feature"><span>✓</span> Mobile App Access</div>
              <div className="footer-feature"><span>✓</span> Lifetime Updates</div>
            </div>
          </div>
        </div>
        
        {/* Bottom Footer */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <div className="footer-brand">
              <h2>BEPRO-ACADEMY</h2>
              <p>© 2024 BePro-Academy. All rights reserved.</p>
            </div>
            <div className="footer-legal">
              <a href="#terms">Terms of Service</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#refund">Refund Policy</a>
            </div>
          </div>
          
          <div className="footer-credits">
            <p>Powered by Advanced Financial Education Technology</p>
            <p>Platform Administrators: Abdullah Kofiyh & Abdullah Babrouk | Lead Instructor: Ahmed Saeid</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Auth Modal Component
const AuthModal = ({ isOpen, onClose, initialTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [accountType, setAccountType] = useState('student');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, register } = useAuth();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setActiveTab(initialTab);
      setError('');
      setSuccess('');
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialTab]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await login(loginData.email, loginData.password);
      if (result.success) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          onClose();
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
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
        role: accountType === 'academic' ? 'instructor' : 'student'
      });
      
      if (result.success) {
        setSuccess('Account created! Please check your email for verification or login now.');
        setRegisterData({ name: '', email: '', password: '', confirmPassword: '' });
        setTimeout(() => setActiveTab('login'), 2000);
      } else {
        setError(result.error || 'Registration failed. Please try again.');
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
          <h2>{activeTab === 'login' ? 'Welcome Back' : 'Join BePro-Academy'}</h2>
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
              <span>✓</span> {success}
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

// Navigation Bar Component
const LandingNavbar = ({ onAuthClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Financial Markets', href: '/financial-markets' },
    { label: 'Data Analysis', href: '/data-analysis' },
    { label: 'Programming', href: '/programming' },
    { label: 'IT', href: '/it' },
    { label: 'Design', href: '/graphic-design' },
    { label: 'Create Course', href: '/create-course' },
    { label: 'Contact', href: '#contact' }
  ];

  return (
    <nav className={`top-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-logo">
        <h1>BEPRO-ACADEMY</h1>
      </div>
      
      <button className="nav-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        ☰
      </button>
      
      <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {navLinks.map((link, index) => (
          link.href.startsWith('#') ? (
            <a key={index} href={link.href} className="nav-link">{link.label}</a>
          ) : (
            <Link key={index} to={link.href} className="nav-link">{link.label}</Link>
          )
        ))}
      </div>
      
      <div className="nav-auth">
        <button className="nav-login-btn" onClick={() => onAuthClick('login')}>Login</button>
        <button className="nav-register-btn" onClick={() => onAuthClick('register')}>Sign Up</button>
      </div>
    </nav>
  );
};

// Main Landing Page Component
const LandingPage = () => {
  const [authModal, setAuthModal] = useState({ isOpen: false, tab: 'login' });

  const openAuthModal = (tab) => {
    setAuthModal({ isOpen: true, tab });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, tab: 'login' });
  };

  return (
    <div className="landing-page">
      <LandingNavbar onAuthClick={openAuthModal} />
      <HeroSection />
      <StatementsSection />
      <PlatformSection />
      <StatsSection />
      <CategorySections />
      <ContactSection />
      <LandingFooter />
      <TeamIcons />
      <ChatbotWidget />
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        initialTab={authModal.tab}
      />
    </div>
  );
};

export default LandingPage;
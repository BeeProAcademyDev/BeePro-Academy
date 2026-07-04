import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { trackEvent } from "../lib/analytics";
import SiteNavbar from "../components/layout/SiteNavbar";
import AuthTabs from "../components/auth/AuthTabs";
import LandingContactSection from "../components/landing/LandingContactSection";
import LandingFooter from "../components/landing/LandingFooter";
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
  FiVideo,
} from "react-icons/fi";
import "./LandingPage.css";

// Hero Section Component
const HeroSection = () => {
  const { t } = useTranslation();
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
          style={{ pointerEvents: "none" }}
          poster="/assets/hero-background.png"
        >
          <source src="/assets/section1.mp4" type="video/mp4" />
        </video>
        <div className="video-overlay d-flex justify-content-center align-items-center">
          <div className="hero-content text-center">
            <div className="hero-title-wrapper">
              <h1>{t("landing.heroBrand")}</h1>
              <p className="hero-subtitle">{t("landing.heroSubtitle")}</p>
              <div className="hero-actions">
                <Link to="/courses" className="hero-cta primary">
                  {t("landing.heroPrimaryCta")}
                </Link>
                <a href="#vision-mission" className="hero-cta secondary">
                  {t("landing.heroSecondaryCta")}
                </a>
              </div>
              <div className="hero-pill-row" aria-label={t("landing.heroPillsLabel")}>
                {[t("landing.heroPill1"), t("landing.heroPill2"), t("landing.heroPill3")].map((item) => (
                  <span key={item} className="hero-pill">{item}</span>
                ))}
              </div>

              <div className="hero-title-particles">
                {[...Array(10)].map((_, i) => (
                  <span key={i}></span>
                ))}
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
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const statements = t("landing.statements", { returnObjects: true });
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
              animationDuration: `${20 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
      <div className="statement-container">
        {statements.map((statement, index) => (
          <p
            key={index}
            className={`statement ${index === currentIndex ? "active" : ""}`}
          >
            {statement}
          </p>
        ))}
      </div>
      <div className="progress-container">
        {statements.map((_, index) => (
          <div
            key={index}
            className={`progress-dot ${index === currentIndex ? "active" : ""}`}
          />
        ))}
      </div>
    </section>
  );
};

// Vision & Mission Section
const VisionMissionSection = () => {
  const { t } = useTranslation();
  const cards = [
    { key: "vision", icon: FiEye },
    { key: "mission", icon: FiTarget },
  ];

  return (
    <section className="vision-mission-section" id="vision-mission">
      <div className="vision-mission-container">
        <div className="vision-mission-header">
          <span className="vision-mission-badge">{t("landing.heroBrand")}</span>
          <h2>{t("landing.visionMissionTitle")}</h2>
          <p className="vision-mission-subtitle">{t("landing.visionMissionSubtitle")}</p>
        </div>
        <div className="vision-mission-grid">
          {cards.map(({ key, icon: Icon }) => (
            <article key={key} className={`vision-mission-card ${key}-card`}>
              <div className="vm-card-icon" aria-hidden="true">
                <Icon />
              </div>
              <div className="vm-card-labels">
                <h3>{t(`landing.${key}Title`)}</h3>
              </div>
              <div className="vm-card-body">
                <p>{t(`landing.${key}Text`)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

// Teacher Signup CTA
const TeacherSignupSection = ({ onTeachClick }) => {
  const { t } = useTranslation();
  const benefits = t("landing.teacherBenefits", { returnObjects: true });

  return (
    <section className="teacher-signup-section" id="teach">
      <div className="teacher-signup-container">
        <div className="teacher-signup-content">
          <span className="teacher-signup-badge">{t("landing.forEducators")}</span>
          <h2>{t("landing.teacherTitle")}</h2>
          <p>{t("landing.teacherSubtitle")}</p>
          <ul className="teacher-signup-benefits">
            {benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
          </ul>
          <button
            type="button"
            className="teacher-signup-btn"
            onClick={onTeachClick}
          >
            {t("navExtra.registerAsTeacher")}
          </button>
        </div>
      </div>
    </section>
  );
};

// Platform Features Section
const PlatformSection = () => {
  const { t } = useTranslation();
  const features = [
    { icon: FiTrendingUp, key: "financial", link: "/financial-markets" },
    { icon: FiBarChart2, key: "data", link: "/data-analysis" },
    { icon: FiMonitor, key: "it", link: "/it" },
  ];

  return (
    <section className="platform-section">
      <div className="platform-overlay"></div>
      <div className="platform-container">
        <div className="platform-header">
          <h2>{t("landing.platformTitle")}</h2>
          <p>{t("landing.platformSubtitle")}</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <Link
              key={feature.key}
              to={feature.link}
              className="feature-card"
              style={{
                animationDelay: `${0.1 * (index + 1)}s`,
                textDecoration: "none",
              }}
              onClick={() => trackEvent("course_view", { content_category: t(`landing.platformFeatures.${feature.key}.title`) })}
            >
              <div className="feature-icon">
                <feature.icon />
              </div>
              <h3>{t(`landing.platformFeatures.${feature.key}.title`)}</h3>
              <p>{t(`landing.platformFeatures.${feature.key}.description`)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// Stats Section with Video Shadow Effect
const StatsSection = () => {
  const { t } = useTranslation();
  const features = t("landing.journeyFeatures", { returnObjects: true });

  return (
    <section
      className="new-background-section"
      style={{
        position: "relative",
        minHeight: "500px",
        overflow: "hidden",
        padding: "3rem 2rem",
      }}
    >
      <video
        style={{
          position: "absolute",
          bottom: "-50px",
          left: "50%",
          transform: "translateX(-50%) scale(0.8)",
          width: "90%",
          height: "80%",
          objectFit: "cover",
          borderRadius: "20px",
          opacity: "0.4",
          filter: "blur(3px) brightness(0.6)",
          zIndex: 1,
          pointerEvents: "none",
          boxShadow: "0 25px 50px rgba(0,0,0,0.8)",
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

      <div style={{ position: "relative", zIndex: 3 }}>
        <div className="new-section-content">
          <h2>{t("landing.journeyTitle")}</h2>
          <div className="education-features">
            {features.map((feature) => (
              <div key={feature} className="education-feature" style={{ backgroundColor: "rgba(148, 163, 184, 0.28)", padding: "0.5rem", borderRadius: "6px", backdropFilter: "blur(5px)", boxShadow: "0 4px 15px rgba(0,0,0,0.16)" }}>
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
  const { t } = useTranslation();
  const categories = [
    { id: "it", backgroundImage: "/assets/it2.jpg", icon: FiMonitor, color: "#4ECDC4", useVideo: false },
    { id: "data", courseCategory: "data_analysis", backgroundImage: "/assets/data.jpg", icon: FiBarChart2, color: "#45B7D1", useVideo: false },
    { id: "finance", courseCategory: "financial_markets", backgroundVideo: "/assets/eduvideo.mp4", backgroundImage: "/assets/anlysis.jpg", icon: FiTrendingUp, color: "#96CEB4", useVideo: true },
  ];

  return (
    <section className="category-sections">
      {categories.map((category, index) => {
        const features = t(`landing.categories.${category.id}.features`, { returnObjects: true });
        return (
          <div key={category.id} className={`category-section category-section-${index % 2 === 0 ? "left" : "right"}`} id={category.id} style={{ "--category-color": category.color }}>
            {category.useVideo ? (
              <video className="category-video-bg" autoPlay muted loop playsInline disablePictureInPicture controlsList="nodownload nofullscreen noremoteplayback" style={{ pointerEvents: "none" }} poster={category.backgroundImage}>
                <source src={category.backgroundVideo} type="video/mp4" />
              </video>
            ) : (
              <div className="category-background" style={{ backgroundImage: `url(${category.backgroundImage})` }} />
            )}
            <div className="category-overlay" />
            <div className="category-content">
              <div className="category-icon"><category.icon /></div>
              <h2 className="category-title">{t(`landing.categories.${category.id}.title`)}</h2>
              <p className="category-subtitle">{t(`landing.categories.${category.id}.subtitle`)}</p>
              <p className="category-description">{t(`landing.categories.${category.id}.description`)}</p>
              <div className="category-features">
                {features.map((feature) => <span key={feature} className="category-feature-tag">{feature}</span>)}
              </div>
              <div className="category-buttons">
                <Link to={`/courses?category=${category.courseCategory || category.id}`} className="category-btn primary">{t("landing.viewCourses")}</Link>
                <a href={`#${category.id}-details`} className="category-btn secondary">{t("landing.learnMore")}</a>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

// Chatbot Widget Component
const ChatbotWidget = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { type: "bot", text: t("landing.botWelcome1"), time: t("landing.justNow") },
    { type: "bot", text: t("landing.botWelcome2"), time: t("landing.justNow") },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([
      { type: "bot", text: t("landing.botWelcome1"), time: t("landing.justNow") },
      { type: "bot", text: t("landing.botWelcome2"), time: t("landing.justNow") },
    ]);
  }, [i18n.language, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setShowNotification(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateBotResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes("course") || lowerMessage.includes("program") || lowerMessage.includes(t("landing.quickCourseQuery").toLowerCase())) return t("landing.botCourseReply");
    if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes(t("landing.quickPricingQuery").toLowerCase())) return t("landing.botPricingReply");
    if (lowerMessage.includes("certif") || lowerMessage.includes(t("landing.quickCertificationQuery").toLowerCase())) return t("landing.botCertificationReply");
    if (lowerMessage.includes("start") || lowerMessage.includes("begin") || lowerMessage.includes(t("landing.quickStartQuery").toLowerCase())) return t("landing.botStartReply");
    if (lowerMessage.includes("support") || lowerMessage.includes("help")) return t("landing.botSupportReply");
    return t("landing.botDefaultReply");
  };

  const getCurrentTime = () => new Intl.DateTimeFormat(i18n.language === "ar" ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit" }).format(new Date());

  const sendMessage = (text = inputValue) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { type: "user", text: text.trim(), time: getCurrentTime() }]);
    setInputValue("");
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { type: "bot", text: generateBotResponse(text), time: getCurrentTime() }]);
    }, 900);
  };

  const quickReplies = [
    { icon: FiBookOpen, text: t("landing.quickCourseInfo"), query: t("landing.quickCourseQuery") },
    { icon: FiAward, text: t("landing.quickCertifications"), query: t("landing.quickCertificationQuery") },
    { icon: FiTrendingUp, text: t("landing.quickPricing"), query: t("landing.quickPricingQuery") },
    { icon: FiTarget, text: t("landing.quickGetStarted"), query: t("landing.quickStartQuery") },
  ];

  return (
    <div className="chatbot-widget">
      <button type="button" className={`chatbot-button ${isOpen ? "active" : ""}`} onClick={() => { setIsOpen(!isOpen); setShowNotification(false); }} aria-label={t("landing.assistantName")}>
        {showNotification && !isOpen && <div className="chat-notification">1</div>}
        <FiMessageCircle className="chat-icon" />
        <span className="close-icon">x</span>
      </button>

      <div className={`chatbot-window ${isOpen ? "active" : ""}`}>
        <div className="chat-header">
          <div className="bot-avatar"><FiMessageCircle /><div className="online-indicator"></div></div>
          <div className="chat-header-info"><h3>{t("landing.assistantName")}</h3><p>{t("landing.assistantTagline")}</p></div>
        </div>
        <div className="chat-messages">
          {messages.map((msg, index) => <div key={index} className={`message ${msg.type}`}><div style={{ whiteSpace: "pre-line" }}>{msg.text}</div><div className="message-time">{msg.time}</div></div>)}
          {isTyping && <div className="typing-indicator" aria-label={t("common.loading")}><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>}
          <div ref={messagesEndRef} />
        </div>
        <div className="quick-replies">
          {quickReplies.map((reply) => <button type="button" key={reply.text} className="quick-reply" onClick={() => sendMessage(reply.query)}><reply.icon />{reply.text}</button>)}
        </div>
        <div className="chat-input-container">
          <input type="text" className="chat-input" placeholder={t("landing.chatPlaceholder")} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
          <button type="button" className="send-button" onClick={() => sendMessage()} aria-label={t("landing.sendMessage")}><FiMessageCircle className="send-icon" /></button>
        </div>
      </div>
    </div>
  );
};

// Auth Modal Component
const AuthModal = ({
  isOpen,
  onClose,
  initialTab = "login",
  redirectTo = "/dashboard",
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
        <div className="auth-modal-header">
          <button
            type="button"
            className="auth-modal-close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            x
          </button>
          <h2>{t("authUnified.title")}</h2>
          <p>{t("authUnified.subtitle")}</p>
        </div>
        <div className="auth-modal-body">
          <AuthTabs
            compact
            initialTab={initialTab}
            redirectTo={redirectTo}
            onAuthenticated={onClose}
          />
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
    tab: "login",
  });

  const rawRedirect = searchParams.get("redirect") || "/dashboard";
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";

  useEffect(() => {
    const authTab = searchParams.get("auth");
    if (authTab === "login" || authTab === "register") {
      setAuthModal({
        isOpen: true,
        tab: authTab,
      });
    }
  }, [searchParams]);

  const openAuthModal = (tab) => {
    setAuthModal({ isOpen: true, tab });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, tab: "login" });
    const next = new URLSearchParams(searchParams);
    next.delete("auth");
    next.delete("role");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="landing-page">
      <SiteNavbar onAuthClick={openAuthModal} hideTeacherSignup />
      <HeroSection />
      <StatementsSection />
      <VisionMissionSection />
      <PlatformSection />
      <StatsSection />
      <CategorySections />
      <LandingContactSection />
      <LandingFooter />
      <ChatbotWidget />
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        initialTab={authModal.tab}
        redirectTo={redirectTo}
      />
    </div>
  );
};

export default LandingPage;


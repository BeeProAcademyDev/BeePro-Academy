import { Link } from 'react-router-dom'
import {
  FiAward,
  FiBookOpen,
  FiCheckCircle,
  FiEdit3,
  FiMail,
  FiMonitor,
  FiShield,
  FiTool,
  FiUsers,
  FiVideo
} from 'react-icons/fi'
import '../../pages/LandingPage.css'

const LandingFooter = () => (
  <footer className="landing-footer">
    <div className="footer-content">
      <div className="footer-grid">
        <div className="footer-section">
          <div className="landing-footer-logo">
            <img src="/assets/platform-logo.png" alt="BeePro Academy" />
            <span>BeePro Academy</span>
          </div>
          <h3>About BeePro-Academy</h3>
          <p>
            BeePro-Academy is the premier destination for financial markets education. We combine cutting-edge technology with expert instruction to deliver transformative learning experiences.
          </p>
        </div>

        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul className="footer-links">
            <li><Link to="/courses"><FiBookOpen /> Browse Courses</Link></li>
            <li><Link to="/teacher/create-course"><FiEdit3 /> Create Course</Link></li>
            <li><a href="/#instructors"><FiUsers /> Meet Our Experts</a></li>
            <li><a href="/#certification"><FiAward /> Certification Programs</a></li>
            <li><a href="/#contact"><FiMail /> Contact Support</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Resources</h3>
          <ul className="footer-links">
            <li><Link to="/blogs"><FiBookOpen /> Market Analysis Blog</Link></li>
            <li><a href="/#webinars"><FiVideo /> Live Webinars</a></li>
            <li><a href="/#tools"><FiTool /> Trading Tools</a></li>
            <li><a href="/#community"><FiUsers /> Student Community</a></li>
          </ul>
        </div>

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

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <div className="footer-brand">
            <div className="footer-brand-logo">
              <img src="/assets/platform-logo.png" alt="BeePro Academy" />
              <h2>BEEPRO-ACADEMY</h2>
            </div>
            <p>© 2024 BeePro-Academy. All rights reserved.</p>
          </div>
          <div className="footer-legal">
            <a href="/#terms">Terms of Service</a>
            <a href="/#privacy">Privacy Policy</a>
            <a href="/#refund">Refund Policy</a>
          </div>
        </div>

        <div className="footer-credits">
          <p>Powered by Advanced Financial Education Technology</p>
          <p>Platform Administrators: Abdullah Kofiyh & Abdullah Babrouk | Lead Instructor: Ahmed Mohamed</p>
        </div>
      </div>
    </div>
  </footer>
)

export default LandingFooter

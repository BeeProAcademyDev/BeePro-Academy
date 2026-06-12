import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import SiteNavbar from './components/layout/SiteNavbar'
import Footer from './components/layout/Footer'

// Pages
import LandingPage from './pages/LandingPage'
import Home from './pages/Home'
import Courses from './pages/Courses'
import CourseDetailsDB from './pages/CourseDetailsDB'
import Dashboard from './pages/Dashboard'
import PaymentCheckout from './pages/PaymentCheckout'
import About from './pages/About'
import Contact from './pages/Contact'
import CourseLearn from './pages/CourseLearn'
import Register from './pages/auth/Register'
import { getLandingAuthUrl } from './lib/authRoutes'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import CreateCourse from './pages/teacher/CreateCourse'
import EditCourse from './pages/teacher/EditCourse'
import TeacherLiveSession from './pages/teacher/TeacherLiveSession'

// Category Pages
import ProgrammingPage from './pages/categories/ProgrammingPage'
import ITPage from './pages/categories/ITPage'
import DataAnalysisPage from './pages/categories/DataAnalysisPage'
import FinancialMarketsPage from './pages/categories/FinancialMarketsPage'

const LoginRedirect = () => {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  params.set('auth', 'login')
  return <Navigate to={`/?${params.toString()}`} replace />
}

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`
    return <Navigate to={getLandingAuthUrl('login', { redirect })} replace />
  }
  
  return children
}

// Teacher Route (only for teachers/admins)
const TeacherRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const normalizedRole = (user?.role || '').toString().trim().toLowerCase()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`
    return <Navigate to={getLandingAuthUrl('login', { redirect })} replace />
  }
  
  // Pending instructors must wait for admin approval
  if (normalizedRole === 'pending_instructor') {
    return <Navigate to="/dashboard" replace />
  }

  // Check if user is teacher/instructor or admin
  if (normalizedRole !== 'teacher' && normalizedRole !== 'instructor' && normalizedRole !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

// Public Route (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

// Layout Component
const Layout = ({ children, showFooter = true }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNavbar />
      <main className="flex-1 site-main-offset">{children}</main>
      {showFooter && <Footer />}
    </div>
  )
}

function App() {
  return (
    <Routes>
      {/* Landing Page - Has its own navbar and footer */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Public Routes */}
      <Route
        path="/home"
        element={
          <Layout>
            <Home />
          </Layout>
        }
      />
      
      <Route 
        path="/courses" 
        element={
          <Layout>
            <Courses />
          </Layout>
        } 
      />
      
      <Route 
        path="/courses/:id" 
        element={
          <Layout>
            <CourseDetailsDB />
          </Layout>
        } 
      />
      
      <Route
        path="/categories"
        element={
          <Layout>
            <Courses />
          </Layout>
        }
      />
      
      {/* Category Pages */}
      <Route path="/programming" element={<Layout showFooter={false}><ProgrammingPage /></Layout>} />
      <Route path="/it" element={<Layout showFooter={false}><ITPage /></Layout>} />
      <Route path="/data-analysis" element={<Layout showFooter={false}><DataAnalysisPage /></Layout>} />
      <Route path="/financial-markets" element={<Layout showFooter={false}><FinancialMarketsPage /></Layout>} />
      
      <Route
        path="/about"
        element={
          <Layout showFooter={false}>
            <About />
          </Layout>
        }
      />
      
      <Route
        path="/contact"
        element={
          <Layout showFooter={false}>
            <Contact />
          </Layout>
        }
      />

      {/* Auth Routes */}
      <Route path="/login" element={<LoginRedirect />} />
      
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <Layout showFooter={false}>
              <Register />
            </Layout>
          </PublicRoute>
        } 
      />

      <Route
        path="/register/teacher"
        element={<Navigate to="/register?role=teacher" replace />}
      />
      
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <Layout showFooter={false}>
              <ForgotPassword />
            </Layout>
          </PublicRoute>
        }
      />

      <Route
        path="/reset-password"
        element={
          <Layout showFooter={false}>
            <ResetPassword />
          </Layout>
        }
      />

      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />

      <Route
        path="/courses/:id/checkout"
        element={
          <ProtectedRoute>
            <Layout>
              <PaymentCheckout />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/courses/:id/learn" 
        element={
          <ProtectedRoute>
            <Layout showFooter={false}>
              <CourseLearn />
            </Layout>
          </ProtectedRoute>
        } 
      />

      {/* Teacher Routes */}
      <Route
        path="/teacher/create-course"
        element={
          <TeacherRoute>
            <Layout showFooter={false}>
              <CreateCourse />
            </Layout>
          </TeacherRoute>
        }
      />

      <Route
        path="/teacher/live-session"
        element={
          <TeacherRoute>
            <Layout showFooter={false}>
              <TeacherLiveSession />
            </Layout>
          </TeacherRoute>
        }
      />

      <Route
        path="/teacher/edit-course/:id"
        element={
          <TeacherRoute>
            <Layout showFooter={false}>
              <EditCourse />
            </Layout>
          </TeacherRoute>
        }
      />
      
      <Route
        path="/teacher/courses"
        element={
          <TeacherRoute>
            <Layout>
              <div className="min-h-screen pt-6 pb-16">
                <div className="container-custom">
                  <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">كورساتي</h1>
                    <a href="/teacher/create-course" className="btn btn-primary">
                      + إنشاء كورس جديد
                    </a>
                  </div>
                  <div className="card card-body">
                    <p className="text-center text-secondary-500 py-8">
                      لم تقم بإنشاء أي كورسات بعد. ابدأ بإنشاء كورسك الأول!
                    </p>
                  </div>
                </div>
              </div>
            </Layout>
          </TeacherRoute>
        }
      />

      {/* Admin Routes (Placeholder) */}
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute>
            <Layout>
              <div className="min-h-screen pt-6 pb-16">
                <div className="container-custom">
                  <h1 className="text-4xl font-bold mb-8">Admin Panel</h1>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="card card-body text-center">
                      <h3 className="text-3xl font-bold text-primary-500 mb-2">150</h3>
                      <p className="text-secondary-500">Total Users</p>
                    </div>
                    <div className="card card-body text-center">
                      <h3 className="text-3xl font-bold text-primary-500 mb-2">70</h3>
                      <p className="text-secondary-500">Total Courses</p>
                    </div>
                    <div className="card card-body text-center">
                      <h3 className="text-3xl font-bold text-primary-500 mb-2">$12,500</h3>
                      <p className="text-secondary-500">Total Revenue</p>
                    </div>
                  </div>
                  <div className="mt-8 card card-body">
                    <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                    <div className="flex flex-wrap gap-4">
                      <button className="btn btn-primary">Add New Course</button>
                      <button className="btn btn-secondary">Manage Users</button>
                      <button className="btn btn-secondary">View Reports</button>
                    </div>
                  </div>
                </div>
              </div>
            </Layout>
          </ProtectedRoute>
        } 
      />

      {/* 404 Route */}
      <Route 
        path="*" 
        element={
          <Layout>
            <div className="min-h-screen pt-6 pb-16 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-primary-500 mb-4">404</h1>
                <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
                <p className="text-secondary-600 dark:text-secondary-400 mb-8">
                  The page you're looking for doesn't exist.
                </p>
                <a href="/" className="btn btn-primary">
                  Go Home
                </a>
              </div>
            </div>
          </Layout>
        } 
      />
    </Routes>
  )
}

export default App
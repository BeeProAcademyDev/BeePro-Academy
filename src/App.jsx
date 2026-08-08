import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import SiteNavbar from "./components/layout/SiteNavbar";
import Footer from "./components/layout/Footer";
import {
  NotFoundPage,
  TeacherCoursesPlaceholder,
  AdminPlaceholder,
} from "./components/app/AppPlaceholders";
import { canAccessTeacherFeatures, isAdmin } from "./lib/roles";
import UserManagement from "./pages/admin/UserManagement";
import AdminCRM from "./pages/admin/AdminCRM";

// Pages
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import Courses from "./pages/Courses";
import Blogs from "./pages/Blogs";
import CourseDetailsDB from "./pages/CourseDetailsDB";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import MyCourses from "./pages/MyCourses";
import CourseAnalytics from "./pages/CourseAnalytics";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Calendar from "./pages/Calendar";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import PaymentCheckout from "./pages/PaymentCheckout";
import About from "./pages/About";
import Contact from "./pages/Contact";
import CourseLearn from "./pages/CourseLearn";
import LessonDetails from "./components/course/LessonDetails";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import { getLandingAuthUrl } from "./lib/authRoutes";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import CreateCourse from "./pages/teacher/CreateCourse";
import EditCourse from "./pages/teacher/EditCourse";
import TeacherCourseBuilder from "./pages/teacher/TeacherCourseBuilder";
import TeacherLiveSession from "./pages/teacher/TeacherLiveSession";
import BlogAdmin from "./pages/admin/BlogAdmin";
import { requireAdmin, requireInstructor } from "./lib/authGuards";

// Category Pages
import ITPage from "./pages/categories/ITPage";
import DataAnalysisPage from "./pages/categories/DataAnalysisPage";
import FinancialMarketsPage from "./pages/categories/FinancialMarketsPage";

const DISABLE_AUTH = false;

const LoginRedirect = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set("auth", "login");
  return <Navigate to={`/?${params.toString()}`} replace />;
};

const RoleDashboardRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={getLandingAuthUrl("login", { redirect })} replace />;
  }

  if (isAdmin(user.role)) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  if (canAccessTeacherFeatures(user.role)) {
    return <Navigate to="/teacher-dashboard" replace />;
  }

  return <Navigate to="/student-dashboard" replace />;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={getLandingAuthUrl("login", { redirect })} replace />;
  }

  return children;
};

// Teacher Route (only for teachers/admins)
const TeacherRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={getLandingAuthUrl("login", { redirect })} replace />;
  }

  // Pending instructors must wait for admin approval
  if (
    (user?.role || "").toString().trim().toLowerCase() === "pending_instructor"
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!requireInstructor(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Admin Route (only for admins)
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={getLandingAuthUrl("login", { redirect })} replace />;
  }

  if (!requireAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (DISABLE_AUTH) {
    return children;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Layout Component
const Layout = ({ children, showFooter = true }) => {
  return (
    <div
      className={`min-h-screen flex flex-col overflow-x-hidden ${showFooter ? "" : "bg-[#000428]"}`}
    >
      <SiteNavbar />
      <main className="flex-1 site-main-offset flex flex-col min-w-0 w-full">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

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
        path="/blog"
        element={
          <Layout>
            <Blogs />
          </Layout>
        }
      />

      <Route
        path="/blogs"
        element={
          <Layout>
            <Blogs />
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
      <Route path="/programming" element={<Navigate to="/it" replace />} />
      <Route
        path="/it"
        element={
          <Layout showFooter={false}>
            <ITPage />
          </Layout>
        }
      />
      <Route
        path="/data-analysis"
        element={
          <Layout showFooter={false}>
            <DataAnalysisPage />
          </Layout>
        }
      />
      <Route
        path="/financial-markets"
        element={
          <Layout showFooter={false}>
            <FinancialMarketsPage />
          </Layout>
        }
      />

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
              <RoleDashboardRedirect />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student-dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <StudentDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher-dashboard"
        element={
          <TeacherRoute>
            <Layout>
              <TeacherDashboard />
            </Layout>
          </TeacherRoute>
        }
      />

      <Route
        path="/admin-dashboard"
        element={
          <AdminRoute>
            <Layout>
              <AdminDashboard />
            </Layout>
          </AdminRoute>
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
        path="/my-courses"
        element={
          <ProtectedRoute>
            <Layout>
              <MyCourses />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/course-analytics"
        element={
          <ProtectedRoute>
            <Layout>
              <CourseAnalytics />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Layout>
              <Notifications />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Layout>
              <Messages />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Layout>
              <Calendar />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <Layout>
              <Payments />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
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

      <Route
        path="/courses/:courseId/lessons/:lessonId"
        element={
          <ProtectedRoute>
            <Layout>
              <LessonDetails />
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
        path="/teacher/courses/:courseId"
        element={
          <TeacherRoute>
            <Layout showFooter={false}>
              <TeacherCourseBuilder />
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
              <TeacherCoursesPlaceholder />
            </Layout>
          </TeacherRoute>
        }
      />

      <Route
        path="/teacher/blog"
        element={
          <TeacherRoute>
            <Layout showFooter={false}>
              <BlogAdmin scope="teacher" />
            </Layout>
          </TeacherRoute>
        }
      />

      <Route
        path="/admin/blog"
        element={
          <AdminRoute>
            <Layout showFooter={false}>
              <BlogAdmin scope="admin" />
            </Layout>
          </AdminRoute>
        }
      />

      <Route
        path="/admin/blogs"
        element={
          <AdminRoute>
            <Layout showFooter={false}>
              <BlogAdmin scope="admin" />
            </Layout>
          </AdminRoute>
        }
      />

      {/* Admin Routes (Placeholder) */}
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <Layout>
              <AdminPlaceholder />
            </Layout>
          </AdminRoute>
        }
      />

      {/* 404 Route */}
      <Route
        path="*"
        element={
          <Layout>
            <NotFoundPage />
          </Layout>
        }
      />
    </Routes>
  );
}

export default App;

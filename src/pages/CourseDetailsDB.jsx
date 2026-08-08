import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { useAuth } from "../contexts/AuthContext";
import {
  courseService,
  enrollmentService,
  lessonService,
  meetingService,
  sectionService,
} from "../services/api";
import { isCoursePublishedAndApproved } from "../lib/backendFormatters";
import { isPaymentsEnabled } from "../lib/featureFlags";
import { paymentService } from "../services/paymentAPI";
import { getMeetingJoinTarget, pickJoinableMeeting } from "../lib/jitsi";
import { isStudentUser } from "../lib/roles";
import { getLandingAuthUrl } from "../lib/authRoutes";
import { toastSuccess, toastError } from "../lib/toast";
import { notifyError } from "../lib/uiNotify";
import { getFriendlyErrorMessage } from "../lib/friendlyErrors";
import Button from "../components/ui/Button";
import ActionButton from "../components/ui/ActionButton";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LessonForm from "../components/course/LessonForm";
import SEO from "../components/seo/SEO";
import StructuredData from "../components/seo/StructuredData";
import { createCourseSchema, SITE_URL } from "../lib/seo";
import {
  FiPlay,
  FiClock,
  FiUsers,
  FiStar,
  FiBookOpen,
  FiAward,
  FiGlobe,
  FiCheck,
  FiLock,
  FiChevronDown,
  FiChevronUp,
  FiShare2,
  FiHeart,
  FiArrowRight,
  FiArrowLeft,
  FiUser,
  FiVideo,
  FiMessageCircle,
} from "react-icons/fi";

const CourseDetailsDB = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const { formatCoursePrice } = useCurrency();
  const { user, isAuthenticated } = useAuth();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [sections, setSections] = useState([]);
  const courseTitle = course
    ? language === "ar"
      ? course.title || course.title_en
      : course.title_en || course.title
    : "";
  const courseDescription = course
    ? language === "ar"
      ? course.description || course.excerpt || course.content || ""
      : course.description_en ||
        course.excerpt_en ||
        course.excerpt ||
        course.content_en ||
        course.content ||
        ""
    : "";
  const courseImage = course?.cover_image_url || course?.image_url || undefined;
  const [openLessonFormFor, setOpenLessonFormFor] = useState(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    contentType: "video",
    contentUrl: "",
    duration: 0,
    isFree: true,
  });
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [savingLessonFor, setSavingLessonFor] = useState(null);
  const [lessonError, setLessonError] = useState("");
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    title: "",
    description: "",
  });
  const [sectionFormError, setSectionFormError] = useState("");
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [hasApprovedPayment, setHasApprovedPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState(["section-1"]);
  const [liveMeetings, setLiveMeetings] = useState([]);
  const isPaidCourse = Number(course?.price || 0) > 0;
  const coursePriceDisplay = course ? formatCoursePrice(course.price).full : "";
  const isStudent = isStudentUser(user);
  const paymentsEnabled = isPaymentsEnabled();

  const hasCourseAccess =
    isEnrolled ||
    hasApprovedPayment ||
    (!paymentsEnabled && isPaidCourse && isStudent);

  const joinableMeeting = useMemo(
    () => pickJoinableMeeting(liveMeetings),
    [liveMeetings],
  );

  const supportedLevels = ["beginner", "intermediate", "advanced"];
  const rawCourseLevel = course?.level?.trim() || "beginner";
  const courseLevel = supportedLevels.includes(rawCourseLevel)
    ? rawCourseLevel
    : "beginner";
  const isCourseOwner = user?.id && course?.instructor_id === user.id;
  const totalLessons = useMemo(() => {
    if (sections.length > 0) {
      return sections.reduce(
        (sum, section) => sum + ((section.lessons || []).length || 0),
        0,
      );
    }
    return lessons.length;
  }, [sections, lessons]);

  const hasCourseSections = sections.length > 0;
  const sectionsToRender = hasCourseSections
    ? sections
    : [
        {
          id: "default",
          title: t("courseDetailsDB.section"),
          lessons,
        },
      ];

  const ArrowIcon = isRTL ? FiArrowLeft : FiArrowRight;

  const renderJoinSessionLink = (
    className = "btn btn-primary w-full inline-flex items-center justify-center gap-2",
  ) => {
    const joinTarget = joinableMeeting
      ? getMeetingJoinTarget(joinableMeeting)
      : null;

    if (joinTarget?.type === "external") {
      return (
        <a
          href={joinTarget.url}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          <FiVideo className="w-5 h-5" />
          {t("courseDetailsDB.joinLiveSession_22")}
        </a>
      );
    }

    if (joinTarget?.type === "jitsi") {
      return (
        <Link
          to={`/courses/${course.id}/learn?session=${joinableMeeting.id}`}
          className={className}
        >
          <FiVideo className="w-5 h-5" />
          {t("courseDetailsDB.joinLiveSession_21")}
        </Link>
      );
    }

    return (
      <Link
        to={`/courses/${course.id}/learn?session=live`}
        className={className}
      >
        <FiVideo className="w-5 h-5" />
        {t("courseDetailsDB.joinLiveSession_20")}
      </Link>
    );
  };

  // Fetch course details
  useEffect(() => {
    fetchCourseData();
  }, [id]);

  // Check enrollment status
  useEffect(() => {
    if (isAuthenticated && user && course) {
      checkEnrollmentStatus();
    }
  }, [isAuthenticated, user, course]);

  useEffect(() => {
    const loadLiveMeetings = async () => {
      if (!course?.id || !hasCourseAccess) {
        setLiveMeetings([]);
        return;
      }

      try {
        const meetings = await meetingService.getMeetingsByCourse(course.id);
        setLiveMeetings(meetings || []);
      } catch (err) {
        if (import.meta.env.DEV)
          if (import.meta.env.DEV)
            console.error("Live meetings fetch error:", err);
        setLiveMeetings([]);
      }
    };

    loadLiveMeetings();
  }, [course?.id, hasCourseAccess]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      setError(null);

      const courseData = await courseService.getPublishedCourseDetails(id);

      if (!courseData || !isCoursePublishedAndApproved(courseData)) {
        setError("Course not found");
        return;
      }

      setCourse(courseData);

      const sectionsData = await sectionService.getSectionsByCourse(id);
      const sectionsWithLessons = await Promise.all(
        (sectionsData || []).map(async (section) => ({
          ...section,
          lessons: await lessonService.getLessonsBySection(
            section.id,
            courseData.id,
          ),
        })),
      );
      setSections(sectionsWithLessons);

      const lessonsData = await lessonService.getPublishedLessonsByCourse(id);
      setLessons(lessonsData || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Fetch error:", err);
      const friendly = getFriendlyErrorMessage(err, "Failed to load course");
      setError(friendly);
      notifyError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const refreshSectionLessons = async (sectionId) => {
    try {
      const sectionLessons = await lessonService.getLessonsBySection(
        sectionId,
        course?.id,
      );
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId
            ? { ...section, lessons: sectionLessons || [] }
            : section,
        ),
      );
    } catch (err) {
      if (import.meta.env.DEV)
        if (import.meta.env.DEV)
          console.error("Failed to refresh section lessons:", err);
    }
  };

  const loadCourseSections = async (courseId) => {
    if (!courseId) return [];
    try {
      const sectionsData = await sectionService.getSectionsByCourse(courseId);
      const sectionsWithLessons = await Promise.all(
        (sectionsData || []).map(async (section) => ({
          ...section,
          lessons: await lessonService.getLessonsBySection(
            section.id,
            courseId,
          ),
        })),
      );
      setSections(sectionsWithLessons);
      return sectionsWithLessons;
    } catch (err) {
      if (import.meta.env.DEV)
        if (import.meta.env.DEV)
          console.error("Failed to load course sections:", err);
      return [];
    }
  };

  const checkEnrollmentStatus = async () => {
    if (!user || !course) return;

    try {
      const enrolled = await enrollmentService.isEnrolled(course.id);
      setIsEnrolled(enrolled);

      const paidCourse = Number(course.price || 0) > 0;
      if (!enrolled && paidCourse) {
        if (!paymentsEnabled && isStudent) {
          setHasApprovedPayment(true);
        } else {
          const approved = await paymentService.hasApprovedPaymentForCourse(
            user.id,
            course.id,
          );
          setHasApprovedPayment(approved);
        }
      } else {
        setHasApprovedPayment(false);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Enrollment check error:", err);
      setIsEnrolled(false);
      setHasApprovedPayment(false);
    }
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      const redirectPath =
        isPaidCourse && paymentsEnabled
          ? `/courses/${course?.id}/checkout`
          : `/courses/${course?.id}`;
      navigate(getLandingAuthUrl("login", { redirect: redirectPath }));
      return;
    }

    if (!user || !course) return;

    if (!isStudent && isPaidCourse) {
      const message = t("courseDetailsDB.paymentIsAllowedForStudentsOnl");
      setError(message);
      toastError(message);
      return;
    }

    if (!isPaidCourse || !paymentsEnabled) {
      setEnrolling(true);
      setError(null);
      try {
        await enrollmentService.enrollInCourse(course.id);
        setIsEnrolled(true);
        navigate(`/courses/${course.id}/learn`);
      } catch (err) {
        const message =
          err.message || t("courseDetailsDB.failedToEnrollInCourse");
        setError(message);
        toastError(message);
      } finally {
        setEnrolling(false);
      }
      return;
    }

    navigate(`/courses/${course.id}/checkout`);
  };

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId],
    );
  };

  const openAddSectionModal = () => {
    setSectionForm({ title: "", description: "" });
    setSectionFormError("");
    setIsSectionModalOpen(true);
  };

  const closeAddSectionModal = () => {
    if (isSavingSection) return;
    setIsSectionModalOpen(false);
    setSectionFormError("");
  };

  const handleAddSection = async (event) => {
    event?.preventDefault?.();
    const title = sectionForm.title.trim();
    const description = sectionForm.description.trim();

    if (!title) {
      setSectionFormError(t("courseDetailsDB.sectionTitleRequired"));
      return;
    }

    try {
      setIsSavingSection(true);
      setSectionFormError("");
      await sectionService.createSection(course.id, { title, description });
      await loadCourseSections(course.id);
      setIsSectionModalOpen(false);
      toastSuccess(t("courseDetailsDB.sectionAddedSuccessfully"));
    } catch (err) {
      const message = err.message || t("courseDetailsDB.failedToCreateSection");
      setSectionFormError(message);
      toastError(message);
    } finally {
      setIsSavingSection(false);
    }
  };

  const openLessonForm = (sectionId) => {
    setOpenLessonFormFor(sectionId);
    setEditingLessonId(null);
    setLessonError("");
    setLessonForm({
      title: "",
      description: "",
      contentType: "video",
      contentUrl: "",
      duration: 0,
      isFree: true,
    });
  };

  const handleLessonFormChange = (field, value) => {
    setLessonForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveLesson = async (sectionId) => {
    if (!lessonForm.title.trim()) {
      setLessonError(t("courseDetailsDB.lessonTitleRequired"));
      return;
    }

    setSavingLessonFor(sectionId);
    setLessonError("");

    try {
      const payload = {
        title: lessonForm.title.trim(),
        description: lessonForm.description?.trim() || "",
        contentType: lessonForm.contentType || "video",
        contentUrl: lessonForm.contentUrl?.trim() || "",
        duration: Number(lessonForm.duration) || 0,
        isFree: Boolean(lessonForm.isFree),
      };

      if (editingLessonId) {
        await lessonService.updateLesson(editingLessonId, {
          ...payload,
          sectionId,
        });
        toastSuccess(t("courseDetailsDB.lessonUpdatedSuccessfully"));
      } else {
        await lessonService.createLessonInSection(sectionId, payload);
        toastSuccess(t("courseDetailsDB.lessonAddedSuccessfully"));
      }

      setOpenLessonFormFor(null);
      setEditingLessonId(null);
      await refreshSectionLessons(sectionId);
    } catch (err) {
      const message = err.message || t("courseDetailsDB.failedToSaveLesson");
      setLessonError(message);
      toastError(message);
    } finally {
      setSavingLessonFor(null);
    }
  };

  const handleEditLesson = (lesson, sectionId) => {
    setEditingLessonId(lesson.id);
    setOpenLessonFormFor(sectionId);
    setLessonForm({
      title: lesson.title || "",
      description: lesson.description || "",
      contentType: lesson.contentType || lesson.content_type || "video",
      contentUrl:
        lesson.contentUrl || lesson.content_url || lesson.video_url || "",
      duration: lesson.duration || 0,
      isFree: Boolean(lesson.isFree ?? lesson.is_free),
    });
    setLessonError("");
  };

  const handleDeleteLesson = async (lesson, sectionId) => {
    const lessonTitle =
      lesson.title?.trim() || t("courseDetailsDB.untitledLesson");

    setConfirmDialog({
      title: t("courseDetailsDB.deleteLesson"),
      message: t("courseDetailsDB.confirmDeleteLesson", {
        title: lessonTitle,
      }),
      confirmLabel: t("common.delete"),
      onConfirm: async () => {
        try {
          await lessonService.deleteLesson(lesson.id, sectionId);
          await refreshSectionLessons(sectionId);
          toastSuccess(t("courseDetailsDB.lessonDeletedSuccessfully"));
        } catch (err) {
          const message =
            err.message || t("courseDetailsDB.failedToDeleteLesson");
          toastError(message);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            {t("courseDetailsDB.courseNotFound")}
          </h2>
          <Button to="/courses" variant="primary">
            {t("dashboardExtra.browseCourses")}
          </Button>
        </div>
      </div>
    );
  }

  const instructor = course.instructor || course.users || {};
  const displayCourseTitle =
    courseTitle?.trim() || t("courseDetailsDB.untitledCourse");
  const displayCourseDescription =
    courseDescription?.trim() || t("courseDetailsDB.noCourseDescription");
  const displayCourseCategory =
    course.category?.trim() || t("courseDetailsDB.uncategorized");
  const courseFeatures = [
    { icon: FiClock, label: t("courseDetailsDB.comprehensiveContent") },
    {
      icon: FiBookOpen,
      label: t("courseDetailsDB.lessonsCount", { count: totalLessons }),
    },
    { icon: FiGlobe, label: t("courseDetailsDB.lifetimeAccess") },
    { icon: FiAward, label: t("courseDetailsDB.certificateOfCompletion") },
  ];

  const tabs = [
    { id: "overview", label: t("courseDetailsDB.overview") },
    { id: "curriculum", label: t("course.curriculum") },
    { id: "instructor", label: t("course.instructor") },
  ];

  return (
    <>
      <SEO
        title={displayCourseTitle || "BeePro Academy | Course details"}
        description={
          displayCourseDescription ||
          (language === "ar"
            ? "اطّلع على تفاصيل هذا الكورس، المحتوى، المدة، والمدرب في BeePro Academy."
            : "Explore course details, curriculum, duration, and instructor information at BeePro Academy.")
        }
        pathname={location.pathname}
        lang={language}
        article
      />
      <StructuredData
        jsonLd={
          course
            ? [
                createCourseSchema({
                  name: displayCourseTitle,
                  description: displayCourseDescription,
                  url: `${SITE_URL}${location.pathname}`,
                  image: courseImage,
                  author: {
                    "@type": "Organization",
                    name: "BeePro Academy",
                  },
                }),
              ]
            : []
        }
      />
      <div className="min-h-screen pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-secondary-900 to-secondary-800 text-white py-12 md:py-16">
          <div className="container-custom">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Course Info */}
              <div className="lg:col-span-2">
                {/* Breadcrumb */}
                <div className="flex flex-wrap items-center gap-2 text-sm text-secondary-400 mb-4">
                  <Link to="/" className="hover:text-white shrink-0">
                    {t("nav.home")}
                  </Link>
                  <span className="shrink-0">/</span>
                  <Link to="/courses" className="hover:text-white shrink-0">
                    {t("nav.courses")}
                  </Link>
                  <span className="shrink-0">/</span>
                  <span className="text-white break-words min-w-0">
                    {displayCourseTitle}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span
                    className={`badge ${
                      courseLevel === "beginner"
                        ? "bg-green-500"
                        : courseLevel === "intermediate"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    } text-white px-3 py-1`}
                  >
                    {t(`course.level.${courseLevel}`)}
                  </span>
                  <span className="badge bg-primary-500 text-white px-3 py-1">
                    {displayCourseCategory}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 break-words">
                  {displayCourseTitle}
                </h1>
                <p className="text-base sm:text-lg text-secondary-300 mb-6 break-words">
                  {displayCourseDescription}
                </p>

                {isCourseOwner && (
                  <div className="mb-6 rounded-2xl border border-secondary-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {t("courseDetailsDB.courseManagement")}
                        </h2>
                        <p className="text-sm text-secondary-500">
                          {t("courseDetailsDB.manageSectionsLessons")}
                        </p>
                      </div>
                      <ActionButton
                        onClick={openAddSectionModal}
                        variant="primary"
                      >
                        {t("courseDetailsDB.addSection")}
                      </ActionButton>
                    </div>
                  </div>
                )}

                {/* Instructor */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center overflow-hidden">
                    {instructor.avatar_url ? (
                      <img
                        src={instructor.avatar_url}
                        alt={instructor.full_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <FiUser className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-secondary-400">
                      {t("course.instructor")}
                    </p>
                    <p className="font-medium">
                      {instructor.full_name ||
                        instructor.name ||
                        t("course.instructor")}
                    </p>
                    <p className="text-sm text-secondary-500">
                      {t("courseDetailsDB.instructorRole")}
                    </p>
                    {instructor.bio && (
                      <p className="text-sm text-secondary-300 mt-1 line-clamp-2">
                        {instructor.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Course Card (Desktop) */}
              <div className="hidden lg:block">
                <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl overflow-hidden sticky top-24 lg:top-28">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gradient-to-br from-primary-500 to-secondary-500">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={displayCourseTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiBookOpen className="w-16 h-16 text-white opacity-50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
                      {hasCourseAccess ? (
                        (() => {
                          const joinTarget = joinableMeeting
                            ? getMeetingJoinTarget(joinableMeeting)
                            : null;
                          if (joinTarget?.type === "external") {
                            return (
                              <a
                                href={joinTarget.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex flex-col items-center gap-2"
                                title={t("courseDetailsDB.joinLiveSession_19")}
                              >
                                <span className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                  <FiVideo className="w-7 h-7" />
                                </span>
                                <span className="text-sm font-semibold text-white drop-shadow">
                                  {t("courseDetailsDB.joinSession_18")}
                                </span>
                              </a>
                            );
                          }

                          return (
                            <Link
                              to={
                                joinableMeeting
                                  ? `/courses/${course.id}/learn?session=${joinableMeeting.id}`
                                  : `/courses/${course.id}/learn?session=live`
                              }
                              className="group flex flex-col items-center gap-2"
                              title={t("courseDetailsDB.joinLiveSession")}
                            >
                              <span className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <FiVideo className="w-7 h-7" />
                              </span>
                              <span className="text-sm font-semibold text-white drop-shadow">
                                {t("courseDetailsDB.joinSession")}
                              </span>
                            </Link>
                          );
                        })()
                      ) : (
                        <span className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                          <FiPlay className="w-6 h-6 text-primary-500 ms-1" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="p-6 text-secondary-900 dark:text-white">
                    <div className="text-3xl font-bold text-green-500 mb-4">
                      {isPaidCourse
                        ? coursePriceDisplay
                        : t("courseDetailsDB.free_17")}
                    </div>

                    {hasCourseAccess ? (
                      <div className="space-y-3">
                        {renderJoinSessionLink()}
                        <Button
                          to={`/courses/${course.id}/learn`}
                          fullWidth
                          icon={ArrowIcon}
                          iconPosition="end"
                          variant="outline"
                        >
                          {t("courseDetailsDB.continueLearning")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleEnroll}
                        fullWidth
                        size="lg"
                        disabled={enrolling || (isPaidCourse && !isStudent)}
                      >
                        {enrolling
                          ? t("courseDetailsDB.enrolling_16")
                          : isPaidCourse && !isStudent
                            ? t("courseDetailsDB.studentsOnly_15")
                            : isPaidCourse
                              ? paymentsEnabled
                                ? t("courseDetailsDB.payToGetCourse")
                                : t("courseDetailsDB.enrollForFree")
                              : t("courseDetailsDB.enrollForFree")}
                      </Button>
                    )}

                    {isAuthenticated && isStudent && (
                      <Link
                        to={`/courses/${course.id}/learn?tab=chat`}
                        className="btn btn-secondary w-full mt-3 inline-flex items-center justify-center gap-2"
                      >
                        <FiMessageCircle className="w-4 h-4" />
                        {t("dashboardExtra.chatWithInstructor")}
                      </Link>
                    )}

                    {/* Features */}
                    <div className="mt-6 pt-6 border-t border-secondary-200 dark:border-dark-border space-y-3">
                      {courseFeatures.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <feature.icon className="w-5 h-5 text-primary-500" />
                          <span className="text-sm">{feature.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Course Card */}
        <div className="lg:hidden sticky top-16 z-40 bg-white dark:bg-dark-card shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-green-500">
                {isPaidCourse
                  ? coursePriceDisplay
                  : t("courseDetailsDB.free_14")}
              </span>
            </div>
            {hasCourseAccess ? (
              <div className="flex items-center gap-2">
                {renderJoinSessionLink(
                  "btn btn-primary btn-sm inline-flex items-center gap-2",
                )}
                <Button
                  to={`/courses/${course.id}/learn`}
                  icon={ArrowIcon}
                  iconPosition="end"
                  variant="outline"
                  size="sm"
                >
                  {t("courseDetailsDB.continue")}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleEnroll}
                disabled={enrolling || (isPaidCourse && !isStudent)}
              >
                {enrolling
                  ? t("courseDetailsDB.enrolling")
                  : isPaidCourse && !isStudent
                    ? t("courseDetailsDB.studentsOnly")
                    : isPaidCourse
                      ? paymentsEnabled
                        ? t("courseDetailsDB.pay")
                        : t("courseDetailsDB.enrollForFree")
                      : t("courseDetailsDB.free")}
              </Button>
            )}
          </div>
        </div>

        {/* Content Section */}
        <section className="py-8">
          <div className="container-custom">
            <div className="lg:w-2/3">
              {/* Tabs */}
              <div className="flex overflow-x-auto gap-2 mb-8 border-b border-secondary-200 dark:border-dark-border">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? "border-primary-500 text-primary-500"
                        : "border-transparent text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-4">
                      {t("courseDetailsDB.courseDescription")}
                    </h2>
                    <p className="text-secondary-600 dark:text-secondary-400 leading-relaxed">
                      {displayCourseDescription}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "curriculum" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {t("course.curriculum")}
                      </h2>
                      <p className="text-sm text-secondary-500">
                        {totalLessons} {t("courseDetailsDB.lessons_13")}
                      </p>
                    </div>
                    {isCourseOwner && (
                      <ActionButton
                        onClick={openAddSectionModal}
                        variant="primary"
                      >
                        {t("courseDetailsDB.addSection")}
                      </ActionButton>
                    )}
                  </div>

                  {/* Curriculum Sections */}
                  <div className="space-y-4">
                    {sectionsToRender.map((section) => (
                      <div
                        key={section.id}
                        className="border border-secondary-200 dark:border-dark-border rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full flex items-center justify-between p-4 bg-secondary-50 dark:bg-dark-border hover:bg-secondary-100 dark:hover:bg-dark-card transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {expandedSections.includes(section.id) ? (
                              <FiChevronUp className="w-5 h-5" />
                            ) : (
                              <FiChevronDown className="w-5 h-5" />
                            )}
                            <span className="font-medium">
                              {section.title?.trim() ||
                                t("courseDetailsDB.section")}
                            </span>
                          </div>
                          <span className="text-sm text-secondary-500">
                            {(section.lessons || []).length}{" "}
                            {t("courseDetailsDB.lessons")}
                          </span>
                        </button>

                        {expandedSections.includes(section.id) && (
                          <div className="divide-y divide-secondary-100 dark:divide-dark-border">
                            {(section.lessons || []).map((lesson) => {
                              const canOpenLesson =
                                isEnrolled || hasCourseAccess;
                              const lessonTitle =
                                lesson.title?.trim() ||
                                t("courseDetailsDB.untitledLesson");
                              return (
                                <div
                                  key={lesson.id}
                                  className="flex flex-col gap-3 p-4 hover:bg-secondary-50 dark:hover:bg-dark-border/50 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      {canOpenLesson ? (
                                        <FiPlay className="w-5 h-5 text-primary-500" />
                                      ) : (
                                        <FiLock className="w-5 h-5 text-secondary-400" />
                                      )}
                                      {canOpenLesson ? (
                                        <Link
                                          to={`/courses/${course.id}/lessons/${lesson.id}`}
                                          className="font-medium"
                                        >
                                          {lessonTitle}
                                        </Link>
                                      ) : (
                                        <span className="font-medium text-secondary-400">
                                          {lessonTitle}
                                        </span>
                                      )}
                                    </div>
                                    {isCourseOwner &&
                                      section.id !== "default" && (
                                        <div className="flex items-center gap-3">
                                          <ActionButton
                                            variant="edit"
                                            size="sm"
                                            onClick={() =>
                                              handleEditLesson(
                                                lesson,
                                                section.id,
                                              )
                                            }
                                          >
                                            {t("common.edit")}
                                          </ActionButton>
                                          <ActionButton
                                            variant="delete"
                                            size="sm"
                                            onClick={() =>
                                              handleDeleteLesson(
                                                lesson,
                                                section.id,
                                              )
                                            }
                                          >
                                            {t("common.delete")}
                                          </ActionButton>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              );
                            })}

                            {section.lessons?.length === 0 && (
                              <div className="p-4 text-center text-secondary-500">
                                {t("courseDetailsDB.noLessonsYet")}
                              </div>
                            )}

                            {isCourseOwner && section.id !== "default" && (
                              <div className="p-4">
                                <ActionButton
                                  variant="secondary"
                                  onClick={() => openLessonForm(section.id)}
                                >
                                  {t("courseDetailsDB.addLesson")}
                                </ActionButton>
                                {openLessonFormFor === section.id && (
                                  <LessonForm
                                    form={lessonForm}
                                    onChange={handleLessonFormChange}
                                    onSubmit={() =>
                                      handleSaveLesson(section.id)
                                    }
                                    loading={savingLessonFor === section.id}
                                    onCancel={() => setOpenLessonFormFor(null)}
                                    mode={editingLessonId ? "edit" : "create"}
                                  />
                                )}
                                {lessonError && (
                                  <p className="text-sm text-red-500 mt-3">
                                    {lessonError}
                                  </p>
                                )}
                              </div>
                            )}
                            {isCourseOwner && section.id === "default" && (
                              <div className="p-4 text-sm text-secondary-500">
                                {t("courseDetailsDB.addSectionToBegin")}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "instructor" && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">
                    {t("course.instructor")}
                  </h2>
                  <div className="flex items-start gap-6">
                    <div className="w-24 h-24 rounded-full bg-primary-500 flex items-center justify-center">
                      {instructor.avatar_url ? (
                        <img
                          src={instructor.avatar_url}
                          alt={instructor.full_name}
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <FiUser className="w-12 h-12 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">
                        {instructor.full_name || "Instructor"}
                      </h3>
                      <p className="text-secondary-500 mb-4">
                        {instructor.email}
                      </p>
                      {instructor.bio && (
                        <p className="text-secondary-600 dark:text-secondary-400 leading-relaxed">
                          {instructor.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {isSectionModalOpen && (
        <div
          className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAddSectionModal();
            }
          }}
        >
          <form
            onSubmit={handleAddSection}
            className="w-full max-w-lg rounded-lg border border-secondary-200 bg-white p-6 shadow-2xl dark:border-dark-border dark:bg-dark-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="section-modal-title"
          >
            <div className="mb-5">
              <h2
                id="section-modal-title"
                className="text-xl font-bold text-secondary-900 dark:text-white"
              >
                {t("courseDetailsDB.createSection")}
              </h2>
              <p className="mt-1 text-sm text-secondary-500">
                {t("courseDetailsDB.createSectionHelp")}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="section-title">
                  {t("courseDetailsDB.sectionTitle")}
                </label>
                <input
                  id="section-title"
                  type="text"
                  className="input w-full"
                  value={sectionForm.title}
                  onChange={(event) =>
                    setSectionForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder={t("courseDetailsDB.sectionTitlePlaceholder")}
                  autoFocus
                  disabled={isSavingSection}
                />
              </div>

              <div>
                <label className="label" htmlFor="section-description">
                  {t("courseDetailsDB.sectionDescription")}
                </label>
                <textarea
                  id="section-description"
                  className="input min-h-[110px] w-full resize-y"
                  value={sectionForm.description}
                  onChange={(event) =>
                    setSectionForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder={t(
                    "courseDetailsDB.sectionDescriptionPlaceholder",
                  )}
                  disabled={isSavingSection}
                />
              </div>

              {sectionFormError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {sectionFormError}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={closeAddSectionModal}
                disabled={isSavingSection}
                className="w-full sm:w-auto"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                loading={isSavingSection}
                className="w-full sm:w-auto"
              >
                {t("courseDetailsDB.create")}
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={t("common.cancel")}
        tone="danger"
        onConfirm={confirmDialog?.onConfirm}
        onClose={() => setConfirmDialog(null)}
      />
    </>
  );
};

export default CourseDetailsDB;

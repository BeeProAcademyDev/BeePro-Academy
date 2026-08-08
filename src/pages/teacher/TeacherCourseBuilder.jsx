import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  assessmentService,
  courseService,
  enrollmentService,
  sectionService,
  lessonService,
  reviewService,
  uploadService,
} from "../../services/api";
import { isApprovedInstructor, isAdmin } from "../../lib/roles";
import ActionButton from "../../components/ui/ActionButton";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import LessonCard from "../../components/course/LessonCard";
import LessonForm from "../../components/course/LessonForm";
import ProgressCard from "../../components/course/ProgressCard";
import ReviewList from "../../components/course/ReviewList";
import AssessmentList from "../../components/course/AssessmentList";
import AssessmentForm from "../../components/course/AssessmentForm";
import { toastError, toastSuccess } from "../../lib/toast";
import { notifyError } from "../../lib/uiNotify";
import { getFriendlyErrorMessage } from "../../lib/friendlyErrors";
import { FiPlus, FiEdit3, FiTrash2 } from "react-icons/fi";
import { Save } from "lucide-react";

const TeacherCourseBuilder = () => {
  const { id: courseId } = useParams();
  const { user } = useAuth();
  const isInstructor = isApprovedInstructor(user?.role) && !isAdmin(user?.role);
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSection, setIsSavingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [sectionError, setSectionError] = useState("");
  const [sectionSuccess, setSectionSuccess] = useState("");
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [openLessonFormFor, setOpenLessonFormFor] = useState(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    contentType: "video",
    contentUrl: "",
    duration: 0,
    isFree: true,
  });
  const [lessonError, setLessonError] = useState("");
  const [lessonSuccess, setLessonSuccess] = useState("");
  const [savingLessonFor, setSavingLessonFor] = useState(null);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [assessmentForm, setAssessmentForm] = useState({
    title: "",
    durationMinutes: 30,
    passingGrade: 70,
    status: "draft",
    questionsText: "",
  });
  const [assessmentError, setAssessmentError] = useState("");
  const [assessmentSuccess, setAssessmentSuccess] = useState("");
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [editingAssessmentId, setEditingAssessmentId] = useState(null);
  const [uploadingLessonFile, setUploadingLessonFile] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadCourseAndSections = async () => {
    setIsLoading(true);
    setSectionError("");
    try {
      const [
        courseData,
        courseSections,
        progressData,
        reviewData,
        assessmentData,
      ] = await Promise.all([
        courseService.getCourseById(courseId),
        sectionService.getSectionsByCourse(courseId),
        courseId
          ? enrollmentService.getCourseProgress(courseId)
          : Promise.resolve(null),
        courseId
          ? reviewService.getReviewsByCourse(courseId)
          : Promise.resolve([]),
        courseId
          ? assessmentService.getCourseAssessments(courseId)
          : Promise.resolve([]),
      ]);
      setCourse(courseData || null);
      setReviews(Array.isArray(reviewData) ? reviewData : []);
      setAssessments(Array.isArray(assessmentData) ? assessmentData : []);
      setProgress(
        progressData &&
          typeof progressData === "object" &&
          !Array.isArray(progressData)
          ? progressData
          : null,
      );
      const sectionsWithLessons = await Promise.all(
        (courseSections || []).map(async (section) => {
          const lessons = await lessonService.getLessonsBySection(section.id);
          return { ...section, lessons };
        }),
      );
      setSections(sectionsWithLessons);
    } catch (err) {
      if (import.meta.env.DEV)
        if (import.meta.env.DEV) console.error("Failed to load course builder data:", err);
      const friendly = getFriendlyErrorMessage(
        err,
        "Failed to load course sections. Please refresh.",
      );
      setSectionError(friendly);
      notifyError(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourseAndSections();
  }, [courseId]);

  const refreshSectionLessons = async (sectionId) => {
    try {
      const lessons = await lessonService.getLessonsBySection(sectionId);
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId ? { ...section, lessons } : section,
        ),
      );
    } catch (err) {
      if (import.meta.env.DEV)
        if (import.meta.env.DEV) console.error("Failed to refresh section lessons:", err);
      const friendly = getFriendlyErrorMessage(
        err,
        "Could not refresh lessons. Please try again.",
      );
      setLessonError(friendly);
      notifyError(friendly);
    }
  };

  const handleCreateSection = async () => {
    if (!newSectionTitle.trim()) {
      setSectionError("Section title is required.");
      return;
    }

    setIsSavingSection(true);
    setSectionError("");
    setSectionSuccess("");

    try {
      const section = await sectionService.createSection(courseId, {
        title: newSectionTitle.trim(),
      });

      setSections((prev) => [...prev, { ...section, lessons: [] }]);
      setNewSectionTitle("");
      setSectionSuccess("Section added successfully.");
      setOpenLessonFormFor(section.id);
      toastSuccess("Section added successfully.");
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to create section:", err);
      const friendly = getFriendlyErrorMessage(
        err,
        "Failed to create section.",
      );
      setSectionError(friendly);
      notifyError(friendly);
    } finally {
      setIsSavingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId) => {
    setConfirmDialog({
      title: "Delete section",
      message: "Delete this section and all its lessons? This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await sectionService.deleteSection(courseId, sectionId);
          setSections((prev) =>
            prev.filter((section) => section.id !== sectionId),
          );
          toastSuccess("Section deleted successfully.");
        } catch (err) {
          if (import.meta.env.DEV)
            console.error("Failed to delete section:", err);
          const friendly = getFriendlyErrorMessage(
            err,
            "Failed to delete section.",
          );
          setSectionError(friendly);
          notifyError(friendly);
        }
      },
    });
  };

  const handleEditSection = async (sectionId) => {
    if (!editingSectionTitle.trim()) {
      setSectionError("Section title cannot be empty.");
      return;
    }

    try {
      const updated = await sectionService.updateSection(courseId, sectionId, {
        title: editingSectionTitle.trim(),
      });
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId
            ? { ...section, title: updated.title }
            : section,
        ),
      );
      setEditingSectionId(null);
      setEditingSectionTitle("");
      setSectionSuccess("Section title updated.");
      toastSuccess("Section title updated.");
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to update section:", err);
      const friendly = getFriendlyErrorMessage(
        err,
        "Failed to update section title.",
      );
      setSectionError(friendly);
      notifyError(friendly);
    }
  };

  const openLessonForm = (sectionId) => {
    setOpenLessonFormFor(sectionId);
    setEditingLessonId(null);
    setLessonError("");
    setLessonSuccess("");
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

  const handleCreateLesson = async (sectionId) => {
    if (!lessonForm.title.trim()) {
      setLessonError("Lesson title is required.");
      return;
    }

    setSavingLessonFor(sectionId);
    setLessonError("");
    setLessonSuccess("");

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
        toastSuccess("Lesson updated successfully.");
      } else {
        await lessonService.createLessonInSection(sectionId, payload);
        toastSuccess("Lesson added successfully.");
      }

      setLessonSuccess(
        editingLessonId
          ? "Lesson updated successfully."
          : "Lesson added successfully.",
      );
      setLessonForm({
        title: "",
        description: "",
        contentType: "video",
        contentUrl: "",
        duration: 0,
        isFree: true,
      });
      setEditingLessonId(null);
      setOpenLessonFormFor(null);
      await refreshSectionLessons(sectionId);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to create lesson:", err);
      const message = err.message || "Failed to create lesson.";
      setLessonError(message);
      toastError(message);
    } finally {
      setSavingLessonFor(null);
    }
  };

  const handleEditLesson = (lesson) => {
    setEditingLessonId(lesson.id);
    setLessonForm({
      id: lesson.id,
      title: lesson.title || "",
      description: lesson.description || "",
      contentType: lesson.contentType || lesson.content_type || "video",
      contentUrl:
        lesson.contentUrl || lesson.content_url || lesson.video_url || "",
      duration: lesson.duration || 0,
      isFree: Boolean(lesson.isFree),
    });
    setOpenLessonFormFor(lesson.sectionId || lesson.section_id || null);
    setLessonError("");
    setLessonSuccess("");
  };

  const handleDeleteLesson = async (lesson) => {
    const lessonTitle = lesson.title?.trim() || "Untitled lesson";
    setConfirmDialog({
      title: "Delete lesson",
      message: `Delete lesson "${lessonTitle}"?`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await lessonService.deleteLesson(
            lesson.id,
            lesson.sectionId || lesson.section_id,
          );
          toastSuccess("Lesson deleted successfully.");
          setSections((prev) =>
            prev.map((section) => ({
              ...section,
              lessons: (section.lessons || []).filter(
                (item) => item.id !== lesson.id,
              ),
            })),
          );
        } catch (err) {
          const message = err.message || "Failed to delete lesson.";
          toastError(message);
        }
      },
    });
  };

  const handleUploadLessonFile = async (file) => {
    if (!file) return;

    setUploadingLessonFile(true);
    setLessonError("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("folder", "beepro-lessons");
      payload.append(
        "resource_type",
        lessonForm.contentType === "video" ? "video" : "auto",
      );

      const uploaded = await uploadService.upload(payload);
      const url =
        uploaded?.secure_url ||
        uploaded?.url ||
        uploaded?.data?.secure_url ||
        uploaded?.data?.url ||
        uploaded?.public_id ||
        null;

      if (!url) {
        const msg = "The upload did not return a usable URL.";
        if (import.meta.env.DEV) console.error(msg, uploaded);
        setLessonError(msg);
        toastError(msg);
        return;
      }

      setLessonForm((prev) => ({ ...prev, contentUrl: url }));
      toastSuccess("File uploaded successfully.");
    } catch (err) {
      const message = err.message || "Failed to upload the selected file.";
      setLessonError(message);
      toastError(message);
    } finally {
      setUploadingLessonFile(false);
    }
  };

  const handleAssessmentChange = (field, value) => {
    setAssessmentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAssessment = async () => {
    if (!courseId || !assessmentForm.title.trim()) {
      setAssessmentError("Assessment title is required.");
      return;
    }

    setSavingAssessment(true);
    setAssessmentError("");
    setAssessmentSuccess("");
    try {
      let questions = [];
      try {
        questions = assessmentForm.questionsText
          ? JSON.parse(assessmentForm.questionsText)
          : [];
      } catch {
        setAssessmentError("Questions must be valid JSON.");
        return;
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        setAssessmentError(
          "Add at least one question before saving an assessment.",
        );
        return;
      }

      const payload = {
        lessonId: null,
        title: assessmentForm.title.trim(),
        description: assessmentForm.description || "",
        type: "quiz",
        status: assessmentForm.status || "draft",
        durationMinutes: Number(assessmentForm.durationMinutes) || 30,
        questions,
      };

      const saved = editingAssessmentId
        ? await assessmentService.updateAssessment(
            courseId,
            editingAssessmentId,
            payload,
          )
        : await assessmentService.createAssessment(courseId, payload);

      setAssessments((prev) => {
        if (editingAssessmentId) {
          return prev.map((item) =>
            item.id === editingAssessmentId ? saved : item,
          );
        }
        return [saved, ...prev];
      });
      setAssessmentSuccess(
        editingAssessmentId
          ? "Assessment updated successfully."
          : "Assessment created successfully.",
      );
      setAssessmentForm({
        title: "",
        durationMinutes: 30,
        passingGrade: 70,
        status: "draft",
        questionsText: "",
      });
      setEditingAssessmentId(null);
      toastSuccess(
        editingAssessmentId
          ? "Assessment updated successfully."
          : "Assessment created successfully.",
      );
    } catch (err) {
      const message = err.message || "Failed to save assessment.";
      setAssessmentError(message);
      toastError(message);
    } finally {
      setSavingAssessment(false);
    }
  };

  const handleEditAssessment = (assessment) => {
    setEditingAssessmentId(assessment.id);
    setAssessmentForm({
      title: assessment.title || "",
      durationMinutes:
        assessment.durationMinutes || assessment.duration_minutes || 30,
      passingGrade: assessment.passingGrade || assessment.passing_grade || 70,
      status: assessment.status || "draft",
      description: assessment.description || "",
      questionsText: Array.isArray(assessment.questions)
        ? JSON.stringify(assessment.questions, null, 2)
        : assessment.questionsText || "",
    });
    setAssessmentError("");
    setAssessmentSuccess("");
  };

  const handleDeleteAssessment = async (assessment) => {
    const assessmentTitle = assessment.title?.trim() || "Untitled assessment";
    setConfirmDialog({
      title: "Delete assessment",
      message: `Delete assessment "${assessmentTitle}"?`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await assessmentService.deleteAssessment(courseId, assessment.id);
          setAssessments((prev) =>
            prev.filter((item) => item.id !== assessment.id),
          );
          toastSuccess("Assessment deleted successfully.");
        } catch (err) {
          toastError(err.message || "Failed to delete assessment.");
        }
      },
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-secondary-50 dark:bg-dark-bg">
      <div className="container-custom">
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {course ? course.title : "Course Builder"}
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400 mt-2">
              Manage sections and lessons for this course. Course approval
              controls the visibility of content.
            </p>
          </div>

          {isInstructor && (
            <div className="card card-body bg-white dark:bg-dark-card">
              <h2 className="text-xl font-semibold mb-4">
                Create a new section
              </h2>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(event) => setNewSectionTitle(event.target.value)}
                  placeholder="Section title"
                  className="input w-full"
                />
                <ActionButton
                  onClick={handleCreateSection}
                  loading={isSavingSection}
                  className="w-full sm:w-auto"
                  variant="primary"
                >
                  Add Section
                </ActionButton>
              </div>
              {sectionError && (
                <p className="text-red-500 mt-3">{sectionError}</p>
              )}
              {sectionSuccess && (
                <p className="text-green-600 mt-3">{sectionSuccess}</p>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="min-h-[20rem] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                {progress && <ProgressCard progress={progress} />}
                <div className="card card-body bg-white dark:bg-dark-card">
                  <h2 className="text-xl font-semibold mb-4">Assessments</h2>
                  <AssessmentForm
                    form={assessmentForm}
                    onChange={handleAssessmentChange}
                    onSubmit={handleSaveAssessment}
                    loading={savingAssessment}
                    onCancel={() =>
                      setAssessmentForm({
                        title: "",
                        durationMinutes: 30,
                        passingGrade: 70,
                        status: "draft",
                        questionsText: "",
                      })
                    }
                  />
                  {assessmentError && (
                    <p className="text-red-500 mt-3">{assessmentError}</p>
                  )}
                  {assessmentSuccess && (
                    <p className="text-green-600 mt-3">{assessmentSuccess}</p>
                  )}
                  <div className="mt-6">
                    <AssessmentList
                      assessments={assessments}
                      onDelete={handleDeleteAssessment}
                      onEdit={handleEditAssessment}
                      onViewSubmissions={() => {}}
                    />
                  </div>
                </div>
              </div>
              <div className="card card-body bg-white dark:bg-dark-card">
                <ReviewList reviews={reviews} />
              </div>
            </div>
            {sections.length === 0 ? (
              <div className="card card-body text-center">
                <p className="text-secondary-500 mb-4">No sections yet.</p>
                {isInstructor ? (
                  <ActionButton onClick={handleCreateSection}>
                    Add New Section
                  </ActionButton>
                ) : (
                  <p className="text-secondary-500">
                    Sections will appear here once the instructor adds them.
                  </p>
                )}
              </div>
            ) : (
              sections.map((section) => (
                <div
                  key={section.id}
                  className="card card-body bg-white dark:bg-dark-card"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      {editingSectionId === section.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={editingSectionTitle}
                            onChange={(event) =>
                              setEditingSectionTitle(event.target.value)
                            }
                            className="input w-full"
                          />
                          <ActionButton
                            onClick={() => handleEditSection(section.id)}
                            size="sm"
                            variant="primary"
                            icon={Save}
                          >
                            Save
                          </ActionButton>
                          <ActionButton
                            onClick={() => {
                              setEditingSectionId(null);
                              setEditingSectionTitle("");
                            }}
                            size="sm"
                            variant="ghost"
                          >
                            Cancel
                          </ActionButton>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">
                            {section.title}
                          </h3>
                          <span className="text-sm text-secondary-500">
                            Section ID: {section.id}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isInstructor && (
                        <>
                          <ActionButton
                            onClick={() => {
                              setEditingSectionId(section.id);
                              setEditingSectionTitle(section.title || "");
                            }}
                            size="sm"
                            variant="edit"
                          >
                            Edit
                          </ActionButton>
                          <ActionButton
                            onClick={() => handleDeleteSection(section.id)}
                            size="sm"
                            variant="delete"
                          >
                            Delete
                          </ActionButton>
                          <ActionButton
                            onClick={() =>
                              openLessonFormFor === section.id
                                ? setOpenLessonFormFor(null)
                                : openLessonForm(section.id)
                            }
                            size="sm"
                            variant="secondary"
                          >
                            Add Lesson
                          </ActionButton>
                        </>
                      )}
                    </div>
                  </div>

                  {openLessonFormFor === section.id && (
                    <>
                      <LessonForm
                        form={lessonForm}
                        onChange={handleLessonFormChange}
                        onSubmit={() => handleCreateLesson(section.id)}
                        loading={savingLessonFor === section.id}
                        onUploadFile={handleUploadLessonFile}
                        uploadingFile={uploadingLessonFile}
                        onCancel={() => {
                          setOpenLessonFormFor(null);
                          setEditingLessonId(null);
                        }}
                        mode={editingLessonId ? "edit" : "create"}
                      />
                      {lessonError && (
                        <p className="text-red-500 mt-3">{lessonError}</p>
                      )}
                      {lessonSuccess && (
                        <p className="text-green-600 mt-3">{lessonSuccess}</p>
                      )}
                    </>
                  )}

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="font-semibold">Lessons</h4>
                      <span className="text-sm text-secondary-500">
                        {section.lessons?.length || 0} lessons
                      </span>
                    </div>

                    {section.lessons?.length === 0 ? (
                      <p className="text-secondary-500">
                        No lessons in this section yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {section.lessons.map((lesson) => (
                          <LessonCard
                            key={lesson.id}
                            lesson={lesson}
                            isInstructor
                            onEdit={handleEditLesson}
                            onDelete={handleDeleteLesson}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={confirmDialog?.onConfirm}
        onClose={() => setConfirmDialog(null)}
      />
    </div>
  );
};

export default TeacherCourseBuilder;

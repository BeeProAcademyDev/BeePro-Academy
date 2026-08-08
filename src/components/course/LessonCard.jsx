import ActionButton from "../ui/ActionButton";
import { FiClock } from "react-icons/fi";
import { useTranslation } from "react-i18next";

const LessonCard = ({ lesson, onEdit, onDelete, isInstructor = false }) => {
  const { t } = useTranslation();
  const contentType = lesson.contentType || lesson.content_type || "video";
  const duration = Math.max(0, Number(lesson.duration || 0));
  const lessonTitle = lesson.title?.trim() || t("courseDetailsDB.untitledLesson");

  return (
    <div className="rounded-xl border border-secondary-200 dark:border-dark-border bg-white dark:bg-dark-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h5 className="font-semibold text-secondary-900 dark:text-white">
              {lessonTitle}
            </h5>
            <span className="text-xs uppercase tracking-wide rounded-full bg-secondary-100 dark:bg-dark-border px-2 py-1 text-secondary-600 dark:text-secondary-300">
              {String(contentType).toUpperCase()}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm text-secondary-500">
            <span className="inline-flex items-center gap-1">
              <FiClock className="w-4 h-4" />
              {duration} {t("lessonForm.min")}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-xs ${lesson.isFree ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
            >
              {lesson.isFree ?? lesson.is_free
                ? t("course.free")
                : t("lessonForm.paid")}
            </span>
          </div>
        </div>
        {isInstructor && (
          <div className="flex flex-col items-end gap-3">
            <ActionButton
              onClick={() => onEdit(lesson)}
              size="sm"
              variant="edit"
              className="w-[120px] justify-center"
            >
              {t("common.edit")}
            </ActionButton>
            <ActionButton
              onClick={() => onDelete(lesson)}
              size="sm"
              variant="delete"
              className="w-[120px] justify-center"
            >
              {t("common.delete")}
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonCard;

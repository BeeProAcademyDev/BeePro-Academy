import Button from "../ui/Button";
import { FiCheckCircle, FiClock, FiEdit3, FiTrash2 } from "react-icons/fi";

const AssessmentList = ({
  assessments = [],
  onDelete,
  onEdit,
  onViewSubmissions,
}) => {
  if (!assessments.length) {
    return (
      <div className="rounded-xl border border-dashed border-secondary-300 p-6 text-center text-secondary-500">
        No assessments yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assessments.map((assessment) => (
        <div
          key={assessment.id}
          className="rounded-xl border border-secondary-200 dark:border-dark-border bg-white dark:bg-dark-card p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-secondary-900 dark:text-white">
                  {assessment.title}
                </h4>
                <span className="rounded-full bg-secondary-100 dark:bg-dark-border px-2 py-1 text-xs text-secondary-600 dark:text-secondary-300">
                  {assessment.status || "draft"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-secondary-500">
                <span className="inline-flex items-center gap-1">
                  <FiClock className="w-4 h-4" />
                  {assessment.durationMinutes ||
                    assessment.duration_minutes ||
                    0}{" "}
                  min
                </span>
                <span className="inline-flex items-center gap-1">
                  <FiCheckCircle className="w-4 h-4" />
                  Passing{" "}
                  {assessment.passingGrade || assessment.passing_grade || 0}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onViewSubmissions(assessment)}
                size="sm"
                variant="secondary"
              >
                Submissions
              </Button>
              {onEdit && (
                <Button
                  onClick={() => onEdit(assessment)}
                  size="sm"
                  variant="secondary"
                >
                  <FiEdit3 className="me-2" /> Edit
                </Button>
              )}
              <Button
                onClick={() => onDelete(assessment)}
                size="sm"
                variant="danger"
              >
                <FiTrash2 className="me-2" /> Delete
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AssessmentList;

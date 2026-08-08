import ActionButton from "../ui/ActionButton";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";

const LessonForm = ({
  form,
  onChange,
  onSubmit,
  loading,
  onCancel,
  mode = "create",
}) => {
  const { t } = useTranslation();
  const updateField = (field, value) => onChange(field, value);

  return (
    <div className="mt-6 border border-secondary-200 dark:border-dark-border rounded-xl p-4 bg-secondary-50 dark:bg-dark-border">
      <h4 className="font-semibold mb-4">
        {mode === "edit"
          ? t("lessonForm.editLesson")
          : t("lessonForm.newLesson")}
      </h4>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="label">{t("lessonForm.lessonTitle")}</label>
          <input
            type="text"
            value={form.title || ""}
            onChange={(event) => updateField("title", event.target.value)}
            className="input w-full"
            placeholder={t("lessonForm.lessonTitlePlaceholder")}
          />
        </div>
        <div>
          <label className="label">{t("lessonForm.description")}</label>
          <input
            type="text"
            value={form.description || ""}
            onChange={(event) => updateField("description", event.target.value)}
            className="input w-full"
            placeholder={t("lessonForm.descriptionPlaceholder")}
          />
        </div>
        <div>
          <label className="label">{t("lessonForm.contentType")}</label>
          <select
            value={form.contentType || "video"}
            onChange={(event) => updateField("contentType", event.target.value)}
            className="input w-full"
          >
            <option value="video">{t("lessonForm.contentTypes.video")}</option>
            <option value="pdf">{t("lessonForm.contentTypes.pdf")}</option>
            <option value="article">
              {t("lessonForm.contentTypes.article")}
            </option>
            <option value="file">{t("lessonForm.contentTypes.file")}</option>
          </select>
        </div>
        <div>
          <label className="label">{t("lessonForm.contentUrl")}</label>
          <input
            type="text"
            value={form.contentUrl || ""}
            onChange={(event) => updateField("contentUrl", event.target.value)}
            className="input w-full"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="label">{t("lessonForm.durationMinutes")}</label>
          <input
            type="number"
            value={form.duration || 0}
            onChange={(event) => updateField("duration", event.target.value)}
            className="input w-full"
            min="0"
          />
        </div>
        <div className="flex items-center gap-3 mt-6">
          <input
            id={`free-${form.id || "lesson"}`}
            type="checkbox"
            checked={Boolean(form.isFree)}
            onChange={(event) => updateField("isFree", event.target.checked)}
            className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor={`free-${form.id || "lesson"}`} className="text-sm">
            {t("lessonForm.makeLessonFree")}
          </label>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <ActionButton
          onClick={onSubmit}
          loading={loading}
          variant="primary"
          icon={mode === "edit" ? Save : undefined}
        >
          {mode === "edit"
            ? t("lessonForm.saveChanges")
            : t("lessonForm.createLesson")}
        </ActionButton>
        {onCancel && (
          <ActionButton onClick={onCancel} variant="ghost">
            {t("common.cancel")}
          </ActionButton>
        )}
      </div>
    </div>
  );
};

export default LessonForm;

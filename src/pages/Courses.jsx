import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import CourseCard from "../components/ui/CourseCard";
import {
  categoryService,
  courseService,
  enrollmentService,
} from "../services/api";
import {
  formatCourseForCard,
  isCoursePublishedAndApproved,
} from "../lib/backendFormatters";
import SEO from "../components/seo/SEO";
import {
  FiSearch,
  FiGrid,
  FiList,
  FiX,
  FiLoader,
  FiBookOpen,
} from "react-icons/fi";

const VIEW_MODE_STORAGE_KEY = "beepro:courses:view-mode";
const PAGE_SIZE = 10;

const normalizeCategoryId = (category) => {
  if (!category) return "";

  if (typeof category === "object") {
    return normalizeCategoryId(
      category.id ||
        category.category_id ||
        category.categoryId ||
        category.slug ||
        category.value ||
        category.name ||
        category.name_en,
    );
  }

  const map = {
    finance: "financial_markets",
    financial: "financial_markets",
    data: "data_analysis",
    it: "it",
    programming: "programming",
    design: "design",
  };

  return map[String(category).toLowerCase()] || String(category);
};

const normalizeCategoryRecord = (category) => {
  if (!category) return null;

  const id = normalizeCategoryId(category);
  if (!id) return null;

  return {
    id,
    name: category.name || category.title || category.label || id,
    nameEn:
      category.name_en ||
      category.nameEn ||
      category.title_en ||
      category.titleEn ||
      category.label_en ||
      category.labelEn ||
      category.name ||
      category.title ||
      category.label ||
      id,
  };
};

const getCategoryLabel = (category, isArabic) => {
  if (!category) return "";
  return isArabic ? category.name : category.nameEn;
};

const readViewMode = () => {
  if (typeof window === "undefined") return "grid";
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  return stored === "list" ? "list" : "grid";
};

const buildProgressMap = (rows) =>
  rows.reduce((acc, row) => {
    const courseId =
      row?.course_id || row?.courseId || row?.course?.id || row?.Course?.id;
    if (!courseId) return acc;

    const progress = Number(
      row?.progress ||
        row?.percentage ||
        row?.completion ||
        row?.completion_percentage ||
        0,
    );
    acc[courseId] = Number.isFinite(progress) ? progress : 0;
    return acc;
  }, {});

const Courses = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isArabic = language === "ar";
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState([]);
  const [backendCategories, setBackendCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(
    () => normalizeCategoryId(searchParams.get("category")) || "all",
  );
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState(readViewMode);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const loadCourses = useCallback(async () => {
    setIsLoading(true);

    try {
      const [courseResult, categoriesResult, enrollmentRows] =
        await Promise.all([
          courseService.getCourses(),
          categoryService.getCategories(),
          isAuthenticated
            ? enrollmentService.getUserEnrollments()
            : Promise.resolve([]),
        ]);

      const rows = courseResult?.data || [];
      const normalizedCategories = (categoriesResult || [])
        .map(normalizeCategoryRecord)
        .filter(Boolean);
      const categoryMap = new Map(
        normalizedCategories.map((category) => [category.id, category]),
      );
      const progressMap = buildProgressMap(enrollmentRows || []);

      const formattedCourses = rows
        .filter((course) => isCoursePublishedAndApproved(course))
        .map((course) => {
          const formatted = formatCourseForCard(course);
          const categoryId = normalizeCategoryId(
            course.category ||
              course.category_id ||
              course.categoryId ||
              course.category_slug ||
              course.categorySlug,
          );
          const category = categoryMap.get(categoryId);
          const categoryName =
            course.category?.name ||
            course.category_name ||
            course.categoryName ||
            category?.name ||
            categoryId;
          const categoryNameEn =
            course.category?.name_en ||
            course.category?.nameEn ||
            course.category_name_en ||
            course.categoryNameEn ||
            category?.nameEn ||
            categoryName;

          return {
            ...formatted,
            category: categoryId,
            categoryName,
            categoryNameEn,
            progress:
              progressMap[formatted.id] !== undefined
                ? progressMap[formatted.id]
                : null,
          };
        });

      setCourses(formattedCourses);
      setBackendCategories(normalizedCategories);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching courses:", error);
      setCourses([]);
      setBackendCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    const queryCategory =
      normalizeCategoryId(searchParams.get("category")) || "all";
    setSelectedCategory((current) =>
      current === queryCategory ? current : queryCategory,
    );
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  const categories = useMemo(() => {
    const courseCounts = courses.reduce((acc, course) => {
      const categoryId =
        normalizeCategoryId(course.category) || "uncategorized";
      acc[categoryId] = (acc[categoryId] || 0) + 1;
      return acc;
    }, {});

    return [
      {
        id: "all",
        name: t("courses.all"),
        nameEn: t("courses.all"),
        courseCount: courses.length,
      },
      ...backendCategories.map((category) => ({
        ...category,
        courseCount: courseCounts[category.id] || 0,
      })),
    ];
  }, [backendCategories, courses, t]);

  const sortOptions = [
    { value: "newest", label: t("courses.sort.newest") },
    {
      value: "oldest",
      label: t("courses.sort.oldest", { defaultValue: "Oldest" }),
    },
    {
      value: "title-asc",
      label: t("courses.sort.alphaAsc", { defaultValue: "A-Z" }),
    },
    {
      value: "title-desc",
      label: t("courses.sort.alphaDesc", { defaultValue: "Z-A" }),
    },
  ];

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = [...courses];

    if (query) {
      result = result.filter((course) => {
        const title = (course.title || "").toLowerCase();
        const titleEn = (course.titleEn || "").toLowerCase();
        return title.includes(query) || titleEn.includes(query);
      });
    }

    if (selectedCategory !== "all") {
      result = result.filter(
        (course) => normalizeCategoryId(course.category) === selectedCategory,
      );
    }

    switch (sortBy) {
      case "oldest":
        result.sort(
          (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
        );
        break;
      case "title-asc":
        result.sort((a, b) => {
          const titleA = isArabic
            ? a.title || a.titleEn || ""
            : a.titleEn || a.title || "";
          const titleB = isArabic
            ? b.title || b.titleEn || ""
            : b.titleEn || b.title || "";
          return titleA.localeCompare(titleB);
        });
        break;
      case "title-desc":
        result.sort((a, b) => {
          const titleA = isArabic
            ? a.title || a.titleEn || ""
            : a.titleEn || a.title || "";
          const titleB = isArabic
            ? b.title || b.titleEn || ""
            : b.titleEn || b.title || "";
          return titleB.localeCompare(titleA);
        });
        break;
      case "newest":
      default:
        result.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        );
    }

    return result;
  }, [courses, isArabic, searchQuery, selectedCategory, sortBy]);

  const totalCourses = courses.length;
  const totalFilteredCourses = filteredCourses.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCourses / PAGE_SIZE));
  const paginatedCourses = useMemo(
    () =>
      filteredCourses.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [currentPage, filteredCourses],
  );
  const visibleCount = Math.min(currentPage * PAGE_SIZE, totalFilteredCourses);

  const handleCategoryChange = (category) => {
    const normalizedCategory = normalizeCategoryId(category) || "all";
    setSelectedCategory(normalizedCategory);
    if (normalizedCategory === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ category: normalizedCategory });
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSortBy("newest");
    setSearchParams({});
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(searchQuery) || selectedCategory !== "all" || sortBy !== "newest";

  const goToPreviousPage = () =>
    setCurrentPage((page) => Math.max(1, page - 1));
  const goToNextPage = () =>
    setCurrentPage((page) => Math.min(totalPages, page + 1));

  return (
    <>
      <SEO
        title={
          isArabic ? "BeePro Academy | الدورات" : "BeePro Academy | Courses"
        }
        description={
          isArabic
            ? "اطّلع على الدورات التدريبية المتوفرة لدى BeePro Academy في البرمجة، البيانات، وتكنولوجيا المعلومات."
            : "Explore the available BeePro Academy courses in programming, data, and IT."
        }
        pathname={location.pathname}
        lang={language}
      />
      <div className="bepro-page pt-20 pb-16">
        <section className="py-12">
          <div className="bepro-container">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 break-words px-2">
                {t("courses.title")}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white font-semibold px-2 max-w-3xl mx-auto">
                {t("courses.discoverOurCoursesInFinancialM")}
              </p>
            </div>
          </div>
        </section>

        <section className="pb-8">
          <div className="bepro-container">
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => handleCategoryChange("all")}
                className={`px-6 py-2 rounded-full border border-white/30 text-white font-bold transition-all ${selectedCategory === "all" ? "bg-gradient-to-r from-[#009FFD] to-[#2A93D5] border-transparent" : "hover:bg-white/10"}`}
                type="button"
              >
                {t("courses.all")}
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`px-6 py-2 rounded-full border border-white/30 text-white font-bold transition-all ${selectedCategory === category.id ? "bg-gradient-to-r from-[#009FFD] to-[#2A93D5] border-transparent" : "hover:bg-white/10"}`}
                  type="button"
                >
                  {getCategoryLabel(category, isArabic)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-8">
          <div className="bepro-container">
            <div className="bepro-card p-4 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex-1 relative">
                  <FiSearch className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-white/50" />
                  <input
                    type="text"
                    placeholder={t("courses.search")}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="form-input form-input-glass ps-12"
                  />

                  <div className="flex items-center border border-white/20 rounded-xl overflow-hidden self-start">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-3 transition-colors ${viewMode === "grid" ? "bg-[#009FFD] text-white" : "hover:bg-white/10 text-white/70"}`}
                      aria-label="Grid view"
                      type="button"
                    >
                      <FiGrid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-3 transition-colors ${viewMode === "list" ? "bg-[#009FFD] text-white" : "hover:bg-white/10 text-white/70"}`}
                      aria-label="List view"
                      type="button"
                    >
                      <FiList className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/20">
                  {searchQuery && (
                    <span className="px-3 py-1 bg-[#009FFD]/30 text-white rounded-full text-sm flex items-center gap-2">
                      &quot;{searchQuery}&quot;
                      <button onClick={() => setSearchQuery("")} type="button">
                        <FiX className="w-4 h-4" />
                      </button>
                    </span>
                  )}
                  {selectedCategory !== "all" && (
                    <span className="px-3 py-1 bg-[#009FFD]/30 text-white rounded-full text-sm flex items-center gap-2">
                      {getCategoryLabel(
                        categories.find(
                          (category) => category.id === selectedCategory,
                        ),
                        isArabic,
                      )}
                      <button
                        onClick={() => handleCategoryChange("all")}
                        type="button"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={clearFilters}
                    className="text-sm text-red-400 hover:text-red-300 font-medium"
                    type="button"
                  >
                    {t("courses.clearAll")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="pb-4">
          <div className="bepro-container">
            <p className="text-white font-bold">
              Showing {visibleCount || totalFilteredCourses} of{" "}
              {totalFilteredCourses || totalCourses} courses
            </p>
          </div>
        </section>

        <section className="pb-16">
          <div className="bepro-container">
            {isLoading ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "space-y-6"
                }
              >
                {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 animate-pulse"
                  >
                    <div className="aspect-video rounded-xl bg-white/10 mb-4" />
                    <div className="h-4 w-3/4 rounded bg-white/10 mb-3" />
                    <div className="h-3 w-1/2 rounded bg-white/10 mb-2" />
                    <div className="h-3 w-full rounded bg-white/10 mb-2" />
                    <div className="h-3 w-5/6 rounded bg-white/10 mb-4" />
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-20 rounded bg-white/10" />
                      <div className="h-5 w-16 rounded bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedCourses.length > 0 ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "space-y-6"
                }
              >
                {paginatedCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className="animate-fadeInUp"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <CourseCard
                      course={course}
                      variant={viewMode === "list" ? "horizontal" : "default"}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                  <FiBookOpen className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  {totalCourses === 0
                    ? "No courses available."
                    : "No matching courses found."}
                </h3>
                <p className="text-white font-bold mb-8">
                  {totalCourses === 0
                    ? "New courses will appear here once they are published."
                    : "Try changing your search, category, or sort order."}
                </p>
                {totalCourses > 0 && (
                  <button
                    onClick={clearFilters}
                    className="bepro-btn-primary"
                    type="button"
                  >
                    {t("courses.clearFilters")}
                  </button>
                )}
              </div>
            )}

            {totalFilteredCourses > PAGE_SIZE && (
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-white/80 text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl border border-white/20 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-xl border border-white/20 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default Courses;

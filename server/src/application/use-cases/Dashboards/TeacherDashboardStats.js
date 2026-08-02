class TeacherDashboardStats {
  constructor({
    courseRepository,
    enrollmentRepository,
    lessonRepository,
    sectionRepository,
    courseSectionRepository,
    reviewRepository
  }) {
    this.courseRepository = courseRepository
    this.enrollmentRepository = enrollmentRepository
    this.lessonRepository = lessonRepository
    this.sectionRepository = sectionRepository || courseSectionRepository
    this.reviewRepository = reviewRepository
  }

  async execute({ userId }) {
    const [
      myCourses,
      publishedCourses,
      draftCourses,
      pendingApproval,
      totalStudents,
      totalLessons,
      totalSections,
      averageRating
    ] = await Promise.all([
      this.courseRepository.countByInstructor(userId),
      this.courseRepository.countPublishedByInstructor(userId),
      this.courseRepository.countDraftsByInstructor(userId),
      this.courseRepository.countPendingApprovalByInstructor(userId),
      this.enrollmentRepository.countDistinctStudentsByInstructor(userId),
      this.lessonRepository.countLessonsByInstructor(userId),
      this.sectionRepository.countSectionsByInstructor(userId),
      this.reviewRepository.getAverageRatingByInstructor(userId)
    ])

    return {
      myCourses,
      publishedCourses,
      draftCourses,
      pendingApproval,
      totalStudents,
      totalLessons,
      totalSections,
      averageRating
    }
  }
}

module.exports = TeacherDashboardStats
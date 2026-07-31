const { getPrismaClient } = require('./infrastructure/database/prismaClient')
const config = require('./config')

// Repositories
const PrismaUserRepository = require('./infrastructure/database/repositories/PrismaUserRepository')
const PrismaTokenRepository = require('./infrastructure/database/repositories/PrismaTokenRepository')
const PrismaCourseRepository = require('./infrastructure/database/repositories/PrismaCourseRepository')
const PrismaReviewRepository = require('./infrastructure/database/repositories/PrismaReviewRepository')
const PrismaAssessmentRepository = require('./infrastructure/database/repositories/PrismaAssessmentRepository')
const PrismaAssessmentSubmissionRepository = require('./infrastructure/database/repositories/PrismaAssessmentSubmissionRepository')

// Services
const BcryptHashService = require('./infrastructure/security/BcryptHashService')
const JwtTokenService = require('./infrastructure/security/JwtTokenService')
const EmailService = require('./infrastructure/services/EmailService')
const GoogleOAuthService = require('./infrastructure/services/GoogleOAuthService')
const CloudinaryMediaService = require('./infrastructure/services/CloudinaryMediaService')

// Use Cases
const RegisterUseCase = require('./application/use-cases/Authenticatioon/RegisterUseCase')
const LoginUseCase = require('./application/use-cases/Authenticatioon/LoginUseCase')
const LogoutUseCase = require('./application/use-cases/Authenticatioon/LogoutUseCase')
const RefreshTokenUseCase = require('./application/use-cases/Authenticatioon/RefreshTokenUseCase')
const ForgotPasswordUseCase = require('./application/use-cases/Authenticatioon/ForgotPasswordUseCase')
const ResetPasswordUseCase = require('./application/use-cases/Authenticatioon/ResetPasswordUseCase')
const GetProfileUseCase = require('./application/use-cases/Authenticatioon/GetProfileUseCase')
const UpdateProfileUseCase = require('./application/use-cases/Authenticatioon/UpdateProfileUseCase')
const GoogleOAuthUseCase = require('./application/use-cases/Authenticatioon/GoogleOAuthUseCase')

// Admin Use Cases
const GetAllUsersUseCase = require('./application/use-cases/Admin/GetAllUsersUseCase')
const GetPendingInstructorsUseCase = require('./application/use-cases/Admin/GetPendingInstructorsUseCase')
const ApproveInstructorUseCase = require('./application/use-cases/Admin/ApproveInstructorUseCase')
const RejectInstructorUseCase = require('./application/use-cases/Admin/RejectInstructorUseCase')
const SuspendUserUseCase = require('./application/use-cases/Admin/SuspendUserUseCase')
const ActivateUserUseCase = require('./application/use-cases/Admin/ActivateUserUseCase')
const DeleteUserUseCase = require('./application/use-cases/Admin/DeleteUserUseCase')
const UpdateCourseStatusApprovalUseCase = require('./application/use-cases/Admin/UpdateCourseStatusApprovalUseCase')

// Course Use Cases
const CreateCourseUseCase = require('./application/use-cases/Course/CreateCourseUseCase')
const UpdateCourseUseCase = require('./application/use-cases/Course/UpdateCourseUseCase')
const DeleteCourseUseCase = require('./application/use-cases/Course/DeleteCourseUseCase')
const GetCourseByIdUseCase = require('./application/use-cases/Course/GetCourseByIdUseCase')
const GetAllCoursesUseCase = require('./application/use-cases/Course/GetAllCoursesUseCase')
const GetInstructorCoursesUseCase = require('./application/use-cases/Course/GetInstructorCoursesUseCase')

// Category Use Cases
const PrismaCategoryRepository = require('./infrastructure/database/repositories/PrismaCategoryRepository')
const CreateCategoryUseCase = require('./application/use-cases/Category/CreateCategoryUseCase')
const GetAllCategoriesUseCase = require('./application/use-cases/Category/GetAllCategoriesUseCase')
const UpdateCategoryUseCase = require('./application/use-cases/Category/UpdateCategoryUseCase')
const DeleteCategoryUseCase = require('./application/use-cases/Category/DeleteCategoryUseCase')

// Section Use Cases
const PrismaCourseSectionRepository =require('./infrastructure/database/repositories/PrismaCourseSectionRepository')
const CreateSectionUseCase= require('./application/use-cases/Section/CreateSectionUseCase')
const UpdateSectionUseCase= require('./application/use-cases/Section/UpdateSectionUseCase')
const DeleteSectionUseCase= require('./application/use-cases/Section/DeleteSectionUseCase')
const GetAllCourseSectionUseCase=require('./application/use-cases/Section/GetAllCourseSectionUseCase')

// Lesson Use Cases
const PrismaLessonRepository = require('./infrastructure/database/repositories/PrismaLessonRepository')
const {
  CreateLessonUseCase,
  UpdateLessonUseCase,
  DeleteLessonUseCase,
  GetSectionLessonsUseCase,
  AddLessonFileUseCase,
  DeleteLessonFileUseCase
} = require('./application/use-cases/Lesson')
// Progress Use Cases
const PrismaLessonProgressRepository = require('./infrastructure/database/repositories/PrismaLessonProgressRepository')
const UpdateLessonProgressUseCase = require('./application/use-cases/Progress/UpdateLessonProgressUseCase')
const GetCourseProgressUseCase = require('./application/use-cases/Progress/GetCourseProgressUseCase')

// Enrollments Use Case
const PrismaEnrollmentRepository = require('./infrastructure/database/repositories/PrismaEnrollmentRepository')
const GetEnrollmentsUseCase = require('./application/use-cases/Enrollments/GetEnrollmentsUseCase')
const EnrollInCourseUseCase = require('./application/use-cases/Enrollments/EnrollInCourseUseCase')

// Review Use Cases
const CreateReviewUseCase = require('./application/use-cases/Review/CreateReviewUseCase')
const GetCourseReviewsUseCase = require('./application/use-cases/Review/GetCourseReviewsUseCase')
const UpdateReviewUseCase = require('./application/use-cases/Review/UpdateReviewUseCase')
const DeleteReviewUseCase = require('./application/use-cases/Review/DeleteReviewUseCase')

// Assessment Use Cases (Instructor)
const CreateAssessmentUseCase = require('./application/use-cases/Assessment/Instructor/CreateAssessmentUseCase')
const UpdateAssessmentUseCase = require('./application/use-cases/Assessment/Instructor/UpdateAssessmentUseCase')
const AddQuestionUseCase = require('./application/use-cases/Assessment/Instructor/AddQuestionUseCase')
const UpdateQuestionUseCase = require('./application/use-cases/Assessment/Instructor/UpdateQuestionUseCase')
const DeleteQuestionUseCase = require('./application/use-cases/Assessment/Instructor/DeleteQuestionUseCase')
const ReviewSubmissionUseCase = require('./application/use-cases/Assessment/Instructor/ReviewSubmissionUseCase')
const GetAssessmentSubmissionsUseCase = require('./application/use-cases/Assessment/Instructor/GetAssessmentSubmissionsUseCase')
const GetSubmissionForReviewUseCase = require('./application/use-cases/Assessment/Instructor/GetSubmissionForReviewUseCase')

// Assessment Use Cases (Student)
const StartAssessmentUseCase = require('./application/use-cases/Assessment/Student/StartAssessmentUseCase')
const SubmitAssessmentUseCase = require('./application/use-cases/Assessment/Student/SubmitAssessmentUseCase')
const GetAssessmentDetailsUseCase = require('./application/use-cases/Assessment/Student/GetAssessmentDetailsUseCase')
const GetSubmissionResultUseCase = require('./application/use-cases/Assessment/Student/GetSubmissionResultUseCase')
const DeleteAssessmentUseCase  = require('./application/use-cases/Assessment/Instructor/DeleteAssessmentUseCase')
// Controllers
const AuthController = require('./interfaces/http/controllers/AuthController')
const AdminController = require('./interfaces/http/controllers/AdminController')
const CourseController = require('./interfaces/http/controllers/CourseController')
const CategoryController = require('./interfaces/http/controllers/CategoryController')
const SectionController =require('./interfaces/http/controllers/SectionController')
const LessonController = require('./interfaces/http/controllers/LessonController')
const ProgressController = require('./interfaces/http/controllers/ProgressController')
const ReviewController = require('./interfaces/http/controllers/ReviewController')
const UploadController = require('./interfaces/http/controllers/UploadController')
const AssessmentController = require('./interfaces/http/controllers/AssessmentController')
/**
 * Dependency Injection Container
 * Initializes and wires all application components together.
 */
function createContainer() {
  const prisma = getPrismaClient()

  // 1. Init Repositories
  const userRepository = new PrismaUserRepository({ prisma })
  const tokenRepository = new PrismaTokenRepository({ prisma })
  const courseRepository = new PrismaCourseRepository({ prisma })
  const sectionRepository =new PrismaCourseSectionRepository({prisma})
  const lessonRepository = new PrismaLessonRepository({ prisma })
  const enrollmentRepository = new PrismaEnrollmentRepository({ prisma })
  const lessonProgressRepository = new PrismaLessonProgressRepository({ prisma })
  const reviewRepository = new PrismaReviewRepository(prisma)
  const assessmentRepository = new PrismaAssessmentRepository({ prisma })
  const assessmentSubmissionRepository = new PrismaAssessmentSubmissionRepository({ prisma })

  // 2. Init Services
  const hashService = new BcryptHashService()
  const tokenService = new JwtTokenService({ config })
  const emailService = new EmailService({ config })
  const googleOAuthService = new GoogleOAuthService({ config })
  const cloudinaryMediaService = new CloudinaryMediaService()

  // 3. Init Use Cases
  const registerUseCase = new RegisterUseCase({ userRepository, tokenRepository, hashService, tokenService })
  const loginUseCase = new LoginUseCase({ userRepository, tokenRepository, hashService, tokenService })
  const logoutUseCase = new LogoutUseCase({ tokenRepository })
  const refreshTokenUseCase = new RefreshTokenUseCase({ userRepository, tokenRepository, tokenService })
  const forgotPasswordUseCase = new ForgotPasswordUseCase({ userRepository, hashService, emailService, config })
  const resetPasswordUseCase = new ResetPasswordUseCase({ userRepository, tokenRepository, hashService })
  const getProfileUseCase = new GetProfileUseCase({ userRepository })
  const updateProfileUseCase = new UpdateProfileUseCase({ userRepository })
  const googleOAuthUseCase = new GoogleOAuthUseCase({ userRepository, tokenRepository, tokenService, googleOAuthService })

  // Admin Use Cases
  const getAllUsersUseCase = new GetAllUsersUseCase({ userRepository })
  const getPendingInstructorsUseCase = new GetPendingInstructorsUseCase({ userRepository })
  const approveInstructorUseCase = new ApproveInstructorUseCase({ userRepository })
  const rejectInstructorUseCase = new RejectInstructorUseCase({ userRepository })
  const suspendUserUseCase = new SuspendUserUseCase({ userRepository })
  const activateUserUseCase = new ActivateUserUseCase({ userRepository })
  const deleteUserUseCase = new DeleteUserUseCase({ userRepository })
  const updateCourseStatusApprovalUseCase = new UpdateCourseStatusApprovalUseCase({courseRepository})

  // Repositories used by category
  const categoryRepository = new PrismaCategoryRepository({ prisma })

  // Course Use Cases
  const createCourseUseCase = new CreateCourseUseCase({ courseRepository, userRepository })
  const updateCourseUseCase = new UpdateCourseUseCase({ courseRepository })
  const deleteCourseUseCase = new DeleteCourseUseCase({ courseRepository })
  const getCourseByIdUseCase = new GetCourseByIdUseCase({ courseRepository })
  const getAllCoursesUseCase = new GetAllCoursesUseCase({ courseRepository })
  const getInstructorCoursesUseCase = new GetInstructorCoursesUseCase({ courseRepository })

  // Category Use Cases
  const createCategoryUseCase = new CreateCategoryUseCase({ categoryRepository })
  const getAllCategoriesUseCase = new GetAllCategoriesUseCase({ categoryRepository })
  const updateCategoryUseCase = new UpdateCategoryUseCase({ categoryRepository })
  const deleteCategoryUseCase = new DeleteCategoryUseCase({ categoryRepository })

  // Section Use Cases
  const createSectionUseCase = new CreateSectionUseCase({ sectionRepository, courseRepository })
  const updateSectionUseCase = new UpdateSectionUseCase({ sectionRepository, courseRepository })
  const deleteSectionUseCase = new DeleteSectionUseCase({ sectionRepository, courseRepository })
  const getAllCourseSectionUseCase = new GetAllCourseSectionUseCase({sectionRepository,courseRepository})

  // Lesson Use Cases
  const createLessonUseCase = new CreateLessonUseCase({ lessonRepository, sectionRepository, courseRepository })
  const updateLessonUseCase = new UpdateLessonUseCase({ lessonRepository, sectionRepository, courseRepository })
  const deleteLessonUseCase = new DeleteLessonUseCase({ lessonRepository, sectionRepository, courseRepository })
  const getSectionLessonsUseCase = new GetSectionLessonsUseCase({ lessonRepository, sectionRepository, courseRepository })
  const addLessonFileUseCase = new AddLessonFileUseCase({ lessonRepository, sectionRepository, courseRepository })
  const deleteLessonFileUseCase = new DeleteLessonFileUseCase({ lessonRepository, sectionRepository, courseRepository })
  
  // Progress Use Cases
  const enrollInCourseUseCase = new EnrollInCourseUseCase({ enrollmentRepository, courseRepository, lessonRepository })
  const updateLessonProgressUseCase = new UpdateLessonProgressUseCase({ lessonProgressRepository, enrollmentRepository, lessonRepository, sectionRepository })
  const getCourseProgressUseCase = new GetCourseProgressUseCase({ enrollmentRepository, lessonProgressRepository })
  const getEnrollmentsUseCase = new GetEnrollmentsUseCase({ enrollmentRepository })

  // Review Use Cases
  const createReviewUseCase = new CreateReviewUseCase({ reviewRepository, courseRepository, enrollmentRepository })
  const getCourseReviewsUseCase = new GetCourseReviewsUseCase({ reviewRepository, courseRepository })
  const updateReviewUseCase = new UpdateReviewUseCase({ reviewRepository, courseRepository })
  const deleteReviewUseCase = new DeleteReviewUseCase({ reviewRepository, courseRepository })

  // Assessment Use Cases
  const createAssessmentUseCase = new CreateAssessmentUseCase({ assessmentRepository, courseRepository, lessonRepository, sectionRepository })
  const updateAssessmentUseCase = new UpdateAssessmentUseCase({ assessmentRepository, courseRepository })
  const addQuestionUseCase = new AddQuestionUseCase({ assessmentRepository, courseRepository })
  const updateQuestionUseCase = new UpdateQuestionUseCase({ assessmentRepository, courseRepository })
  const deleteQuestionUseCase = new DeleteQuestionUseCase({ assessmentRepository, courseRepository })
  const reviewSubmissionUseCase = new ReviewSubmissionUseCase({ assessmentRepository, assessmentSubmissionRepository, courseRepository })
  const getAssessmentSubmissionsUseCase = new GetAssessmentSubmissionsUseCase({ assessmentRepository, assessmentSubmissionRepository, courseRepository })
  const getSubmissionForReviewUseCase = new GetSubmissionForReviewUseCase({ assessmentRepository, assessmentSubmissionRepository, courseRepository })
  const deleteAssessmentUseCase =  new DeleteAssessmentUseCase({ assessmentRepository, courseRepository })
  const startAssessmentUseCase = new StartAssessmentUseCase({ assessmentRepository, assessmentSubmissionRepository, enrollmentRepository })
  const submitAssessmentUseCase = new SubmitAssessmentUseCase({ assessmentRepository, assessmentSubmissionRepository })
  const getAssessmentDetailsUseCase = new GetAssessmentDetailsUseCase({ assessmentRepository, enrollmentRepository })
  const getSubmissionResultUseCase = new GetSubmissionResultUseCase({ assessmentRepository, assessmentSubmissionRepository })

  // 4. Init Controllers
  const authController = new AuthController({
    registerUseCase,
    loginUseCase,
    logoutUseCase,
    refreshTokenUseCase,
    forgotPasswordUseCase,
    resetPasswordUseCase,
    getProfileUseCase,
    updateProfileUseCase,
    googleOAuthUseCase
  })

  const adminController = new AdminController({
    getAllUsersUseCase,
    getPendingInstructorsUseCase,
    approveInstructorUseCase,
    rejectInstructorUseCase,
    suspendUserUseCase,
    activateUserUseCase,
    deleteUserUseCase,
    updateCourseStatusApprovalUseCase
  })

  const courseController = new CourseController({
    createCourseUseCase,
    updateCourseUseCase,
    deleteCourseUseCase,
    getCourseByIdUseCase,
    getAllCoursesUseCase,
    getInstructorCoursesUseCase,
  })

  const categoryController = new CategoryController({
    createCategoryUseCase,
    getAllCategoriesUseCase,
    updateCategoryUseCase,
    deleteCategoryUseCase,
  })

  const sectionController = new SectionController({
    createSectionUseCase,
    updateSectionUseCase,
    deleteSectionUseCase,
    getAllCourseSectionUseCase
  })

  const lessonController = new LessonController({
    createLessonUseCase,
    updateLessonUseCase,
    deleteLessonUseCase,
    getSectionLessonsUseCase,
    addLessonFileUseCase,
    deleteLessonFileUseCase
  })

  const progressController = new ProgressController({
    enrollInCourseUseCase,
    updateLessonProgressUseCase,
    getCourseProgressUseCase,
    getEnrollmentsUseCase
  })

  const reviewController = new ReviewController({
    createReviewUseCase,
    getCourseReviewsUseCase,
    updateReviewUseCase,
    deleteReviewUseCase
  })

  const assessmentController = new AssessmentController({
    createAssessmentUseCase,
    updateAssessmentUseCase,
    addQuestionUseCase,
    updateQuestionUseCase,
    deleteQuestionUseCase,
    startAssessmentUseCase,
    submitAssessmentUseCase,
    getAssessmentDetailsUseCase,
    getSubmissionResultUseCase,
    reviewSubmissionUseCase,
    deleteAssessmentUseCase,
    getAssessmentSubmissionsUseCase,
    getSubmissionForReviewUseCase
  })

  const uploadController = new UploadController({ cloudinaryMediaService })

  return {
    prisma,
    tokenService,
    authController,
    adminController,
    courseController,
    categoryController,
    sectionController,
    lessonController,
    progressController,
    reviewController,
    assessmentController,
    uploadController
  }
}

module.exports = createContainer

const { getPrismaClient } = require('./infrastructure/database/prismaClient')
const config = require('./config')

// Repositories
const PrismaUserRepository = require('./infrastructure/database/repositories/PrismaUserRepository')
const PrismaTokenRepository = require('./infrastructure/database/repositories/PrismaTokenRepository')
const PrismaCourseRepository = require('./infrastructure/database/repositories/PrismaCourseRepository')

// Services
const BcryptHashService = require('./infrastructure/security/BcryptHashService')
const JwtTokenService = require('./infrastructure/security/JwtTokenService')
const EmailService = require('./infrastructure/services/EmailService')
const GoogleOAuthService = require('./infrastructure/services/GoogleOAuthService')

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
// Controllers
const AuthController = require('./interfaces/http/controllers/AuthController')
const AdminController = require('./interfaces/http/controllers/AdminController')
const CourseController = require('./interfaces/http/controllers/CourseController')
const CategoryController = require('./interfaces/http/controllers/CategoryController')
const SectionController =require('./interfaces/http/controllers/SectionController')
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

  // 2. Init Services
  const hashService = new BcryptHashService()
  const tokenService = new JwtTokenService({ config })
  const emailService = new EmailService({ config })
  const googleOAuthService = new GoogleOAuthService({ config })

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

  return {
    prisma,
    tokenService,
    authController,
    adminController,
    courseController,
    categoryController,
    sectionController
  }
}

module.exports = createContainer

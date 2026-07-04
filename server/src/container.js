const { getPrismaClient } = require("./infrastructure/database/prismaClient");
const config = require("./config");

// Repositories
const PrismaUserRepository = require("./infrastructure/database/repositories/PrismaUserRepository");
const PrismaTokenRepository = require("./infrastructure/database/repositories/PrismaTokenRepository");
const SupabaseCourseRepository = require("./infrastructure/database/repositories/SupabaseCourseRepository");

// Services
const BcryptHashService = require("./infrastructure/security/BcryptHashService");
const JwtTokenService = require("./infrastructure/security/JwtTokenService");
const EmailService = require("./infrastructure/services/EmailService");
const GoogleOAuthService = require("./infrastructure/services/GoogleOAuthService");

// Use Cases
const RegisterUseCase = require("./application/use-cases/Authenticatioon/RegisterUseCase");
const LoginUseCase = require("./application/use-cases/Authenticatioon/LoginUseCase");
const LogoutUseCase = require("./application/use-cases/Authenticatioon/LogoutUseCase");
const RefreshTokenUseCase = require("./application/use-cases/Authenticatioon/RefreshTokenUseCase");
const ForgotPasswordUseCase = require("./application/use-cases/Authenticatioon/ForgotPasswordUseCase");
const ResetPasswordUseCase = require("./application/use-cases/Authenticatioon/ResetPasswordUseCase");
const GetProfileUseCase = require("./application/use-cases/Authenticatioon/GetProfileUseCase");
const UpdateProfileUseCase = require("./application/use-cases/Authenticatioon/UpdateProfileUseCase");
const GoogleOAuthUseCase = require("./application/use-cases/Authenticatioon/GoogleOAuthUseCase");

// Controllers
const AuthController = require("./interfaces/http/controllers/AuthController");

/**
 * Dependency Injection Container
 * Initializes and wires all application components together.
 */
function createContainer() {
  const prisma = getPrismaClient();

  // 1. Init Repositories
  const userRepository = new PrismaUserRepository({ prisma });
  const tokenRepository = new PrismaTokenRepository({ prisma });

  // 2. Init Services
  const hashService = new BcryptHashService();
  const tokenService = new JwtTokenService({ config });
  const emailService = new EmailService({ config });
  const googleOAuthService = new GoogleOAuthService({ config });

  // 3. Init Use Cases
  const registerUseCase = new RegisterUseCase({
    userRepository,
    tokenRepository,
    hashService,
    tokenService,
  });
  const loginUseCase = new LoginUseCase({
    userRepository,
    tokenRepository,
    hashService,
    tokenService,
  });
  const logoutUseCase = new LogoutUseCase({ tokenRepository });
  const refreshTokenUseCase = new RefreshTokenUseCase({
    userRepository,
    tokenRepository,
    tokenService,
  });
  const forgotPasswordUseCase = new ForgotPasswordUseCase({
    userRepository,
    hashService,
    emailService,
    config,
  });
  const resetPasswordUseCase = new ResetPasswordUseCase({
    userRepository,
    tokenRepository,
    hashService,
  });
  const getProfileUseCase = new GetProfileUseCase({ userRepository });
  const updateProfileUseCase = new UpdateProfileUseCase({ userRepository });
  // Course repository/use-cases
  const courseRepository = new SupabaseCourseRepository({
    supabase: require("./infrastructure/supabaseClient"),
  });
  const listCoursesUseCase =
    new (require("./application/use-cases/Courses/ListCoursesUseCase"))({
      courseRepository,
    });
  const getCourseUseCase =
    new (require("./application/use-cases/Courses/GetCourseUseCase"))({
      courseRepository,
    });
  const createCourseUseCase =
    new (require("./application/use-cases/Courses/CreateCourseUseCase"))({
      courseRepository,
    });
  const updateCourseUseCase =
    new (require("./application/use-cases/Courses/UpdateCourseUseCase"))({
      courseRepository,
    });
  const deleteCourseUseCase =
    new (require("./application/use-cases/Courses/DeleteCourseUseCase"))({
      courseRepository,
    });

  // Blog repository/use-cases
  const SupabaseBlogRepository = require("./infrastructure/database/repositories/SupabaseBlogRepository");
  const blogRepository = new SupabaseBlogRepository({
    supabase: require("./infrastructure/supabaseClient"),
  });
  const listPublishedPostsUseCase =
    new (require("./application/use-cases/Blog/ListPublishedPostsUseCase"))({
      blogRepository,
    });
  const listAdminPostsUseCase =
    new (require("./application/use-cases/Blog/ListAdminPostsUseCase"))({
      blogRepository,
    });
  const createPostUseCase =
    new (require("./application/use-cases/Blog/CreatePostUseCase"))({
      blogRepository,
    });
  const updatePostUseCase =
    new (require("./application/use-cases/Blog/UpdatePostUseCase"))({
      blogRepository,
    });
  const deletePostUseCase =
    new (require("./application/use-cases/Blog/DeletePostUseCase"))({
      blogRepository,
    });

  // Enrollment repository/use-cases
  const SupabaseEnrollmentRepository = require("./infrastructure/database/repositories/SupabaseEnrollmentRepository");
  const enrollmentRepository = new SupabaseEnrollmentRepository({
    supabase: require("./infrastructure/supabaseClient"),
  });
  const enrollInCourseUseCase =
    new (require("./application/use-cases/Enrollments/EnrollInCourseUseCase"))({
      enrollmentRepository,
    });
  const getUserEnrollmentsUseCase =
    new (require("./application/use-cases/Enrollments/GetUserEnrollmentsUseCase"))(
      { enrollmentRepository },
    );
  const isEnrolledUseCase =
    new (require("./application/use-cases/Enrollments/IsEnrolledUseCase"))({
      enrollmentRepository,
    });
  const updateProgressUseCase =
    new (require("./application/use-cases/Enrollments/UpdateProgressUseCase"))({
      enrollmentRepository,
    });

  // Lesson repository/use-cases
  const SupabaseLessonRepository = require("./infrastructure/database/repositories/SupabaseLessonRepository");
  const lessonRepository = new SupabaseLessonRepository({
    supabase: require("./infrastructure/supabaseClient"),
  });
  const listLessonsUseCase =
    new (require("./application/use-cases/Lessons/ListLessonsByCourseUseCase"))(
      { lessonRepository },
    );
  const getLessonUseCase =
    new (require("./application/use-cases/Lessons/GetLessonUseCase"))({
      lessonRepository,
    });
  const createLessonUseCase =
    new (require("./application/use-cases/Lessons/CreateLessonUseCase"))({
      lessonRepository,
    });
  const updateLessonUseCase =
    new (require("./application/use-cases/Lessons/UpdateLessonUseCase"))({
      lessonRepository,
    });
  const deleteLessonUseCase =
    new (require("./application/use-cases/Lessons/DeleteLessonUseCase"))({
      lessonRepository,
    });
  const googleOAuthUseCase = new GoogleOAuthUseCase({
    userRepository,
    tokenRepository,
    tokenService,
    googleOAuthService,
  });

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
    googleOAuthUseCase,
  });
  const EnrollmentController = require("./interfaces/http/controllers/EnrollmentController");
  const enrollmentController = new EnrollmentController({
    enrollUseCase: enrollInCourseUseCase,
    getUseCase: getUserEnrollmentsUseCase,
    isEnrolledUseCase: isEnrolledUseCase,
    updateProgressUseCase: updateProgressUseCase,
  });

  const CourseController = require("./interfaces/http/controllers/CourseController");
  const courseController = new CourseController({
    listUseCase: listCoursesUseCase,
    getUseCase: getCourseUseCase,
    createUseCase: createCourseUseCase,
    updateUseCase: updateCourseUseCase,
    deleteUseCase: deleteCourseUseCase,
  });
  const LessonController = require("./interfaces/http/controllers/LessonController");
  const lessonController = new LessonController({
    listUseCase: listLessonsUseCase,
    getUseCase: getLessonUseCase,
    createUseCase: createLessonUseCase,
    updateUseCase: updateLessonUseCase,
    deleteUseCase: deleteLessonUseCase,
  });
  const BlogController = require("./interfaces/http/controllers/BlogController");
  const blogController = new BlogController({
    listPublishedUseCase: listPublishedPostsUseCase,
    listAdminUseCase: listAdminPostsUseCase,
    createUseCase: createPostUseCase,
    updateUseCase: updatePostUseCase,
    deleteUseCase: deletePostUseCase,
  });

  return {
    prisma,
    tokenService,
    authController,
    courseController,
    lessonController,
    blogController,
    enrollmentController,
  };
}

module.exports = createContainer;

const { getPrismaClient } = require('./infrastructure/database/prismaClient')
const config = require('./config')

// Repositories
const PrismaUserRepository = require('./infrastructure/database/repositories/PrismaUserRepository')
const PrismaTokenRepository = require('./infrastructure/database/repositories/PrismaTokenRepository')

// Services
const BcryptHashService = require('./infrastructure/security/BcryptHashService')
const JwtTokenService = require('./infrastructure/security/JwtTokenService')
const EmailService = require('./infrastructure/services/EmailService')
const GoogleOAuthService = require('./infrastructure/services/GoogleOAuthService')

// Use Cases
const RegisterUseCase = require('./application/use-cases/RegisterUseCase')
const LoginUseCase = require('./application/use-cases/LoginUseCase')
const LogoutUseCase = require('./application/use-cases/LogoutUseCase')
const RefreshTokenUseCase = require('./application/use-cases/RefreshTokenUseCase')
const ForgotPasswordUseCase = require('./application/use-cases/ForgotPasswordUseCase')
const ResetPasswordUseCase = require('./application/use-cases/ResetPasswordUseCase')
const GetProfileUseCase = require('./application/use-cases/GetProfileUseCase')
const UpdateProfileUseCase = require('./application/use-cases/UpdateProfileUseCase')
const GoogleOAuthUseCase = require('./application/use-cases/GoogleOAuthUseCase')

// Controllers
const AuthController = require('./interfaces/http/controllers/AuthController')

/**
 * Dependency Injection Container
 * Initializes and wires all application components together.
 */
function createContainer() {
  const prisma = getPrismaClient()

  // 1. Init Repositories
  const userRepository = new PrismaUserRepository({ prisma })
  const tokenRepository = new PrismaTokenRepository({ prisma })

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

  return {
    prisma,
    tokenService,
    authController
  }
}

module.exports = createContainer

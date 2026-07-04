/**
 * AuthController — Handles HTTP requests and delegates to Use Cases.
 */
class AuthController {
  constructor({
    registerUseCase,
    loginUseCase,
    logoutUseCase,
    refreshTokenUseCase,
    forgotPasswordUseCase,
    resetPasswordUseCase,
    getProfileUseCase,
    updateProfileUseCase,
    googleOAuthUseCase,
  }) {
    this.registerUseCase = registerUseCase
    this.loginUseCase = loginUseCase
    this.logoutUseCase = logoutUseCase
    this.refreshTokenUseCase = refreshTokenUseCase
    this.forgotPasswordUseCase = forgotPasswordUseCase
    this.resetPasswordUseCase = resetPasswordUseCase
    this.getProfileUseCase = getProfileUseCase
    this.updateProfileUseCase = updateProfileUseCase
    this.googleOAuthUseCase = googleOAuthUseCase
  }

  register = async (req, res, next) => {
    try {
      const result = await this.registerUseCase.execute(req.body)
      res.status(201).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  }

  login = async (req, res, next) => {
    try {
      const result = await this.loginUseCase.execute(req.body)
      res.status(200).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  }

  logout = async (req, res, next) => {
    try {
      const { refreshToken } = req.body
      const result = await this.logoutUseCase.execute({ refreshToken })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  refreshToken = async (req, res, next) => {
    try {
      const { refreshToken } = req.body
      const result = await this.refreshTokenUseCase.execute({ refreshToken })
      res.status(200).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  }

  forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.body
      const result = await this.forgotPasswordUseCase.execute({ email })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  resetPassword = async (req, res, next) => {
    try {
      const { email, otp, newPassword } = req.body
      const result = await this.resetPasswordUseCase.execute({ email, otp, newPassword })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  }

  getProfile = async (req, res, next) => {
    try {
      const userId = req.user.id
      const result = await this.getProfileUseCase.execute({ userId })
      res.status(200).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  }

  updateProfile = async (req, res, next) => {
    try {
      const userId = req.user.id
      const result = await this.updateProfileUseCase.execute({ userId, data: req.body })
      res.status(200).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  }

  googleAuth = async (req, res, next) => {
    try {
      const url = this.googleOAuthUseCase.getAuthUrl()
      res.redirect(url)
    } catch (err) {
      next(err)
    }
  }

  googleCallback = async (req, res, next) => {
    try {
      const { code } = req.query
      if (!code) {
        return res.status(400).json({ success: false, error: { message: 'Authorization code missing' } })
      }

      const result = await this.googleOAuthUseCase.execute({ code })
      
      // In a real app, you might want to redirect to the frontend with tokens in URL hash
      // or set cookies here. For an API, we just return JSON.
      res.status(200).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  }
}

module.exports = AuthController

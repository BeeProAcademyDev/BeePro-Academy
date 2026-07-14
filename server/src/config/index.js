require("dotenv").config();

// Log configuration on startup
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
if (!process.env.CLIENT_URL) {
  console.warn(
    "[CONFIG] ⚠️ CLIENT_URL not set in environment. Using default: http://localhost:3000",
  );
}

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  clientUrl,

  jwtSecret: process.env.JWT_SECRET,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",

  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:5000/api/v1/auth/google/callback",

  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom:
    process.env.EMAIL_FROM || '"BeePro Academy" <noreply@beepro.academy>',
};

// Basic validation
if (!config.jwtSecret || config.jwtSecret.length < 32) {
  console.warn(
    "⚠️ WARNING: JWT_SECRET is missing or too short. It must be at least 32 characters.",
  );
}

module.exports = config;

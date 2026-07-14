require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const config = require("./config");
const errorHandler = require("./interfaces/http/middlewares/errorHandler");
const authenticateMiddleware = require("./interfaces/http/middlewares/authenticate");
const authorizeMiddleware = require("./interfaces/http/middlewares/authorize");
const createAuthRoutes = require("./interfaces/http/routes/authRoutes");

function createApp(container) {
  const app = express();

  // Parse CLIENT_URL and log for debugging
  const allowedOrigins =
    typeof config.clientUrl === "string"
      ? config.clientUrl.split(",").map((url) => url.trim())
      : config.clientUrl;

  console.log("[CORS] Allowed Origins:", JSON.stringify(allowedOrigins));
  console.log("[CORS] Environment:", config.env);

  // Middlewares - CORS MUST be before helmet to ensure headers are set
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["Content-Length", "Authorization"],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    }),
  );
  app.use(helmet());
  app.use(express.json());
  app.use(morgan("dev"));

  // Inject dependencies into auth middleware
  const authenticate = authenticateMiddleware(container.tokenService);
  const authorize = authorizeMiddleware;

  // Routes
  const authRoutes = createAuthRoutes(
    container.authController,
    authenticate,
    authorize,
  );
  app.use("/api/v1/auth", authRoutes);

  // Courses
  const createCourseRoutes = require("./interfaces/http/routes/courseRoutes");
  const courseRoutes = createCourseRoutes(
    container.courseController,
    authenticate,
    authorize,
  );
  app.use("/api/v1/courses", courseRoutes);

  const createLessonRoutes = require("./interfaces/http/routes/lessonRoutes");
  const lessonRoutes = createLessonRoutes(
    container.lessonController,
    authenticate,
    authorize,
  );
  app.use("/api/v1/lessons", lessonRoutes);

  const createBlogRoutes = require("./interfaces/http/routes/blogRoutes");
  const blogRoutes = createBlogRoutes(
    container.blogController,
    authenticate,
    authorize,
  );
  app.use("/api/v1/blog", blogRoutes);

  const createEnrollmentRoutes = require("./interfaces/http/routes/enrollmentRoutes");
  const enrollmentRoutes = createEnrollmentRoutes(
    container.enrollmentController,
    authenticate,
    authorize,
  );
  app.use("/api/v1/enrollments", enrollmentRoutes);

  // Health check
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK" });
  });

  // Global Error Handler (must be last)
  app.use(errorHandler);


module.exports = createApp;

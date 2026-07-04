const { Router } = require("express");

function createEnrollmentRoutes(enrollmentController, authenticate, authorize) {
  const router = Router();

  router.post("/enroll", authenticate, enrollmentController.enroll);
  router.get(
    "/my-enrollments",
    authenticate,
    enrollmentController.getUserEnrollments,
  );
  router.get("/is-enrolled", authenticate, enrollmentController.isEnrolled);
  router.post(
    "/update-progress",
    authenticate,
    enrollmentController.updateProgress,
  );

  return router;
}

module.exports = createEnrollmentRoutes;

const { Router } = require("express");

function createCourseRoutes(courseController, authenticate, authorize) {
  const router = Router();

  // Public
  router.get("/", courseController.list);
  router.get("/:id", courseController.get);

  // Protected - instructor/admin
  router.post(
    "/",
    authenticate,
    authorize("instructor", "admin"),
    courseController.create,
  );
  router.patch(
    "/:id",
    authenticate,
    authorize("instructor", "admin"),
    courseController.update,
  );
  router.delete(
    "/:id",
    authenticate,
    authorize("instructor", "admin"),
    courseController.delete,
  );

  return router;
}

module.exports = createCourseRoutes;

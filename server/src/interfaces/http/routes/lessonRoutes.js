const { Router } = require("express");

function createLessonRoutes(lessonController, authenticate, authorize) {
  const router = Router();

  router.get("/course/:courseId", lessonController.listByCourse);
  router.get("/:id", lessonController.get);

  router.post(
    "/",
    authenticate,
    authorize("instructor", "admin"),
    lessonController.create,
  );
  router.patch(
    "/:id",
    authenticate,
    authorize("instructor", "admin"),
    lessonController.update,
  );
  router.delete(
    "/:id",
    authenticate,
    authorize("instructor", "admin"),
    lessonController.delete,
  );

  return router;
}

module.exports = createLessonRoutes;

const { Router } = require("express");

function createBlogRoutes(blogController, authenticate, authorize) {
  const router = Router();

  router.get("/published", blogController.listPublished);
  router.get(
    "/admin",
    authenticate,
    authorize("admin"),
    blogController.listAdmin,
  );

  router.post(
    "/",
    authenticate,
    authorize("admin", "instructor"),
    blogController.create,
  );
  router.patch(
    "/:id",
    authenticate,
    authorize("admin", "instructor"),
    blogController.update,
  );
  router.delete(
    "/:id",
    authenticate,
    authorize("admin", "instructor"),
    blogController.delete,
  );

  return router;
}

module.exports = createBlogRoutes;

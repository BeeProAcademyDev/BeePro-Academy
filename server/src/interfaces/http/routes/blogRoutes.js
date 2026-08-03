const { Router } = require('express')
const { validateCreateBlogPost, validateUpdateBlogPost } = require('../validators/blogValidators')

function createBlogRoutes(blogController, authenticate, authorize) {
  const router = Router()

  // --- Public Routes ---
  router.get('/', blogController.getAll)
  router.get('/:postId', blogController.getById)

  // --- Protected Routes ---
  router.use(authenticate)

  // Instructor & Admin: My Posts
  router.get('/author/my-posts', authorize('instructor', 'admin'), blogController.getMyPosts)

  // Instructor & Admin: Create, Update, Delete
  router.post('/', authorize('instructor', 'admin'), validateCreateBlogPost, blogController.create)
  router.patch('/:postId', authorize('instructor', 'admin'), validateUpdateBlogPost, blogController.update)
  router.delete('/:postId', authorize('instructor', 'admin'), blogController.delete)

  // --- Admin Only Routes ---
  // Must use specific paths to avoid conflicting with /:postId
  router.get('/admin/pending', authorize('admin'), blogController.getPending)
  router.patch('/:postId/approve', authorize('admin'), blogController.approve)
  router.patch('/:postId/reject', authorize('admin'), blogController.reject)

  return router
}

module.exports = createBlogRoutes

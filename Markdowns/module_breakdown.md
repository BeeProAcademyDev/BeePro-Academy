# BeePro Academy — Module Breakdown & Build Order

> **Last synced:** 2026-07-29  
> **Source of truth:** This file + codebase audit  

---

## Current Status Overview

| # | Module | Status | Progress |
|---|--------|--------|----------|
| 1 | **Auth** | ✅ DONE | 100% |
| 2 | **Admin** | ✅ DONE | 100% |
| 3 | **Course** (Categories, Courses, Sections, Lessons, Files) | ✅ DONE | 100% |
| 4 | **Enrollment & Progress** | ⚠️ PARTIAL | 40% — Enrollment + LessonProgress done. Certificate, Review, Wishlist NOT done |
| 5 | **Assessment** (Quiz + Assignment) | ❌ NOT STARTED | 0% |
| 6 | **Payment** (PayPal Integration) | ❌ NOT STARTED | 0% |
| 7 | **Communication** (Meeting + Chat + Notifications) | ❌ NOT STARTED | 0% |
| 8 | **Content** (Blog) | ❌ NOT STARTED | 0% |

---

## Module Build Order

```
Module 1: Auth ✅ DONE
    ↓
Module 2: Admin ✅ DONE
    ↓
Module 3: Course ✅ DONE
    ↓
Module 4: Enrollment & Progress ⚠️ PARTIAL (need Certificate, Review, Wishlist)
    ↓
Module 5: Assessment (needs Course + Lesson)
    ↓
Module 6: Payment — PayPal (needs User + Course + Enrollment)
    ↓
Module 7: Communication (needs User + Course + Enrollment)
    ↓
Module 8: Content (needs User)
```

> [!IMPORTANT]
> Each module only depends on modules above it. You can finish one completely before starting the next.

---

## Module 1: Auth ✅ DONE

All auth fixes from original plan (status field, role-based signup, authorize middleware check) have been applied.

### Existing Endpoints (LIVE)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user | Public |
| `POST` | `/api/v1/auth/login` | Login | Public |
| `POST` | `/api/v1/auth/refresh-token` | Refresh JWT | Public |
| `POST` | `/api/v1/auth/forgot-password` | Send reset email | Public |
| `POST` | `/api/v1/auth/reset-password` | Reset password | Public |
| `GET` | `/api/v1/auth/google` | Google OAuth | Public |
| `GET` | `/api/v1/auth/google/callback` | Google OAuth callback | Public |
| `POST` | `/api/v1/auth/logout` | Logout | Authenticated |
| `GET` | `/api/v1/auth/me` | Get profile | Authenticated |
| `PATCH` | `/api/v1/auth/me` | Update profile | Authenticated |

### Files (all exist ✅)

| Layer | File | Status |
|---|---|---|
| Entity | `domain/entities/User.js` | ✅ |
| Entity | `domain/entities/Token.js` | ✅ |
| Error | `domain/errors/AppError.js` | ✅ |
| Interface | `application/interfaces/IUserRepository.js` | ✅ |
| Interface | `application/interfaces/ITokenRepository.js` | ✅ |
| Interface | `application/interfaces/IHashService.js` | ✅ |
| Interface | `application/interfaces/ITokenService.js` | ✅ |
| Interface | `application/interfaces/IEmailService.js` | ✅ |
| DTO | `application/dtos/authDTOs.js` | ✅ |
| Use Case | `application/use-cases/Authenticatioon/*.js` (9 files) | ✅ |
| Repository | `infrastructure/database/repositories/PrismaUserRepository.js` | ✅ |
| Repository | `infrastructure/database/repositories/PrismaTokenRepository.js` | ✅ |
| Service | `infrastructure/security/BcryptHashService.js` | ✅ |
| Service | `infrastructure/security/JwtTokenService.js` | ✅ |
| Service | `infrastructure/services/EmailService.js` | ✅ |
| Service | `infrastructure/services/GoogleOAuthService.js` | ✅ |
| Controller | `interfaces/http/controllers/AuthController.js` | ✅ |
| Route | `interfaces/http/routes/authRoutes.js` | ✅ |
| Validator | `interfaces/http/validators/authValidators.js` | ✅ |
| Middleware | `interfaces/http/middlewares/authenticate.js` | ✅ |
| Middleware | `interfaces/http/middlewares/authorize.js` | ✅ |
| Middleware | `interfaces/http/middlewares/optionalAuthenticate.js` | ✅ |
| Middleware | `interfaces/http/middlewares/rateLimiter.js` | ✅ |
| Middleware | `interfaces/http/middlewares/validate.js` | ✅ |
| Middleware | `interfaces/http/middlewares/errorHandler.js` | ✅ |

### Prisma Models (in DB ✅)
- `User` — id, full_name, email, password_hash, role, **status**, avatar_url, phone, bio, reset_token, reset_token_exp
- `RefreshToken` — id, token, user_id, expires_at

---

## Module 2: Admin ✅ DONE

### Existing Endpoints (LIVE)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/admin/users` | List all users | Admin |
| `GET` | `/api/v1/admin/users/pending` | Get pending instructors | Admin |
| `PATCH` | `/api/v1/admin/users/:id/approve` | Approve instructor | Admin |
| `PATCH` | `/api/v1/admin/users/:id/reject` | Reject instructor | Admin |
| `PATCH` | `/api/v1/admin/users/:id/suspend` | Suspend user | Admin |
| `PATCH` | `/api/v1/admin/users/:id/activate` | Activate user | Admin |
| `DELETE` | `/api/v1/admin/users/:id` | Delete user | Admin |

### Files (all exist ✅)

| Layer | File | Status |
|---|---|---|
| Use Case | `application/use-cases/Admin/GetAllUsersUseCase.js` | ✅ |
| Use Case | `application/use-cases/Admin/GetPendingInstructorsUseCase.js` | ✅ |
| Use Case | `application/use-cases/Admin/ApproveInstructorUseCase.js` | ✅ |
| Use Case | `application/use-cases/Admin/RejectInstructorUseCase.js` | ✅ |
| Use Case | `application/use-cases/Admin/SuspendUserUseCase.js` | ✅ |
| Use Case | `application/use-cases/Admin/ActivateUserUseCase.js` | ✅ |
| Use Case | `application/use-cases/Admin/DeleteUserUseCase.js` | ✅ |
| Controller | `interfaces/http/controllers/AdminController.js` | ✅ |
| Route | `interfaces/http/routes/adminRoutes.js` | ✅ |

> **Note from wireframe:** The "Admin Approval Courses" view (course status: Approved / Pending / Rejected) maps to the Course module's `status` field, not this Admin module. Admin user management is fully functional.

---

## Module 3: Course ✅ DONE

### Existing Endpoints (LIVE)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| **Categories** ||||
| `GET` | `/api/v1/categories` | List all categories | Public |
| `POST` | `/api/v1/categories` | Create category | Admin |
| `PATCH` | `/api/v1/categories/:id` | Update category | Admin |
| `DELETE` | `/api/v1/categories/:id` | Delete category | Admin |
| **Courses** ||||
| `GET` | `/api/v1/courses` | List published courses | Public |
| `GET` | `/api/v1/courses/:id` | Get course details | Public / OptionalAuth |
| `GET` | `/api/v1/courses/instructor/my` | Get instructor's courses | Instructor |
| `POST` | `/api/v1/courses` | Create course | Instructor |
| `PATCH` | `/api/v1/courses/:id` | Update course | Instructor |
| `DELETE` | `/api/v1/courses/:id` | Delete course | Instructor / Admin |
| **Sections** ||||
| `GET` | `/api/v1/courses/:courseId/sections` | Get sections | Instructor / Admin |
| `POST` | `/api/v1/courses/:courseId/sections` | Create section | Instructor |
| `PATCH` | `/api/v1/courses/:courseId/sections/:sectionId` | Update section | Instructor |
| `DELETE` | `/api/v1/courses/:courseId/sections/:sectionId` | Delete section | Instructor |
| **Lessons** ||||
| `GET` | `/api/v1/sections/:sectionId/lessons` | Get lessons for section | Public / OptionalAuth |
| `POST` | `/api/v1/sections/:sectionId/lessons` | Create lesson | Instructor |
| `PATCH` | `/api/v1/sections/:sectionId/lessons/:lessonId` | Update lesson | Instructor |
| `DELETE` | `/api/v1/sections/:sectionId/lessons/:lessonId` | Delete lesson | Instructor |
| **Lesson Files** ||||
| `POST` | `/api/v1/sections/:sectionId/lessons/:lessonId/files` | Add file | Instructor |
| `DELETE` | `/api/v1/sections/:sectionId/lessons/files/:fileId` | Delete file | Instructor |

### Files (all exist ✅)

| Layer | File | Status |
|---|---|---|
| Entity | `domain/entities/Category.js`, `Course.js`, `CourseSection.js`, `Lesson.js`, `LessonFile.js` | ✅ |
| Interface | `ICategoryRepository.js`, `ICourseRepository.js`, `ICourseSectionRepository.js`, `ILessonRepository.js` | ✅ |
| Repository | `PrismaCategoryRepository.js`, `PrismaCourseRepository.js`, `PrismaCourseSectionRepository.js`, `PrismaLessonRepository.js` | ✅ |
| Use Case | `Category/` — Create, GetAll, Update, Delete | ✅ |
| Use Case | `Course/` — Create, GetAll, GetById, Update, Delete, GetInstructorCourses | ✅ |
| Use Case | `Section/` — Create, Update, Delete, GetAllCourseSection | ✅ |
| Use Case | `Lesson/index.js` — Create, Update, Delete, GetSectionLessons, AddFile, DeleteFile | ✅ |
| Controller | `CategoryController.js`, `CourseController.js`, `SectionController.js`, `LessonController.js` | ✅ |
| Route | `categoryRoutes.js`, `courseRoutes.js`, `sectionRoutes.js`, `lessonRoutes.js` | ✅ |
| Validator | `categoryValidators.js`, `courseValidators.js`, `sectionValidators.js`, `lessonValidators.js` | ✅ |
| DTO | `courseDTOs.js` | ✅ |

### Prisma Models (in DB ✅)
- `Course` — id, title, description, price, status, instructor_id, category_id
- `Category` — id, name, description
- `CourseSection` — id, course_id, title, order
- `Lesson` — id, section_id, title, content_type, content_url, text_content, duration, is_free, order
- `LessonFile` — id, lesson_id, file_name, file_url, file_type

> **Wireframe views covered:** Create Course, Instructor Course View, Instructor Section View, Lesson Adding View, Main Student All Course Search View, Admin Approval Courses

---

## Module 4: Enrollment & Progress ⚠️ PARTIAL

### What's DONE ✅

#### Endpoints (LIVE)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/progress/enroll/:courseId` | Enroll in course | Authenticated |
| `GET` | `/api/v1/progress/enrollments` | My enrollments | Authenticated |
| `GET` | `/api/v1/progress/course/:courseId` | My course progress | Authenticated |
| `PUT` | `/api/v1/progress/lesson/:lessonId` | Update lesson progress | Authenticated |

#### Files (exist ✅)

| Layer | File | Status |
|---|---|---|
| Entity | `domain/entities/Enrollment.js` | ✅ |
| Entity | `domain/entities/LessonProgress.js` | ✅ |
| Interface | `application/interfaces/IEnrollmentRepository.js` | ✅ |
| Interface | `application/interfaces/ILessonProgressRepository.js` | ✅ |
| Repository | `PrismaEnrollmentRepository.js` | ✅ |
| Repository | `PrismaLessonProgressRepository.js` | ✅ |
| Use Case | `Enrollments/EnrollInCourseUseCase.js` | ✅ |
| Use Case | `Enrollments/GetEnrollmentsUseCase.js` | ✅ |
| Use Case | `Progress/UpdateLessonProgressUseCase.js` | ✅ |
| Use Case | `Progress/GetCourseProgressUseCase.js` | ✅ |
| Controller | `ProgressController.js` | ✅ |
| Route | `progressRoutes.js` | ✅ |
| Validator | `progressValidators.js` | ✅ |

#### Prisma Models (in DB ✅)
- `Enrollment` — id, user_id, course_id, progress, total_lessons, completed_lessons, last_accessed_at, enrolled_at
- `LessonProgress` — id, user_id, lesson_id, course_id, is_completed, watch_time_seconds, completion_percentage, last_accessed_at

> **Wireframe views covered:** Student Course View (enroll button), Section Student View (course progress), Lesson Student View (progress bar, complete/next)

### What's REMAINING ❌

> [!WARNING]
> The original Module 4 plan included Certificate, Review, and Wishlist. These are NOT yet implemented.

#### Endpoint Mapping — Still needed

| Method | Endpoint | Description | Auth | Status |
|---|---|---|---|---|
| `GET` | `/api/v1/certificates/my` | My certificates | Student | ❌ |
| `GET` | `/api/v1/certificates/verify/:code` | Verify a certificate | Public | ❌ |
| `POST` | `/api/v1/courses/:courseId/reviews` | Write a review | Student (enrolled) | ❌ |
| `GET` | `/api/v1/courses/:courseId/reviews` | Get course reviews | Public | ❌ |
| `PATCH` | `/api/v1/reviews/:id` | Update my review | Student (owner) | ❌ |
| `DELETE` | `/api/v1/reviews/:id` | Delete my review | Student (owner) | ❌ |
| `POST` | `/api/v1/wishlist/:courseId` | Add to wishlist | Student | ❌ |
| `DELETE` | `/api/v1/wishlist/:courseId` | Remove from wishlist | Student | ❌ |
| `GET` | `/api/v1/wishlist` | My wishlist | Student | ❌ |

#### Files to Create

| Layer | File |
|---|---|
| Entity | `domain/entities/Certificate.js` |
| Entity | `domain/entities/Review.js` |
| Entity | `domain/entities/Wishlist.js` |
| Schema | Add `Certificate`, `Review`, `Wishlist` models to `schema.prisma` |
| Interface | `application/interfaces/ICertificateRepository.js` |
| Interface | `application/interfaces/IReviewRepository.js` |
| Interface | `application/interfaces/IWishlistRepository.js` |
| Repo | `PrismaCertificateRepository.js` |
| Repo | `PrismaReviewRepository.js` |
| Repo | `PrismaWishlistRepository.js` |
| Use Case | `Certificate/IssueCertificateUseCase.js` — auto-triggered on 100% progress |
| Use Case | `Certificate/VerifyCertificateUseCase.js` |
| Use Case | `Review/CreateReviewUseCase.js` |
| Use Case | `Review/GetCourseReviewsUseCase.js` |
| Use Case | `Review/UpdateReviewUseCase.js` |
| Use Case | `Review/DeleteReviewUseCase.js` |
| Use Case | `Wishlist/AddToWishlistUseCase.js` |
| Use Case | `Wishlist/RemoveFromWishlistUseCase.js` |
| Use Case | `Wishlist/GetWishlistUseCase.js` |
| Controller | `CertificateController.js` |
| Controller | `ReviewController.js` |
| Controller | `WishlistController.js` |
| Route | `certificateRoutes.js` |
| Route | `reviewRoutes.js` |
| Route | `wishlistRoutes.js` |
| Validator | `reviewValidators.js` |

#### Prisma Models (NOT in DB ❌)
- `Certificate` — id, user_id, course_id, certificate_number (unique), issued_at, expires_at, certificate_url, verification_code (unique), is_revoked
- `Review` — id, user_id, course_id, rating (1-5), comment, created_at, updated_at
- `Wishlist` — id, user_id, course_id, created_at

---

## Module 5: Assessment (Quiz + Assignment) ❌ NOT STARTED

**Purpose:** Instructors create quizzes and assignments for lessons. Students take quizzes and submit assignments.

### API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| **Quizzes** ||||
| `POST` | `/api/v1/lessons/:lessonId/quiz` | Create quiz for lesson | Instructor |
| `GET` | `/api/v1/lessons/:lessonId/quiz` | Get quiz (with questions) | Student (enrolled) |
| `PATCH` | `/api/v1/quizzes/:id` | Update quiz | Instructor |
| `DELETE` | `/api/v1/quizzes/:id` | Delete quiz | Instructor |
| `POST` | `/api/v1/quizzes/:id/questions` | Add question to quiz | Instructor |
| `PATCH` | `/api/v1/questions/:id` | Update question | Instructor |
| `DELETE` | `/api/v1/questions/:id` | Delete question | Instructor |
| `POST` | `/api/v1/quizzes/:id/attempt` | Submit quiz attempt | Student |
| `GET` | `/api/v1/quizzes/:id/my-attempts` | My attempts for this quiz | Student |
| **Assignments** ||||
| `POST` | `/api/v1/lessons/:lessonId/assignment` | Create assignment | Instructor |
| `GET` | `/api/v1/lessons/:lessonId/assignment` | Get assignment | Student |
| `PATCH` | `/api/v1/assignments/:id` | Update assignment | Instructor |
| `DELETE` | `/api/v1/assignments/:id` | Delete assignment | Instructor |
| `POST` | `/api/v1/assignments/:id/submit` | Submit answer/file | Student |
| `GET` | `/api/v1/assignments/:id/submissions` | View all submissions | Instructor |
| `PATCH` | `/api/v1/submissions/:id/grade` | Grade a submission | Instructor |

### Files to Create

| Layer | File |
|---|---|
| Entity | `Quiz.js`, `QuizQuestion.js`, `QuizAnswerOption.js`, `QuizAttempt.js` |
| Entity | `Assignment.js`, `AssignmentSubmission.js` |
| Schema | Add 6 models to `schema.prisma` |
| Interface | `IQuizRepository.js`, `IAssignmentRepository.js` |
| Repo | `PrismaQuizRepository.js`, `PrismaAssignmentRepository.js` |
| Use Case | `Quiz/` — ~6 use cases |
| Use Case | `Assignment/` — ~5 use cases |
| DTO | `quizDTOs.js`, `assignmentDTOs.js` |
| Controller | `QuizController.js`, `AssignmentController.js` |
| Route | `quizRoutes.js`, `assignmentRoutes.js` |
| Validator | `quizValidators.js`, `assignmentValidators.js` |

### Prisma Models (NOT in DB ❌)
- `Quiz` — id, lesson_id, course_id, title, duration_minutes, passing_score, max_attempts, is_published
- `QuizQuestion` — id, quiz_id, question_text, question_type, explanation, points, order
- `QuizAnswerOption` — id, question_id, option_text, is_correct
- `QuizAttempt` — id, quiz_id, user_id, score, percentage, is_passed, attempt_number, started_at, completed_at
- `Assignment` — id, lesson_id, course_id, title, description, due_date, max_score
- `AssignmentSubmission` — id, assignment_id, user_id, content, file_url, score, feedback, submitted_at, graded_at

---

## Module 6: Payment (PayPal Integration) ❌ NOT STARTED

**Purpose:** Students pay for courses via PayPal. System auto-enrolls after successful payment.

> [!IMPORTANT]
> ### Payment Strategy Decision — PayPal
> We will use **PayPal Checkout Orders v2 API** for the initial implementation.
> 
> **Why PayPal:**
> - Widely available internationally
> - No need for students to enter credit card info directly
> - Sandbox environment for testing
> - Supports one-time payments (perfect for course purchases)
> 
> **Architecture:**
> 1. Student clicks "Buy Course" → Frontend calls backend to **Create PayPal Order**
> 2. Backend creates order via PayPal API → returns approval URL
> 3. Student approves on PayPal → redirected back
> 4. Backend **Captures the payment** → auto-enrolls the student
> 5. PayPal **Webhook** confirms payment asynchronously (backup verification)
>
> **Required env vars:** `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE` (sandbox/live)

### API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/payments/create-order` | Create PayPal order for a course | Student |
| `POST` | `/api/v1/payments/capture-order` | Capture payment after approval | Student |
| `POST` | `/api/v1/payments/webhook` | PayPal webhook (IPN) | Public (verified) |
| `GET` | `/api/v1/payments/my` | My payment history | Student |
| `GET` | `/api/v1/payments/course/:courseId` | Payments for a course | Instructor |
| `GET` | `/api/v1/admin/payments` | All payments | Admin |

### Files to Create

| Layer | File |
|---|---|
| Entity | `domain/entities/Payment.js` |
| Schema | Add `Payment` model to `schema.prisma` |
| Interface | `application/interfaces/IPaymentRepository.js` |
| Repo | `infrastructure/database/repositories/PrismaPaymentRepository.js` |
| Service | `infrastructure/services/PayPalService.js` ← **PayPal API client** |
| Use Case | `Payment/CreatePayPalOrderUseCase.js` |
| Use Case | `Payment/CapturePayPalOrderUseCase.js` — captures + auto-enrolls |
| Use Case | `Payment/HandleWebhookUseCase.js` |
| Use Case | `Payment/GetMyPaymentsUseCase.js` |
| Use Case | `Payment/GetCoursePaymentsUseCase.js` |
| DTO | `application/dtos/paymentDTOs.js` |
| Controller | `interfaces/http/controllers/PaymentController.js` |
| Route | `interfaces/http/routes/paymentRoutes.js` |
| Validator | `interfaces/http/validators/paymentValidators.js` |

### Prisma Model (NOT in DB ❌)
- `Payment` — id, user_id, course_id, amount, currency (default "USD"), payment_provider ("paypal"), paypal_order_id, paypal_capture_id, status (pending/completed/failed/refunded), created_at

---

## 🎥 Video Streaming Strategy

> [!IMPORTANT]
> ### Decision Required: Video Streaming Platform
> 
> The Lesson model currently stores a `content_url` field. We need to decide HOW videos are stored and streamed.

### Option Comparison

| Option | Cost | Security | Quality | Setup Effort | Best For |
|--------|------|----------|---------|-------------|----------|
| **Bunny.net Stream** | 💚 Cheapest (~$1/1000 min) | Token auth, Geo-block | Adaptive bitrate | Medium | Budget-conscious startup ✅ |
| **Cloudflare Stream** | 🟡 Mid ($1/1000 min stored + $5/1000 min delivered) | Signed URLs, token auth | Adaptive bitrate | Easy | Quick setup, Cloudflare users |
| **Mux** | 🔴 Higher ($0.07/min encoded + delivery) | DRM options | Best-in-class | Medium-High | Premium SaaS platforms |
| **Google Drive** | 💚 Free (15GB) | ❌ No DRM, easy to download | No adaptive bitrate | Very Easy | ❌ NOT recommended for paid content |
| **VdoCipher** | 🟡 Mid (plans from $59/mo) | ✅ Studio-grade DRM (Widevine/FairPlay) | Adaptive bitrate | Easy | High-value paid courses with piracy risk |

### Recommended Scenarios

**Scenario A — Budget Start (Recommended):** Use **Bunny.net Stream**
- Cheapest professional option
- Upload via API, get streaming URLs
- Token-authenticated playback prevents hotlinking
- Easy Node.js integration
- Add `BunnyStreamService.js` to infrastructure/services

**Scenario B — Maximum Security:** Use **VdoCipher**
- If course content is high-value and piracy is a concern
- Studio-grade DRM (Widevine for Chrome/Android, FairPlay for Safari/iOS)
- Students cannot screen-record or download
- Higher cost but best protection

**Scenario C — Quick & Free (Development only):** Use **Google Drive**
- Only for development/testing
- Content easily downloadable
- No adaptive bitrate = buffering on slow connections
- ❌ Never use this for paid production courses

### Implementation Plan (applies to any provider)

```
New files needed:
├── infrastructure/services/VideoStreamService.js    ← abstracts the provider
├── application/interfaces/IVideoStreamService.js    ← interface
└── Update LessonController to handle video upload URLs
```

The `content_url` in the Lesson model will store the provider's stream URL/ID. The `VideoStreamService` will handle:
1. Generating upload URLs (for instructor uploads)
2. Generating signed playback URLs (for student viewing)
3. Managing video lifecycle (delete when lesson deleted)

---

## Module 7: Communication (Meeting + Chat + Notifications) ❌ NOT STARTED

**Purpose:** Instructors create meetings. Students and instructors chat privately per course. System sends notifications.

### API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| **Meetings** ||||
| `POST` | `/api/v1/courses/:courseId/meetings` | Create meeting | Instructor |
| `GET` | `/api/v1/courses/:courseId/meetings` | Get course meetings | Enrolled / Instructor |
| `PATCH` | `/api/v1/meetings/:id` | Update meeting | Instructor |
| `DELETE` | `/api/v1/meetings/:id` | Delete/cancel meeting | Instructor |
| **Chat** ||||
| `POST` | `/api/v1/courses/:courseId/conversations` | Start conversation | Student (enrolled) |
| `GET` | `/api/v1/conversations/my` | My conversations | Student / Instructor |
| `GET` | `/api/v1/conversations/:id/messages` | Get messages | Participant |
| `POST` | `/api/v1/conversations/:id/messages` | Send message | Participant |
| `PATCH` | `/api/v1/conversations/:id/read` | Mark as read | Participant |
| **Notifications** ||||
| `GET` | `/api/v1/notifications` | My notifications | Authenticated |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark as read | Authenticated |
| `PATCH` | `/api/v1/notifications/read-all` | Mark all as read | Authenticated |

### Files to Create

| Layer | File |
|---|---|
| Entity | `Meeting.js`, `Conversation.js`, `Message.js`, `Notification.js` |
| Schema | Add 4 models to `schema.prisma` |
| Interface + Repo | 4 interfaces + 4 Prisma repos |
| Use Case | `Meeting/` — ~4 use cases |
| Use Case | `Chat/` — ~4 use cases |
| Use Case | `Notification/` — ~3 use cases |
| Service | `infrastructure/services/NotificationService.js` |
| Controller | `MeetingController.js`, `ChatController.js`, `NotificationController.js` |
| Route | 3 route files |
| Validator | 3 validator files |

### Prisma Models (NOT in DB ❌)
- `Meeting` — id, course_id, created_by, title, meet_link, scheduled_at, duration_minutes, status
- `MeetingAttendee` — id, meeting_id, user_id, joined_at, left_at, attendance_status
- `Conversation` — id, course_id, student_id, instructor_id, last_message_at
- `Message` — id, conversation_id, sender_id, content, is_read, created_at
- `Notification` — id, user_id, title, message, type, is_read, action_url

---

## Module 8: Content (Blog) ❌ NOT STARTED

**Purpose:** Admin creates and publishes blog posts.

### API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/blog` | List published posts | Public |
| `GET` | `/api/v1/blog/:slug` | Get post by slug | Public |
| `POST` | `/api/v1/blog` | Create post | Admin |
| `PATCH` | `/api/v1/blog/:id` | Update post | Admin |
| `DELETE` | `/api/v1/blog/:id` | Delete post | Admin |

### Files to Create

| Layer | File |
|---|---|
| Entity | `domain/entities/BlogPost.js` |
| Schema | Add model to `schema.prisma` |
| Interface | `application/interfaces/IBlogPostRepository.js` |
| Repo | `infrastructure/database/repositories/PrismaBlogPostRepository.js` |
| Use Case | `application/use-cases/Blog/*.js` (~5 use cases) |
| DTO | `application/dtos/blogDTOs.js` |
| Controller | `interfaces/http/controllers/BlogController.js` |
| Route | `interfaces/http/routes/blogRoutes.js` |
| Validator | `interfaces/http/validators/blogValidators.js` |

### Prisma Model (NOT in DB ❌)
- `BlogPost` — id, author_id, title, slug (unique), content, excerpt, cover_image_url, is_published, published_at, created_at, updated_at

---

## Summary

| # | Module | Entities | Use Cases | Endpoints | Status |
|---|--------|----------|-----------|-----------|--------|
| 1 | **Auth** | User, RefreshToken | 9 | 10 | ✅ Done |
| 2 | **Admin** | — (uses User) | 7 | 7 | ✅ Done |
| 3 | **Course** | Category, Course, Section, Lesson, LessonFile | 16 | 22 | ✅ Done |
| 4 | **Enrollment & Progress** | Enrollment, LessonProgress, ~~Certificate, Review, Wishlist~~ | 4 done / 9 remaining | 4 done / 9 remaining | ⚠️ Partial |
| 5 | **Assessment** | Quiz, Question, Option, Attempt, Assignment, Submission | ~11 | 17 | ❌ Not started |
| 6 | **Payment (PayPal)** | Payment | ~5 | 6 | ❌ Not started |
| 7 | **Communication** | Meeting, Attendee, Conversation, Message, Notification | ~11 | 12 | ❌ Not started |
| 8 | **Content** | BlogPost | ~5 | 5 | ❌ Not started |
| | **TOTAL** | **~25 entities** | **~77 use cases** | **~92 endpoints** | |

> [!TIP]
> **Next step:** Finish Module 4 (add Certificate, Review, Wishlist), then proceed to Module 5 (Assessment).

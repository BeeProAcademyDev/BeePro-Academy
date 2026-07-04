import { authService } from './authService'
import { courseService } from './courseService'
import { lessonService } from './lessonService'
import { enrollmentService } from './enrollmentService'
import { reviewService } from './reviewService'
import { userService } from './userService'
import { categoryService } from './categoryService'
import { blogService } from './blogService'
import { articleScheduleService } from './articleScheduleService'
import { adminService } from './adminService'
import { meetingService } from './meetingService'
import { notificationService } from './notificationService'
import { chatService } from './chatService'

export {
  authService,
  courseService,
  lessonService,
  enrollmentService,
  reviewService,
  userService,
  categoryService,
  blogService,
  articleScheduleService,
  adminService,
  meetingService,
  notificationService,
  chatService
}

export default {
  auth: authService,
  courses: courseService,
  lessons: lessonService,
  enrollments: enrollmentService,
  reviews: reviewService,
  users: userService,
  categories: categoryService,
  blogs: blogService,
  articleSchedules: articleScheduleService,
  admin: adminService,
  meetings: meetingService,
  notifications: notificationService,
  chat: chatService
}

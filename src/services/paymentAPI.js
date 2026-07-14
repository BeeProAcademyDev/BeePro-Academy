// This file is deprecated. The frontend now uses only the REST API.
// All payment database calls must go through src/services/api.js instead.

export const PAYMENT_TYPES = [
  { value: "vodafone_cash", label: "Vodafone Cash" },
  { value: "paypal", label: "PayPal" },
  { value: "crypto", label: "Crypto" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

/**
 * Payment Service - REST API version
 * All operations require backend payment API endpoints
 */
export const paymentService = {
  async hasApprovedPaymentForCourse(studentId, courseId) {
    console.warn('paymentService.hasApprovedPaymentForCourse() requires payment API endpoints on the backend');
    return false;
  },

  async getPaymentProofViewUrl(urlOrPath, expiresInSeconds = 3600) {
    return urlOrPath;
  },

  async getCoursePaymentMethods(courseId, instructorIdFromContext = null) {
    console.warn('paymentService.getCoursePaymentMethods() requires payment API endpoints on the backend');
    return [];
  },

  async getMyPaymentMethods(userId) {
    console.warn('paymentService.getMyPaymentMethods() requires payment API endpoints on the backend');
    return [];
  },

  async createPaymentMethod(paymentMethodData) {
    console.warn('paymentService.createPaymentMethod() requires payment API endpoints on the backend');
    throw new Error('Payment methods management requires backend API endpoints');
  },

  async getInstructorPaymentSubmissions(instructorId) {
    console.warn('paymentService.getInstructorPaymentSubmissions() requires payment API endpoints on the backend');
    return [];
  },

  async getAllPaymentSubmissions() {
    console.warn('paymentService.getAllPaymentSubmissions() requires payment API endpoints on the backend');
    return [];
  },

  async getStudentPaymentSubmissions(studentId) {
    console.warn('paymentService.getStudentPaymentSubmissions() requires payment API endpoints on the backend');
    return [];
  },

  async uploadPaymentScreenshot(file, studentId, courseId) {
    console.warn('paymentService.uploadPaymentScreenshot() requires payment API endpoints on the backend');
    return '';
  },

  async submitPaymentProof(payload) {
    console.warn('paymentService.submitPaymentProof() requires payment API endpoints on the backend');
    throw new Error('Payment submission requires backend API endpoints');
  },

  async approvePaymentSubmission({ submissionId, reviewNotes = null }) {
    console.warn('paymentService.approvePaymentSubmission() requires payment API endpoints on the backend');
    throw new Error('Payment approval requires backend API endpoints');
  },

  async rejectPaymentSubmission({ submissionId, reviewNotes = null }) {
    console.warn('paymentService.rejectPaymentSubmission() requires payment API endpoints on the backend');
    throw new Error('Payment rejection requires backend API endpoints');
  },
};

/**
 * Payment Notification Service
 */
export const paymentNotificationService = {
  async getUserNotifications(userId, { limit = 50 } = {}) {
    console.warn('paymentNotificationService.getUserNotifications() requires payment API endpoints on the backend');
    return [];
  },

  subscribeToUserNotifications(userId, onInsert) {
    return null;
  },

  async markAsRead(notificationId, userId) {
    return { success: true };
  },

  async markAllAsRead(userId) {
    return { success: true };
  },

  async deleteNotification(notificationId, userId) {
    return { success: true };
  },

  removeChannel(channel) {
    return null;
  },
};

export default paymentService;


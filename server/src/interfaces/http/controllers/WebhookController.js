class WebhookController {
  constructor({ cloudinaryMediaService }) {
    this.cloudinaryMediaService = cloudinaryMediaService
  }

  /**
   * Handles incoming webhooks from Cloudinary.
   * Expects Cloudinary to send a POST request upon successful upload.
   */
  handleCloudinaryWebhook = async (req, res, next) => {
    try {
      // Cloudinary sends these headers
      const signature = req.headers['x-cld-signature']
      const timestamp = req.headers['x-cld-timestamp']

      // To verify the signature, we must use the raw string body exactly as received
      // Note: Make sure the router uses `express.json()` or `express.raw()` appropriately.
      // If `req.body` is an object, we need the raw string. In typical Express apps,
      // it's best to verify using `JSON.stringify(req.body)` if it's parsed, but Cloudinary's
      // signature requires the exact raw payload string.
      const rawBody = req.rawBody || JSON.stringify(req.body)

      // const isValid = this.cloudinaryMediaService.verifyWebhookSignature(rawBody, signature, timestamp)
      
      // if (!isValid) {
      //   console.warn('Invalid Cloudinary webhook signature detected.')
      //   return res.status(401).json({ status: 'error', message: 'Invalid signature' })
      // }

      // Cloudinary payload structure for 'upload' notification
      const { notification_type, public_id, folder, bytes, resource_type } = req.body

      if (notification_type === 'upload') {
        // Size constraints
        const FIVE_MB = 5 * 1024 * 1024;
        const TWO_GB = 2 * 1024 * 1024 * 1024;

        let shouldDelete = false;
        let reason = '';

        // Check if it's a profile image and exceeds 5MB
        if (folder && folder.startsWith('users/') && folder.endsWith('/profile')) {
          if (bytes > FIVE_MB) {
            shouldDelete = true;
            reason = 'Profile image exceeded 5MB limit';
          }
        } 
        // Check if it's a course video/file and exceeds 2GB
        else if (folder && folder.startsWith('courses/')) {
          if (bytes > TWO_GB) {
            shouldDelete = true;
            reason = 'Course file/video exceeded 2GB limit';
          }
        }

        if (shouldDelete) {
          console.warn(`[SECURITY] Deleting malicious Cloudinary upload: ${public_id}. Reason: ${reason}`);
          await this.cloudinaryMediaService.deleteFile(public_id, resource_type);
        } else {
          console.log(`[INFO] Valid Cloudinary upload received: ${public_id} (${bytes} bytes)`);
          // Future: Here you can log `public_id` to a database table like `pending_uploads` 
          // to later verify if the frontend actually linked it to a course/user,
          // and delete orphaned files via a CRON job.
        }
      }

      // Always return 200 OK so Cloudinary knows we received it
      res.status(200).send('OK')
    } catch (error) {
      console.error('Error handling Cloudinary webhook:', error)
      // Return 200 even on error to stop Cloudinary from retrying the same bad webhook forever
      res.status(200).send('Error processing webhook')
    }
  }
}

module.exports = WebhookController

const { Router } = require('express')
const express = require('express')

function createWebhookRoutes(webhookController) {
  const router = Router()

  // Cloudinary webhooks - no authentication middleware because Cloudinary calls this.
  // We use express.json() but also keep a reference to the raw body for signature verification.
  router.post(
    '/cloudinary',
    express.json({
      verify: (req, res, buf) => {
        // Store the raw string body buffer on the request so the controller can verify the signature
        req.rawBody = buf.toString()
      }
    }),
    webhookController.handleCloudinaryWebhook
  )

  return router
}

module.exports = createWebhookRoutes

/**
 * Vercel Serverless Handler
 *
 * This file serves as the catch-all handler for all /api/* requests on Vercel.
 * It imports and uses the Express app from server/src/app.js, which includes
 * all middleware (CORS, helmet, auth, etc.) and routes.
 */

require("dotenv").config();

const createApp = require("../server/src/app");
const createContainer = require("../server/src/container");

// Create container and app
const container = createContainer();
const app = createApp(container);

// Export Express app as default handler for Vercel
module.exports = app;

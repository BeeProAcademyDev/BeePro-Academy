const ALLOWED_ORIGINS = new Set(
  [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "https://bee-pro-academy.vercel.app",
    process.env.CLIENT_URL,
  ].filter(Boolean),
);

const ALLOWED_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Authorization,Content-Type,Accept,X-Requested-With";
const ALLOW_CREDENTIALS = "true";

if (process.env.NODE_ENV !== "production") {
  console.log("[CORS] Allowed origins:", Array.from(ALLOWED_ORIGINS));
}

export function applyCors(req, res) {
  const origin = req.headers?.origin;

  // Always set CORS headers for OPTIONS requests
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", ALLOW_CREDENTIALS);
  } else if (origin) {
    // Log rejected origins in development
    if (process.env.NODE_ENV !== "production") {
      console.warn("[CORS] Rejected origin:", origin);
    }
  }

  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.setHeader("Access-Control-Expose-Headers", "Content-Length");
  res.setHeader("Vary", "Origin");
}

export function handleOptions(req, res) {
  applyCors(req, res);
  res.setHeader("Content-Type", "text/plain");
  res.statusCode = 204;
  res.end();
}

function sendJsonError(res, status, message) {
  try {
    res.setHeader("Content-Type", "application/json");
    res.statusCode = status;
    res.end(JSON.stringify({ success: false, error: message }));
  } catch (e) {
    try {
      res.end('{"success":false,"error":"' + String(message) + "'}");
    } catch {}
  }
}

// Higher-order wrapper to centralize CORS + error handling for API handlers
export function withCors(handler) {
  return async function (req, res) {
    try {
      applyCors(req, res);
      if (req.method === "OPTIONS") return handleOptions(req, res);
      const result = await handler(req, res);
      return result;
    } catch (err) {
      try {
        applyCors(req, res);
      } catch (e) {}
      const msg = err && err.message ? err.message : String(err);
      sendJsonError(res, 500, msg);
    }
  };
}

export default applyCors;

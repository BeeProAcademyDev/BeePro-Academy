const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "https://bee-pro-academy.vercel.app",
]);

const ALLOWED_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Authorization, Content-Type, Accept, X-Requested-With";
const ALLOW_CREDENTIALS = "true";

export function applyCors(req, res) {
  const origin = req.headers?.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  res.setHeader("Access-Control-Allow-Credentials", ALLOW_CREDENTIALS);
  res.setHeader("Vary", "Origin, Access-Control-Request-Headers");
}

export function handleOptions(req, res) {
  applyCors(req, res);
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

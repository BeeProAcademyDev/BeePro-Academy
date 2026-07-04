const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
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

export default applyCors;

import { withCors } from "../../_cors.js";

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body)
      return resolve(
        typeof req.body === "string" ? req.body : JSON.stringify(req.body),
      );
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

export default withCors(async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        success: false,
        error: "SUPABASE_URL environment variable is missing.",
      }),
    );
  }
  if (!supabaseAnonKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        success: false,
        error: "SUPABASE_ANON_KEY environment variable is missing.",
      }),
    );
  }

  const target =
    supabaseUrl.replace(/\/+$/, "") + "/auth/v1/token?grant_type=password";
  const body = await readBody(req);

  const fetchRes = await fetch(target, {
    method: "POST",
    headers: {
      "Content-Type": req.headers["content-type"] || "application/json",
      apikey: supabaseAnonKey || "",
    },
    body: body || null,
  });

  const text = await fetchRes.text();
  const contentType =
    fetchRes.headers.get("content-type") || "application/json";
  res.statusCode = fetchRes.status;
  res.setHeader("Content-Type", contentType);
  return res.end(text);
});

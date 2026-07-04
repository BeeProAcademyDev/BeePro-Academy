import { applyCors, handleOptions } from "../../_cors.js";

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

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return handleOptions(req, res);

  try {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "Supabase URL not configured" }));
    }

    const target = supabaseUrl.replace(/\/+$/, "") + "/auth/v1/signup";
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
    applyCors(req, res);
    return res.end(text);
  } catch (err) {
    applyCors(req, res);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: err.message }));
  }
}

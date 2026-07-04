// Convenience re-export for API v1 handlers.
// Import this from any /api/v1/* handler to ensure consistent CORS/error behavior.
import { withCors } from "../_cors.js";

export default withCors;
export { withCors };

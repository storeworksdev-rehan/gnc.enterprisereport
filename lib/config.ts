/**
 * Centralised API base URLs for all client-side fetch calls.
 *
 * All requests go through the Next.js rewrite proxy defined in next.config.ts:
 *   /proxy/:path*  →  SERVER_API/:path*  (set in Azure App Service settings)
 *
 * Client components must NEVER reference process.env directly — use these
 * constants instead.
 */

/** For endpoints rooted at the backend root, e.g. /ITDashboard/GetStores */
export const API_BASE = "https://localhost:44356";

/** For endpoints under /api/…, e.g. /api/auth/login, /api/Tran/… */
export const API_BASE_API = "https://localhost:44356";

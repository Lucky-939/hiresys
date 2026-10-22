/**
 * Strict sanitizer for post-login redirects and return URLs.
 * Ensures redirects only navigate to local relative paths within the application.
 *
 * Rules:
 * 1. Must be a non-empty string starting with a single '/'
 * 2. Reject protocol-relative URLs starting with '//' or '/\'
 * 3. Reject any schemes (e.g. http:, https:, javascript:, data:, vbscript:)
 * 4. Reject backslashes '\' anywhere (raw or decoded)
 * 5. Reject URL-encoded bypasses (%2F%2F, %5C, etc.)
 * 6. Fallback safely to '/dashboard' on any invalid or suspicious input.
 */
export function sanitizeRedirect(url: string | null | undefined): string {
  const fallback = "/dashboard";
  if (!url || typeof url !== "string") return fallback;

  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // Reject raw backslashes immediately
  if (trimmed.includes("\\")) return fallback;

  // Iteratively decode to catch nested percent-encoding (e.g. %252F -> %2F -> /)
  let decoded = trimmed;
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      // Malformed URI encoding
      return fallback;
    }
  }

  // Reject any backslashes in decoded form
  if (decoded.includes("\\")) return fallback;

  // Must start with exactly one '/' and NOT followed by another '/' or '\'
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.startsWith("/\\")) {
    return fallback;
  }

  // Check raw string as well
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Reject any scheme/protocol before path/query/hash or anywhere (e.g. "javascript:", "http:", "https:")
  const pathPart = decoded.split(/[?#]/)[0];
  if (pathPart.includes(":") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) {
    return fallback;
  }

  // Reject control characters or newlines
  if (/[\x00-\x1F\x7F]/.test(decoded)) {
    return fallback;
  }

  return trimmed;
}

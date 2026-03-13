const STORAGE_KEY = "jobguard-visitor-id";
const COOKIE_NAME = "jobguard-vid";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(STORAGE_KEY);
  if (id && UUID_REGEX.test(id)) return id;

  id = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, id);
  document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
  return id;
}

export function getVisitorIdFromRequest(request: Request): string | null {
  const headerVal = request.headers.get("x-visitor-id");
  if (headerVal && UUID_REGEX.test(headerVal)) return headerVal;

  const cookies = request.headers.get("cookie") ?? "";
  const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (match && UUID_REGEX.test(match[1])) return match[1];

  return null;
}

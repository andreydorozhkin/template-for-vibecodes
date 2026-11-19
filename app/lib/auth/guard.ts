export function redirectTarget(pathname: string, isAuthenticated: boolean): string | null {
  if (!isAuthenticated && pathname.startsWith("/notes")) {
    return "/login";
  }
  if (isAuthenticated && pathname === "/login") {
    return "/notes";
  }
  return null;
}

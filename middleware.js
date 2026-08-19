export const config = { matcher: "/(.*)" };

export default function middleware() {
  // Maintenance mode disabled — all traffic passes through
  return;
}

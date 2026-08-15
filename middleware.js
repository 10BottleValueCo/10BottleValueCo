// Vercel Edge Middleware — maintenance page for all visitors
// Owner bypass: visit /?preview=tF1s0-gTGGOmdNvF to access the real site

const BYPASS_SECRET = "tF1s0-gTGGOmdNvF";
const COOKIE_NAME   = "tbv_preview";
const COOKIE_TTL    = 60 * 60 * 24 * 7; // 7 days

export const config = { matcher: "/(.*)" };

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Site Under Maintenance — 10 Bottle Value Co.</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0a0a0f; color: #e2e2f0;
      min-height: 100vh; display: flex; align-items: center;
      justify-content: center; padding: 24px;
    }
    .card {
      background: #13131a; border: 1px solid #1e1e2e; border-radius: 20px;
      padding: 56px 48px; max-width: 520px; width: 100%; text-align: center;
      box-shadow: 0 0 80px rgba(124,92,252,0.08);
    }
    .icon {
      width: 72px; height: 72px;
      background: linear-gradient(135deg,#7c5cfc22,#a78bfa11);
      border: 1px solid #7c5cfc44; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 32px; font-size: 32px;
    }
    h1 {
      font-size: 26px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 12px;
      background: linear-gradient(135deg,#e2e2f0,#a78bfa);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .subtitle { color: #6b6b8a; font-size: 15px; line-height: 1.6; margin-bottom: 36px; }
    .badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: #7c5cfc18; border: 1px solid #7c5cfc44;
      border-radius: 999px; padding: 8px 18px; font-size: 13px; color: #a78bfa; font-weight: 500;
    }
    .dot {
      width: 8px; height: 8px; border-radius: 50%; background: #7c5cfc;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
    .footer { margin-top: 40px; font-size: 13px; color: #6b6b8a; }
    .footer a { color: #a78bfa; text-decoration: none; }
    @media(max-width:480px){ .card{padding:40px 24px} h1{font-size:22px} }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔧</div>
    <h1>We'll be right back</h1>
    <p class="subtitle">
      10 Bottle Value Co. is currently undergoing scheduled maintenance.<br/>
      We apologize for the inconvenience and will be back very soon.
    </p>
    <div class="badge"><div class="dot"></div>Maintenance in progress</div>
    <div class="footer">
      Questions? <a href="mailto:support@10bottlevalue.co">support@10bottlevalue.co</a>
    </div>
  </div>
</body>
</html>`;

export default function middleware(request) {
  const url  = new URL(request.url);
  const cookies = request.headers.get("cookie") || "";

  // Check bypass cookie
  const hasCookie = cookies
    .split(";")
    .some(c => c.trim() === `${COOKIE_NAME}=${BYPASS_SECRET}`);

  // Check bypass query param
  const paramVal = url.searchParams.get("preview");

  if (hasCookie) {
    // Already authenticated — pass through
    return;
  }

  if (paramVal === BYPASS_SECRET) {
    // Set bypass cookie and redirect to clean URL (without ?preview=...)
    url.searchParams.delete("preview");
    const target = url.toString();
    return new Response(null, {
      status: 302,
      headers: {
        Location: target,
        "Set-Cookie": `${COOKIE_NAME}=${BYPASS_SECRET}; Path=/; Max-Age=${COOKIE_TTL}; HttpOnly; SameSite=Lax; Secure`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Everyone else — maintenance page
  return new Response(MAINTENANCE_HTML, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "3600",
      "Cache-Control": "no-store",
    },
  });
}

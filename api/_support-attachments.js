import { createHash, randomBytes, randomUUID } from "node:crypto";

const BUCKET = "chat-images";
const ADMIN_EMAIL = "support@10bottlevalue.co";
const GUEST_COOKIE = "tbv_guest_attachment";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const SIGNED_URL_TTL_SECONDS = 3600;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const DOCUMENT_TYPES = {
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  rtf: "application/rtf",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
};

const MEDIA_TYPES = new Set([
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/tiff",
  "image/webp",
  "video/3gpp",
  "video/mp4",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "video/x-matroska",
  "video/x-msvideo",
]);

const MIME_EXTENSIONS = {
  "application/pdf": "pdf",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/tiff": "tif",
  "image/webp": "webp",
  "video/3gpp": "3gp",
  "video/mp4": "mp4",
  "video/mpeg": "mpeg",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-m4v": "m4v",
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi",
  ...Object.fromEntries(
    Object.entries(DOCUMENT_TYPES).map(([extension, mimeType]) => [
      mimeType,
      extension,
    ]),
  ),
};

class AttachmentError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function reject(res, status, error) {
  res.status(status).json({ ok: false, error });
}

function setNoStore(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Cookie, Authorization");
}

function readBody(req) {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      const parsed = JSON.parse(req.body);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {}
  }
  return {};
}

function getHeader(req, name) {
  const headers = req.headers || {};
  const value = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(value) ? value[0] : String(value || "");
}

function getAuthorizationToken(req) {
  const authorization = getHeader(req, "authorization").trim();
  if (!authorization) return null;
  const token = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim();
  if (!token) throw new AttachmentError(401, "Sign in to access support attachments.");
  return token;
}

function getSupabaseUrl() {
  return String(
    process.env.SUPPORT_ATTACHMENTS_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      "",
  ).replace(/\/+$/, "");
}

function getServiceConfig() {
  const url = getSupabaseUrl();
  const usesDedicatedProject = Boolean(
    process.env.SUPPORT_ATTACHMENTS_SUPABASE_URL,
  );
  const key = usesDedicatedProject
    ? process.env.SUPPORT_ATTACHMENTS_SERVICE_ROLE_KEY || ""
    : process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new AttachmentError(
      503,
      "Support attachments are not configured on the server.",
    );
  }
  return { url, key };
}

async function authenticateRequest(req) {
  const token = getAuthorizationToken(req);
  if (!token) return null;

  const url = getSupabaseUrl();
  const usesDedicatedProject = Boolean(
    process.env.SUPPORT_ATTACHMENTS_SUPABASE_URL,
  );
  const anonKey = usesDedicatedProject
    ? process.env.SUPPORT_ATTACHMENTS_ANON_KEY || ""
    : process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !anonKey) {
    throw new AttachmentError(503, "Support sign-in is unavailable.");
  }

  let response;
  try {
    response = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new AttachmentError(503, "Could not verify your sign-in.");
  }
  if (!response.ok) {
    throw new AttachmentError(401, "Your support sign-in has expired.");
  }

  const user = await response.json().catch(() => null);
  const email = String(user?.email || "").trim().toLowerCase();
  const verified = Boolean(user?.email_confirmed_at || user?.confirmed_at);
  if (!verified || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AttachmentError(403, "Verify your email to access support attachments.");
  }
  return { email, isAdmin: email === ADMIN_EMAIL };
}

function parseCookie(req, name) {
  const cookieHeader = getHeader(req, "cookie");
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return "";
    }
  }
  return "";
}

function newGuestCapability() {
  return randomBytes(32).toString("base64url");
}

function hashCapability(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeObjectPath(path) {
  if (
    typeof path !== "string" ||
    path.length < 1 ||
    path.length > 200 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    !/^[A-Za-z0-9._/-]+$/.test(path)
  ) {
    return false;
  }
  const segments = path.split("/");
  return (
    segments.length <= 8 &&
    segments.every(
      (segment) =>
        segment.length > 0 &&
        segment !== "." &&
        segment !== ".." &&
        !segment.includes(".."),
    )
  );
}

export function extractSupportAttachmentPath(reference, supabaseUrl = getSupabaseUrl()) {
  if (typeof reference !== "string" || !reference.trim()) return null;
  const value = reference.trim();
  let path = value;

  if (/^https?:\/\//i.test(value)) {
    let parsed;
    let configuredOrigin;
    try {
      parsed = new URL(value);
      configuredOrigin = new URL(supabaseUrl).origin;
    } catch {
      return null;
    }
    if (parsed.origin !== configuredOrigin) return null;

    const prefixes = [
      `/storage/v1/object/public/${BUCKET}/`,
      `/storage/v1/object/sign/${BUCKET}/`,
    ];
    const prefix = prefixes.find((candidate) =>
      parsed.pathname.startsWith(candidate),
    );
    if (!prefix) return null;
    try {
      path = decodeURIComponent(parsed.pathname.slice(prefix.length));
    } catch {
      return null;
    }
  }

  return safeObjectPath(path) ? path : null;
}

function getReferencedPaths(message, supabaseUrl) {
  const paths = new Set();
  if (typeof message !== "string") return paths;
  const tagPattern =
    /\[(?:IMAGE|VIDEO):([^\]]+)\]|\[FILE:(.+):([^\]]*)\]/g;
  for (const match of message.matchAll(tagPattern)) {
    const reference = match[1] || match[2];
    const path = extractSupportAttachmentPath(reference, supabaseUrl);
    if (path) paths.add(path);
  }
  return paths;
}

function getUploadMetadata(body) {
  const fileName =
    typeof body.fileName === "string" ? body.fileName.trim() : "";
  const declaredType =
    typeof body.contentType === "string"
      ? body.contentType.trim().toLowerCase().split(";")[0]
      : "";
  const size = Number(body.size);
  if (
    !fileName ||
    fileName.length > 255 ||
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > MAX_FILE_SIZE
  ) {
    throw new AttachmentError(
      400,
      "Choose a supported file under 100 MB.",
    );
  }

  const extension =
    fileName.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase() || "";
  const documentType = DOCUMENT_TYPES[extension];
  const contentType = documentType || declaredType;
  if (
    (documentType && declaredType && declaredType !== documentType) ||
    (!documentType && !MEDIA_TYPES.has(contentType))
  ) {
    throw new AttachmentError(
      400,
      "Choose an image, video, or supported document file.",
    );
  }

  const safeExtension = MIME_EXTENSIONS[contentType] || "";
  if (!safeExtension) {
    throw new AttachmentError(400, "The file type could not be identified.");
  }
  return { contentType, extension: safeExtension, size };
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function serviceRequest(path, options = {}) {
  const { url, key } = getServiceConfig();
  let response;
  try {
    response = await fetch(`${url}${path}`, {
      method: options.method || "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new AttachmentError(503, "Support attachment storage is unavailable.");
  }
  const data = await readJsonResponse(response);
  if (!response.ok) {
    throw new AttachmentError(503, "Support attachment storage is unavailable.");
  }
  return data;
}

async function storageRequest(path, body) {
  const data = await serviceRequest(`/storage/v1${path}`, {
    method: "POST",
    body,
  });
  return data;
}

function getStorageUrl(relativeUrl, expectedOperation) {
  const { url } = getServiceConfig();
  let parsed;
  try {
    parsed = new URL(`${url}/storage/v1${relativeUrl}`);
  } catch {
    throw new AttachmentError(503, "Support attachment storage is unavailable.");
  }
  const configuredOrigin = new URL(url).origin;
  if (
    parsed.origin !== configuredOrigin ||
    !parsed.pathname.startsWith(
      `/storage/v1/object/${expectedOperation}/${BUCKET}/`,
    )
  ) {
    throw new AttachmentError(503, "Support attachment storage is unavailable.");
  }
  return parsed.toString();
}

function uploadCookie(value) {
  return [
    `${GUEST_COOKIE}=${encodeURIComponent(value)}`,
    `Path=/api/support-attachments/`,
    `Max-Age=${GUEST_COOKIE_MAX_AGE}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
  ].join("; ");
}

function makeCookieAccessToken(req) {
  const value = parseCookie(req, GUEST_COOKIE);
  return /^[A-Za-z0-9_-]{40,64}$/.test(value) ? value : "";
}

function encodedObjectPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function readAttachmentInputs(body) {
  if (
    !Array.isArray(body.attachments) ||
    body.attachments.length < 1 ||
    body.attachments.length > 100
  ) {
    throw new AttachmentError(400, "Choose one or more support attachments.");
  }
  return body.attachments.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      typeof item.path !== "string" ||
      !item.path.trim() ||
      item.path.length > 2048
    ) {
      throw new AttachmentError(400, "An attachment reference is invalid.");
    }
    const messageId =
      item.messageId === undefined ? undefined : Number(item.messageId);
    const field = item.field;
    if (
      (messageId !== undefined &&
        (!Number.isSafeInteger(messageId) || messageId < 1)) ||
      (field !== undefined && field !== "message" && field !== "admin_reply")
    ) {
      throw new AttachmentError(400, "An attachment reference is invalid.");
    }
    return {
      reference: item.path,
      objectPath: extractSupportAttachmentPath(item.path),
      messageId,
      field,
    };
  });
}

async function getMessageRows(ids) {
  const params = new URLSearchParams({
    select: "id,email,message,admin_reply",
    id: `in.(${ids.join(",")})`,
  });
  const rows = await serviceRequest(
    `/rest/v1/contact_messages?${params.toString()}`,
  );
  if (!Array.isArray(rows)) {
    throw new AttachmentError(503, "Support messages could not be checked.");
  }
  return rows;
}

async function getGuestOwnedPaths(paths, capabilityHash) {
  if (!paths.length) return new Set();
  const params = new URLSearchParams({
    select: "object_path",
    object_path: `in.(${paths.join(",")})`,
    guest_capability_hash: `eq.${capabilityHash}`,
  });
  const rows = await serviceRequest(
    `/rest/v1/support_chat_attachments?${params.toString()}`,
  );
  if (!Array.isArray(rows)) {
    throw new AttachmentError(503, "Guest attachment access could not be checked.");
  }
  return new Set(rows.map((row) => String(row.object_path)));
}

async function createSignedReadUrls(paths) {
  if (!paths.length) return new Map();
  const data = await storageRequest(`/object/sign/${BUCKET}`, {
    expiresIn: SIGNED_URL_TTL_SECONDS,
    paths,
  });
  if (!Array.isArray(data)) {
    throw new AttachmentError(503, "Support attachment storage is unavailable.");
  }
  const signedByPath = new Map();
  for (const item of data) {
    if (
      typeof item?.path === "string" &&
      typeof item?.signedURL === "string" &&
      item.signedURL
    ) {
      signedByPath.set(item.path, getStorageUrl(item.signedURL, "sign"));
    }
  }
  return signedByPath;
}

export async function handleSupportAttachmentUpload(req, res) {
  setNoStore(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    reject(res, 405, "Method not allowed.");
    return;
  }

  try {
    const body = readBody(req);
    const { contentType, extension, size } = getUploadMetadata(body);
    const identity = await authenticateRequest(req);
    const path = `${randomUUID()}.${extension}`;
    let guestCapability = "";
    let cookieToSet = "";
    if (!identity) {
      const existingCapability = makeCookieAccessToken(req);
      if (existingCapability) {
        guestCapability = existingCapability;
      } else {
        const newCapability = newGuestCapability();
        guestCapability = newCapability;
        cookieToSet = uploadCookie(newCapability);
      }
    }

    const signedUpload = await storageRequest(
      `/object/upload/sign/${BUCKET}/${encodedObjectPath(path)}`,
      {},
    );
    if (typeof signedUpload?.url !== "string" || !signedUpload.url) {
      throw new AttachmentError(503, "Support attachment storage is unavailable.");
    }
    const uploadUrl = getStorageUrl(signedUpload.url, "upload/sign");

    await serviceRequest("/rest/v1/support_chat_attachments", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: {
        object_path: path,
        guest_capability_hash: guestCapability
          ? hashCapability(guestCapability)
          : null,
        content_type: contentType,
        byte_size: size,
      },
    });

    if (cookieToSet) res.setHeader("Set-Cookie", cookieToSet);
    res.status(200).json({ ok: true, path, uploadUrl, contentType });
  } catch (error) {
    const status = error instanceof AttachmentError ? error.status : 503;
    if (status >= 500) {
      req.log?.error(
        { statusCode: error?.status || 0 },
        "Support attachment upload request failed",
      );
    }
    reject(
      res,
      status,
      error instanceof AttachmentError
        ? error.message
        : "Support attachment upload is temporarily unavailable.",
    );
  }
}

export async function handleSupportAttachmentAccess(req, res) {
  setNoStore(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    reject(res, 405, "Method not allowed.");
    return;
  }

  try {
    const items = readAttachmentInputs(readBody(req));
    if (items.some((item) => !item.objectPath)) {
      throw new AttachmentError(400, "An attachment reference is invalid.");
    }

    const identity = await authenticateRequest(req);
    const pathsByReference = new Map();
    if (identity) {
      if (items.some((item) => item.messageId === undefined || !item.field)) {
        throw new AttachmentError(400, "A message is required to access this attachment.");
      }
      const ids = [...new Set(items.map((item) => item.messageId))];
      const rows = await getMessageRows(ids);
      const rowById = new Map(rows.map((row) => [Number(row.id), row]));

      for (const item of items) {
        const row = rowById.get(item.messageId);
        if (
          !row ||
          (!identity.isAdmin &&
            String(row.email || "").trim().toLowerCase() !== identity.email)
        ) {
          throw new AttachmentError(403, "That support message is not available.");
        }
        const referenced = getReferencedPaths(row[item.field], getSupabaseUrl());
        if (!referenced.has(item.objectPath)) {
          throw new AttachmentError(403, "That attachment is not part of this message.");
        }
        pathsByReference.set(item.reference, item.objectPath);
      }
    } else {
      if (
        items.some(
          (item) => item.messageId !== undefined || item.field !== undefined,
        )
      ) {
        throw new AttachmentError(401, "Sign in to access this support message.");
      }
      const capability = makeCookieAccessToken(req);
      if (!capability) {
        throw new AttachmentError(401, "Guest attachment access has expired.");
      }
      const ownedPaths = await getGuestOwnedPaths(
        [...new Set(items.map((item) => item.objectPath))],
        hashCapability(capability),
      );
      for (const item of items) {
        if (!ownedPaths.has(item.objectPath)) {
          throw new AttachmentError(403, "That attachment is not available.");
        }
        pathsByReference.set(item.reference, item.objectPath);
      }
    }

    const signedByPath = await createSignedReadUrls([
      ...new Set(pathsByReference.values()),
    ]);
    const attachments = items.flatMap((item) => {
      const url = signedByPath.get(pathsByReference.get(item.reference));
      return url ? [{ reference: item.reference, url }] : [];
    });
    res.status(200).json({ ok: true, attachments });
  } catch (error) {
    const status = error instanceof AttachmentError ? error.status : 503;
    if (status >= 500) {
      req.log?.error(
        { statusCode: error?.status || 0 },
        "Support attachment access request failed",
      );
    }
    reject(
      res,
      status,
      error instanceof AttachmentError
        ? error.message
        : "Support attachments are temporarily unavailable.",
    );
  }
}

import { Router, type IRouter, type Request, type Response } from "express";
import {
  RequestSupportAttachmentAccessUrlsBody,
  RequestSupportAttachmentAccessUrlsResponse,
  RequestSupportAttachmentUploadUrlBody,
  RequestSupportAttachmentUploadUrlResponse,
} from "@workspace/api-zod";

type ResponseAdapter = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseAdapter;
  json(body: unknown): ResponseAdapter;
};

type SupportAttachmentHandlers = {
  handleSupportAttachmentUpload: (
    req: Request,
    res: ResponseAdapter,
  ) => Promise<unknown>;
  handleSupportAttachmentAccess: (
    req: Request,
    res: ResponseAdapter,
  ) => Promise<unknown>;
};

const router: IRouter = Router();

function isAttachmentError(
  value: unknown,
): value is { ok: false; error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === false &&
    "error" in value &&
    typeof value.error === "string" &&
    value.error.length > 0
  );
}

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ ok: false, error: message });
}

async function invokeHandler(
  req: Request,
  res: Response,
  handlerPath: string,
  handlerName: keyof SupportAttachmentHandlers,
  responseSchema:
    | typeof RequestSupportAttachmentUploadUrlResponse
    | typeof RequestSupportAttachmentAccessUrlsResponse,
): Promise<void> {
  let responseStatus = 200;
  let responseBody: unknown;
  const adapter: ResponseAdapter = {
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    status(code) {
      responseStatus = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  try {
    const handlerUrl = new URL(handlerPath, import.meta.url);
    const module = (await import(handlerUrl.href)) as SupportAttachmentHandlers;
    await module[handlerName](req, adapter);
  } catch (error) {
    req.log.error({ err: error }, "Support attachment handler failed");
    sendError(res, 503, "Support attachments are temporarily unavailable.");
    return;
  }

  if (responseStatus === 200) {
    const parsed = responseSchema.safeParse(responseBody);
    if (!parsed.success) {
      req.log.error(
        { errors: parsed.error.message },
        "Support attachment handler returned an invalid response",
      );
      sendError(res, 502, "The support attachment result could not be verified.");
      return;
    }
    res.status(200).json(parsed.data);
    return;
  }

  if (!isAttachmentError(responseBody)) {
    req.log.error(
      { statusCode: responseStatus },
      "Support attachment handler returned an invalid error response",
    );
    sendError(res, 502, "The support attachment service returned an invalid error.");
    return;
  }
  res.status(responseStatus).json(responseBody);
}

router.post(
  "/support-attachments/upload-url",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = RequestSupportAttachmentUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "Check the file and try again.");
      return;
    }
    req.body = parsed.data;
    await invokeHandler(
      req,
      res,
      "../../../api/_support-attachments.js",
      "handleSupportAttachmentUpload",
      RequestSupportAttachmentUploadUrlResponse,
    );
  },
);

router.post(
  "/support-attachments/access-urls",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = RequestSupportAttachmentAccessUrlsBody.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "Check the attachment references and try again.");
      return;
    }
    req.body = parsed.data;
    await invokeHandler(
      req,
      res,
      "../../../api/_support-attachments.js",
      "handleSupportAttachmentAccess",
      RequestSupportAttachmentAccessUrlsResponse,
    );
  },
);

export default router;

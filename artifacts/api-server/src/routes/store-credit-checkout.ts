import { Router, type IRouter, type Request, type Response } from "express";
import {
  StoreCreditCheckoutBody,
  StoreCreditCheckoutResponse,
} from "@workspace/api-zod";

type CheckoutResponseAdapter = {
  setHeader(name: string, value: string): void;
  status(code: number): CheckoutResponseAdapter;
  json(body: unknown): CheckoutResponseAdapter;
};

type CheckoutHandler = (
  req: Request,
  res: CheckoutResponseAdapter,
) => Promise<unknown>;

const router: IRouter = Router();

function sendCheckoutError(
  res: Response,
  status: number,
  message: string,
): void {
  res.status(status).json({ ok: false, error: message });
}

function isCheckoutError(
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

router.post(
  "/store-credit-checkout",
  async (req: Request, res: Response): Promise<void> => {
    const parsedBody = StoreCreditCheckoutBody.safeParse(req.body);
    if (!parsedBody.success) {
      sendCheckoutError(res, 400, parsedBody.error.message);
      return;
    }
    req.body = parsedBody.data;

    let responseStatus = 200;
    let responseBody: unknown;
    const responseAdapter: CheckoutResponseAdapter = {
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
      // The same handler is also deployed as the Vercel serverless function.
      // Keeping one implementation prevents pricing or debit logic from diverging.
      const handlerUrl = new URL(
        "../../../api/store-credit-checkout.js",
        import.meta.url,
      );
      const module = (await import(handlerUrl.href)) as {
        default: CheckoutHandler;
      };
      await module.default(req, responseAdapter);
    } catch (error) {
      req.log.error({ err: error }, "Store Credit checkout adapter failed");
      sendCheckoutError(
        res,
        503,
        "Store Credit checkout is temporarily unavailable.",
      );
      return;
    }

    if (responseStatus === 200) {
      const parsedResponse = StoreCreditCheckoutResponse.safeParse(responseBody);
      if (!parsedResponse.success) {
        req.log.error(
          { errors: parsedResponse.error.message },
          "Store Credit handler returned an invalid response",
        );
        sendCheckoutError(res, 502, "The checkout result could not be verified.");
        return;
      }
      res.status(200).json(parsedResponse.data);
      return;
    }

    if (!isCheckoutError(responseBody)) {
      req.log.error(
        { statusCode: responseStatus },
        "Store Credit handler returned an invalid error response",
      );
      sendCheckoutError(
        res,
        502,
        "The checkout service returned an invalid response.",
      );
      return;
    }
    res.status(responseStatus).json(responseBody);
  },
);

export default router;

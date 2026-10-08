import { Router, type IRouter, type Request, type Response } from "express";
import {
  LookupPublicPromoCodeQueryParams,
  LookupPublicPromoCodeResponse,
} from "@workspace/api-zod";

type ResponseAdapter = {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseAdapter;
  json(body: unknown): ResponseAdapter;
};

type PromoCodeHandler = (
  req: Request,
  res: ResponseAdapter,
) => Promise<unknown>;

const router: IRouter = Router();

router.get(
  "/public-promo-code",
  async (req: Request, res: Response): Promise<void> => {
    const parsedQuery = LookupPublicPromoCodeQueryParams.safeParse(req.query);
    if (!parsedQuery.success) {
      res.status(400).json({ ok: false, error: "Enter a valid promo code." });
      return;
    }

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
      const handlerUrl = new URL(
        "../../../api/public-promo-code.js",
        import.meta.url,
      );
      const module = (await import(handlerUrl.href)) as {
        default: PromoCodeHandler;
      };
      await module.default(req, adapter);
    } catch (error) {
      req.log.error({ err: error }, "Public promo-code handler failed");
      res.status(503).json({
        ok: false,
        error: "Promo code validation is temporarily unavailable.",
      });
      return;
    }

    if (responseStatus === 200) {
      const parsedResponse = LookupPublicPromoCodeResponse.safeParse(
        responseBody,
      );
      if (!parsedResponse.success) {
        req.log.error(
          { errors: parsedResponse.error.message },
          "Public promo-code handler returned an invalid response",
        );
        res.status(502).json({
          ok: false,
          error: "The promo code result could not be verified.",
        });
        return;
      }
      res.status(200).json(parsedResponse.data);
      return;
    }

    res.status(responseStatus).json(responseBody);
  },
);

export default router;

import { Router } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import { sensitiveReadRateLimit } from "../middleware/rateLimit.js";
import {
  findReferralCodeForAccount,
  listStudentsForAccount
} from "../services/referralService.js";

const router = Router();

// Contrato v2: funciona con cuentas de uno o varios luchadores (el dojo es de la cuenta).
router.get("/me", requireAuth, sensitiveReadRateLimit, async (request, response, next) => {
  try {
    const referralCode = await findReferralCodeForAccount(request.user);
    if (!referralCode) {
      return next(
        new ApiError(404, "FIGHTER_NOT_FOUND", "Esta cuenta todavía no tiene un luchador.")
      );
    }

    return response.status(200).json({
      referralCode,
      students: await listStudentsForAccount(request.user._id)
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

import { Router } from "express";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import {
  fighterCreationAccountRateLimit,
  fighterCreationIpRateLimit,
  sensitiveReadRateLimit
} from "../middleware/rateLimit.js";
import {
  createOwnedFighter,
  FighterNameConflictError,
  getActiveFighter,
  listOwnedFighters,
  selectActiveFighter
} from "../services/fighterManagementService.js";
import {
  validateFighterListQuery,
  validateFighterSelection,
  validateManagedFighterCreation
} from "../validators/fighterManagement.js";

const router = Router();

router.get("/", requireAuth, sensitiveReadRateLimit, async (request, response, next) => {
  const pagination = validateFighterListQuery(request.query);
  if (!pagination) {
    return next(
      new ApiError(
        400,
        "INVALID_PAGINATION",
        "Usa únicamente page y limit con valores enteros positivos; el límite máximo es 50."
      )
    );
  }

  try {
    const result = await listOwnedFighters(request.user._id, pagination);
    return response.status(200).json(result);
  } catch (error) {
    return next(error);
  }
});

router.get(
  "/active",
  requireAuth,
  sensitiveReadRateLimit,
  async (request, response, next) => {
    try {
      return response.status(200).json(await getActiveFighter(request.user._id));
    } catch (error) {
      return next(error);
    }
  }
);

router.put(
  "/active",
  requireAuth,
  sensitiveReadRateLimit,
  async (request, response, next) => {
    const selection = validateFighterSelection(request.body);
    if (!selection) {
      return next(
        new ApiError(
          400,
          "INVALID_FIGHTER_SELECTION",
          "Envía únicamente el identificador de un luchador válido."
        )
      );
    }

    try {
      return response
        .status(200)
        .json(await selectActiveFighter(request.user._id, selection.fighterId));
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/",
  requireAuth,
  fighterCreationIpRateLimit,
  fighterCreationAccountRateLimit,
  async (request, response, next) => {
    const fighterData = validateManagedFighterCreation(request.body);
    if (!fighterData) {
      return next(
        new ApiError(
          400,
          "INVALID_FIGHTER_DATA",
          "Envía un nombre de luchador de entre 3 y 18 caracteres, un requestId válido y, opcionalmente, una apariencia permitida."
        )
      );
    }

    try {
      const result = await createOwnedFighter(request.user._id, fighterData);
      return response.status(result.created ? 201 : 200).json({
        fighter: result.fighter
      });
    } catch (error) {
      if (error instanceof FighterNameConflictError) {
        return next(
          new ApiError(409, "FIGHTER_NAME_TAKEN", error.message)
        );
      }
      if (error?.code === 11000) {
        const duplicateFields = error.keyPattern ?? error.keyValue ?? {};
        if (Object.hasOwn(duplicateFields, "referralCode")) {
          return next(
            new ApiError(
              409,
              "FIGHTER_CODE_CONFLICT",
              "No se pudo generar un código de invitación único."
            )
          );
        }
      }
      return next(error);
    }
  }
);

export default router;

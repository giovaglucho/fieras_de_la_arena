import { Router } from "express";
import bcrypt from "bcryptjs";
import { ApiError } from "../middleware/errorHandler.js";
import requireAuth from "../middleware/requireAuth.js";
import {
  loginRateLimit,
  registrationRateLimit,
  sensitiveReadRateLimit
} from "../middleware/rateLimit.js";
import { SESSION_COOKIE_NAME } from "../middleware/session.js";
import Fighter from "../models/Fighter.js";
import User from "../models/User.js";
import { validateLogin } from "../validators/login.js";
import { validateRegistration } from "../validators/registration.js";

const BCRYPT_SALT_ROUNDS = 12;
const router = Router();

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email
  };
}

router.get("/me", requireAuth, sensitiveReadRateLimit, (request, response) => {
  return response.status(200).json({ user: toPublicUser(request.user) });
});

router.post("/login", loginRateLimit, async (request, response, next) => {
  const login = validateLogin(request.body);

  if (!login) {
    return next(
      new ApiError(400, "INVALID_LOGIN_DATA", "Los datos de inicio de sesión no son válidos.")
    );
  }

  try {
    const user = await User.findOne({
      $or: [{ username: login.identifier }, { email: login.identifier }]
    }).select("+passwordHash");

    if (
      !user ||
      user.status !== "active" ||
      !(await bcrypt.compare(login.password, user.passwordHash))
    ) {
      return next(
        new ApiError(401, "INVALID_CREDENTIALS", "El usuario o la contraseña no son válidos.")
      );
    }

    user.lastLoginAt = new Date();
    await user.save();

    await new Promise((resolve, reject) => {
      request.session.regenerate((error) => (error ? reject(error) : resolve()));
    });
    request.session.userId = user._id.toString();
    await new Promise((resolve, reject) => {
      request.session.save((error) => (error ? reject(error) : resolve()));
    });

    return response.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", async (request, response, next) => {
  if (!request.session.userId) {
    return next(
      new ApiError(401, "AUTHENTICATION_REQUIRED", "Debes iniciar sesión para cerrar sesión.")
    );
  }

  try {
    await new Promise((resolve, reject) => {
      request.session.destroy((error) => (error ? reject(error) : resolve()));
    });

    response.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.post("/register", registrationRateLimit, async (request, response, next) => {
  const registration = validateRegistration(request.body);

  if (!registration) {
    return next(
      new ApiError(400, "INVALID_REGISTRATION_DATA", "Los datos de registro no son válidos.")
    );
  }

  try {
    const passwordHash = await bcrypt.hash(registration.password, BCRYPT_SALT_ROUNDS);
    const user = new User({
      username: registration.username,
      email: registration.email,
      passwordHash
    });

    if (registration.referralCode) {
      const fighter = await Fighter.findOne({ referralCode: registration.referralCode })
        .select("userId");
      const referrer = fighter
        ? await User.findById(fighter.userId).select("_id referredByUserId")
        : null;

      if (
        !referrer ||
        referrer._id.equals(user._id) ||
        referrer.referredByUserId?.equals(user._id)
      ) {
        return next(
          new ApiError(
            400,
            "INVALID_REFERRAL_CODE",
            "El código de invitación no es válido."
          )
        );
      }

      user.referredByUserId = referrer._id;
    }

    await user.save();

    return response.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    if (error?.code === 11000) {
      return next(
        new ApiError(
          409,
          "REGISTRATION_CONFLICT",
          "No se pudo completar el registro con esos datos."
        )
      );
    }

    return next(error);
  }
});

export default router;

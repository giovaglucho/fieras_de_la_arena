import { Router } from "express";
import bcrypt from "bcryptjs";
import { ApiError } from "../middleware/errorHandler.js";
import User from "../models/User.js";
import { validateRegistration } from "../validators/registration.js";

const BCRYPT_SALT_ROUNDS = 12;
const router = Router();

router.post("/register", async (request, response, next) => {
  const registration = validateRegistration(request.body);

  if (!registration) {
    return next(
      new ApiError(400, "INVALID_REGISTRATION_DATA", "Los datos de registro no son válidos.")
    );
  }

  try {
    const passwordHash = await bcrypt.hash(registration.password, BCRYPT_SALT_ROUNDS);
    const user = await User.create({
      username: registration.username,
      email: registration.email,
      passwordHash
    });

    return response.status(201).json({
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email
      }
    });
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

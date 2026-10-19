import mongoose from "mongoose";
import { ApiError } from "./errorHandler.js";
import User from "../models/User.js";

export default async function requireAuth(request, response, next) {
  const userId = request.session?.userId;

  if (!mongoose.isObjectIdOrHexString(userId)) {
    return next(
      new ApiError(
        401,
        "AUTHENTICATION_REQUIRED",
        "Debes iniciar sesión para acceder a este recurso."
      )
    );
  }

  try {
    const user = await User.findById(userId);

    if (!user || user.status !== "active") {
      return next(
        new ApiError(
          401,
          "AUTHENTICATION_REQUIRED",
          "Debes iniciar sesión para acceder a este recurso."
        )
      );
    }

    request.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

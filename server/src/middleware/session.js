import MongoStore from "connect-mongo";
import session from "express-session";

const SESSION_COOKIE_NAME = "fieras.sid";
const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret || Buffer.byteLength(sessionSecret, "utf8") < 32) {
  throw new Error("SESSION_SECRET debe estar configurada y tener al menos 32 bytes.");
}

if (!process.env.MONGODB_URI) {
  throw new Error("Falta configurar la variable MONGODB_URI.");
}

export const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  collectionName: "sessions"
});

const sessionMiddleware = session({
  name: SESSION_COOKIE_NAME,
  secret: sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/"
  }
});

export { SESSION_COOKIE_NAME };
export default sessionMiddleware;

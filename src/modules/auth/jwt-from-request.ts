import { ExtractJwt } from "passport-jwt";

export const extractAccessTokenFromBearerHeader =
  ExtractJwt.fromAuthHeaderAsBearerToken();

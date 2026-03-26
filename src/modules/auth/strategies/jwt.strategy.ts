import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import type { JwtPayload } from "../interfaces/jwt-payload.interface";
import { extractAccessTokenFromBearerHeader } from "../jwt-from-request";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: extractAccessTokenFromBearerHeader,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("jwt.secret"),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}

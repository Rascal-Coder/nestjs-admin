export interface JwtPayload {
  /** 用户主键，与 Casbin sub 对齐 */
  sub: string;
  email: string;
}

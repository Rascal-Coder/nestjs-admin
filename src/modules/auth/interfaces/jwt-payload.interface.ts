export interface JwtPayload {
  /** 用户主键，与 Casbin sub 对齐 */
  sub: string;
  email: string;
  /** 主角色编码；签发时写入，供 CasbinGuard 识别超管等场景 */
  roleCode?: string | null;
}

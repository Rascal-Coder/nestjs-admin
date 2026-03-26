/** 与 AGENTS.md 约定一致：0 成功；1xxxx 通用；2xxxx 用户等领域 */
export enum BusinessCode {
  OK = 0,

  BAD_REQUEST = 10000,
  UNAUTHORIZED = 10001,
  FORBIDDEN = 10003,
  NOT_FOUND = 10004,
  CONFLICT = 10009,

  USER_EMAIL_EXISTS = 20001,
  USER_INVALID_CREDENTIALS = 20002,
  /** 账号已停用，禁止登录 */
  USER_DISABLED = 20003,
}

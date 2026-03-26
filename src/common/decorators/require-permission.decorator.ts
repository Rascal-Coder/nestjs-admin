import { SetMetadata } from "@nestjs/common";

export const PERMISSION_KEY = "casbinPermission";

export interface CasbinPermissionMeta {
  resource: string;
  action: string;
}

/** 声明 Casbin 校验所需的资源与动作（与 model.conf 中 obj/act 一致） */
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, {
    resource,
    action,
  } satisfies CasbinPermissionMeta);

import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@gamebox/shared';

export const ROLES_KEY = 'roles';
/** 限制接口可访问的角色，如 @Roles('ADMIN', 'BRANCH') */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

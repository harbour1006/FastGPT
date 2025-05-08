import { UsageSourceEnum } from '@fastgpt/global/support/wallet/usage/constants';
import type { UserModelSchema } from '@fastgpt/global/support/user/type';

export interface UserUpdateParams {
  balance?: number;
  avatar?: string;
  timezone?: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  teamId: string | undefined; // 添加 teamId
  contact: string | undefined; // 添加 teamId
}

export interface CreateUserResponse {
  message: string;
  userId: string;
  teamId: string; // 后端返回 teamId
}

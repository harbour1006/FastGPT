// File: projects/app/src/pages/api/support/user/getUserDetail.ts
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { getUserDetail } from '@fastgpt/service/support/user/controller';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { UserType } from '@fastgpt/global/support/user/type';

/*
 * 用户详情查询接口
 */
export type UserDetailQuery = {
  tmbId?: string; // 团队成员ID
  userId?: string; // 用户ID
};

export type UserDetailBody = {};

export type UserDetailResponse = UserType;

async function handler(
  req: ApiRequestProps<UserDetailBody, UserDetailQuery>,
  res: ApiResponseType<UserDetailResponse>
): Promise<UserDetailResponse> {
  // 参数解构
  const { tmbId, userId } = req.query;

  // 权限验证（必须登录）
  const { tmbId: requestTmbId } = await authCert({
    req,
    authToken: true
  });

  // 参数校验逻辑
  if (!tmbId && !userId) {
    throw new Error('缺少查询参数 tmbId 或 userId');
  }

  // 业务逻辑处理
  const userDetail = await getUserDetail({
    ...(tmbId && { tmbId }),
    ...(userId && { userId })
  });

  // 权限二次校验（禁止查看他人信息）
  if (userDetail.team.tmbId !== requestTmbId) {
    throw new Error('无权查看其他用户信息');
  }

  return userDetail; // ✅ 标准化返回
}

export default NextAPI(handler);

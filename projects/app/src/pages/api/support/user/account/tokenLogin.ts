import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { getUserDetail } from '@fastgpt/service/support/user/controller';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { UserType } from '@fastgpt/global/support/user/type';

export type TokenLoginQuery = { forceRefresh?: boolean }; // 添加 forceRefresh 参数
export type TokenLoginBody = {};
export type TokenLoginResponse = UserType;

async function handler(
  req: ApiRequestProps<TokenLoginBody, TokenLoginQuery>,
  _res: ApiResponseType<any>
): Promise<TokenLoginResponse> {
  const { tmbId } = await authCert({ req, authToken: true });
  const { forceRefresh = false } = req.query; // 获取 forceRefresh 参数

  // 强制刷新时重新查询数据库
  // 临时绕过类型检查
  const user = await (getUserDetail as any)({ tmbId, forceRefresh });
  // Remove sensitive information
  if (user.team.openaiAccount) {
    user.team.openaiAccount = {
      key: '',
      baseUrl: user.team.openaiAccount.baseUrl
    };
  }
  if (user.team.externalWorkflowVariables) {
    user.team.externalWorkflowVariables = Object.fromEntries(
      Object.entries(user.team.externalWorkflowVariables).map(([key, value]) => [key, ''])
    );
  }
  const isRootUser = user?.username === 'root';
  return {
    ...user,
    isRoot: isRootUser
  };
}
export default NextAPI(handler);

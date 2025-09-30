// C:\FastGPT\gitHubCode2\FastGPT\projects\app\src\pages\api\core\app\collaborator\checkPermission.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { jsonRes } from '@fastgpt/service/common/response';
import { Types } from 'mongoose';
// import { AppCollaboratorDeleteParams } from '@fastgpt/global/core/app/collaborator'; // 可以根据需要引入

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonRes(res, { code: 405, message: '方法不允许' });
  }

  try {
    // 同样从 query 获取参数，并假定只通过 groupId 检查
    const { appId, groupId } = req.query as {
      appId: string;
      groupId: string /* tmbId?: string; orgId?: string; */;
    };

    // 1. 认证用户并获取 teamId
    const { teamId } = await authUserPer({ req, authToken: true, authApiKey: true });

    // 2. 验证参数
    if (!appId || !Types.ObjectId.isValid(appId) || !groupId || !Types.ObjectId.isValid(groupId)) {
      return jsonRes(res, { code: 400, message: '检查权限需要有效的 App ID 和 Group ID' });
    }

    const READ_PERMISSION_VALUE = 4; // 读权限的值，这里硬编码以匹配您的需求

    // 3. 查询权限记录
    const exists = await MongoResourcePermission.exists({
      teamId,
      resourceType: PerResourceTypeEnum.app,
      resourceId: new Types.ObjectId(appId),
      groupId: new Types.ObjectId(groupId), // 明确指定 groupId
      permission: READ_PERMISSION_VALUE // 只检查读权限 (value: 4)
    });

    jsonRes(res, { code: 200, data: !!exists, message: '权限检查成功' });
  } catch (error: any) {
    console.error('检查 App 特定群组读权限失败:', error);
    jsonRes(res, { code: 500, message: '检查 App 特定群组读权限失败', error: error.message });
  }
}

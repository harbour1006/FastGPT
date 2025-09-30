// C:\FastGPT\gitHubCode2\FastGPT\projects\app\src\pages\api\core\app\collaborator\delete.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { authApp } from '@fastgpt/service/support/permission/app/auth';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { jsonRes } from '@fastgpt/service/common/response';
import { Types } from 'mongoose';
import { connectionMongo } from '@fastgpt/service/common/mongo';
// import { AppCollaboratorDeleteParams } from '@fastgpt/global/core/app/collaborator'; // 可以根据需要引入，但这里直接用 req.query

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return jsonRes(res, { code: 405, message: '方法不允许' });
  }

  const session = await connectionMongo.startSession();
  session.startTransaction();

  try {
    // 由于前端将使用 AppCollaboratorDeleteParams 传递，这里也从 query 获取
    // 假设您只会在前端传入 groupId (或 tmbId/orgId) 来删除，且此接口现在专门用于删除特定群组的读权限
    const { appId, groupId } = req.query as {
      appId: string;
      groupId?: string /* tmbId?: string; orgId?: string; */;
    };

    // 1. 认证用户并获取 teamId
    const { teamId } = await authUserPer({ req, authToken: true, authApiKey: true });

    // 2. 验证用户对该 App 拥有管理权限
    await authApp({
      req,
      appId,
      per: ManagePermissionVal, // 要求用户对该 App 具有管理权限
      authToken: true,
      authApiKey: true
    });

    // 3. 验证参数: 确保 appId 和 groupId 存在且有效
    if (!appId || !Types.ObjectId.isValid(appId) || !groupId || !Types.ObjectId.isValid(groupId)) {
      await session.abortTransaction();
      session.endSession();
      return jsonRes(res, { code: 400, message: '删除权限需要有效的 App ID 和 Group ID' });
    }

    const resourceId = new Types.ObjectId(appId);
    const targetGroupId = new Types.ObjectId(groupId);
    const READ_PERMISSION_VALUE = 4; // 读权限的值，这里硬编码以匹配您的需求

    // 4. 删除权限记录 (针对特定 groupId 和 permission: 4)
    const result = await MongoResourcePermission.deleteOne(
      {
        teamId,
        resourceType: PerResourceTypeEnum.app,
        resourceId,
        groupId: targetGroupId, // 明确指定 groupId
        permission: READ_PERMISSION_VALUE // 明确指定 permission 为 4
      },
      { session }
    );

    if (result.deletedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      // 如果没有找到匹配的记录，可能表示该权限本来就不存在，仍然可以返回成功或特定信息
      return jsonRes(res, { code: 200, message: '权限记录不存在或已被删除' });
    }

    await session.commitTransaction();
    session.endSession();

    jsonRes(res, { code: 200, message: 'App 特定群组读权限删除成功' });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('删除 App 特定群组读权限失败:', error);
    jsonRes(res, { code: 500, message: '删除 App 特定群组读权限失败', error: error.message });
  }
}

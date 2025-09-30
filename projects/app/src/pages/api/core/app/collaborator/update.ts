import { NextApiRequest, NextApiResponse } from 'next';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema'; // 导入 MongoResourcePermission
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant'; // 导入资源类型枚举
import { UpdateAppCollaboratorBody } from '@fastgpt/global/core/app/collaborator'; // 导入请求体类型
import { authUserPer } from '@fastgpt/service/support/permission/user/auth'; // 导入用户权限认证
import { authApp } from '@fastgpt/service/support/permission/app/auth'; // 导入 App 权限认证
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant'; // 导入管理权限值
import { connectionMongo } from '@fastgpt/service/common/mongo'; // 导入 MongoDB 连接和事务
import { jsonRes } from '@fastgpt/service/common/response'; // 导入统一响应函数
import { Types } from 'mongoose'; // 导入 Mongoose Types 用于 ObjectId

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return jsonRes(res, { code: 405, message: '方法不允许' });
  }

  const session = await connectionMongo.startSession(); // 启动事务
  session.startTransaction(); // 开始事务

  try {
    const {
      appId,
      members = [],
      groups = [],
      orgs = [],
      permission
    } = req.body as UpdateAppCollaboratorBody;

    // 1. 权限认证：确保用户对该 App 拥有管理权限
    // authUserPer 获取当前用户在团队中的基本信息和权限
    const { teamId } = await authUserPer({ req, authToken: true, authApiKey: true });

    // authApp 验证用户对特定 App 的权限，这里需要管理权限
    await authApp({
      req,
      appId,
      per: ManagePermissionVal, // 要求用户对该 App 具有管理权限
      authToken: true,
      authApiKey: true
    });

    // 2. 验证 appId 是否有效
    if (!appId || !Types.ObjectId.isValid(appId)) {
      await session.abortTransaction();
      session.endSession();
      return jsonRes(res, { code: 400, message: '无效的 App ID' });
    }

    const resourceId = new Types.ObjectId(appId); // 将 appId 转换为 ObjectId

    // 3. 处理成员权限更新
    for (const memberId of members) {
      if (!Types.ObjectId.isValid(memberId)) {
        console.warn(`无效的成员 ID: ${memberId}`);
        continue;
      }
      await MongoResourcePermission.updateOne(
        {
          teamId,
          resourceType: PerResourceTypeEnum.app,
          resourceId,
          tmbId: new Types.ObjectId(memberId)
        },
        {
          $set: { permission } // 更新权限值
        },
        {
          upsert: true, // 如果不存在则创建
          session // 在事务中执行
        }
      );
    }

    // 4. 处理群组权限更新
    for (const groupId of groups) {
      if (!Types.ObjectId.isValid(groupId)) {
        console.warn(`无效的群组 ID: ${groupId}`);
        continue;
      }
      await MongoResourcePermission.updateOne(
        {
          teamId,
          resourceType: PerResourceTypeEnum.app,
          resourceId,
          groupId: new Types.ObjectId(groupId)
        },
        {
          $set: { permission }
        },
        {
          upsert: true,
          session
        }
      );
    }

    // 5. 处理组织权限更新
    for (const orgId of orgs) {
      if (!Types.ObjectId.isValid(orgId)) {
        console.warn(`无效的组织 ID: ${orgId}`);
        continue;
      }
      await MongoResourcePermission.updateOne(
        {
          teamId,
          resourceType: PerResourceTypeEnum.app,
          resourceId,
          orgId: new Types.ObjectId(orgId)
        },
        {
          $set: { permission }
        },
        {
          upsert: true,
          session
        }
      );
    }

    await session.commitTransaction(); // 提交事务
    session.endSession(); // 结束会话

    jsonRes(res, { code: 200, message: 'App 协作权限更新成功' });
  } catch (error: any) {
    await session.abortTransaction(); // 发生错误时回滚事务
    session.endSession(); // 结束会话
    console.error('更新 App 协作权限失败:', error);
    jsonRes(res, { code: 500, message: '更新 App 协作权限失败', error: error.message });
  }
}

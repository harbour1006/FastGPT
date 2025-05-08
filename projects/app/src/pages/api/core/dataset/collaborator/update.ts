import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  WritePermissionVal,
  PerResourceTypeEnum
} from '@fastgpt/global/support/permission/constant';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
import { Types } from 'mongoose';
import { log } from 'console';
import { addLog } from '@fastgpt/service/common/system/log';

// 定义新的请求体类型
interface RequestBody {
  datasetId: string;
  members: string[];
  groups: string[];
  orgs: string[];
  permission: number;
}

// 定义查询参数类型 (POST 请求通常在 body 中传递数据，这里可以为空)
interface RequestQuery {}

async function handler(
  req: ApiRequestProps<RequestBody, RequestQuery>,
  res: NextApiResponse<{
    code: number;
    statusText: string;
    message: string;
    data: null;
  }>
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ code: 405, statusText: '', message: 'Method Not Allowed', data: null });
  }

  const { datasetId, members, groups, orgs, permission } = req.body;

  if (!datasetId || permission === undefined) {
    return res
      .status(400)
      .json({ code: 400, statusText: '', message: 'Missing datasetId or permission', data: null });
  }

  try {
    // 验证用户身份和对数据集的写权限
    const { teamId } = await authUserPer({
      req,
      authToken: true,
      //   resourceType: PerResourceTypeEnum.dataset,
      //   resourceId: datasetId,
      per: WritePermissionVal
    });

    const resourceId = new Types.ObjectId(datasetId);
    const teamObjectId = new Types.ObjectId(teamId);

    // 处理成员权限
    await Promise.all(
      members.map(async (memberId) => {
        await MongoResourcePermission.updateOne(
          {
            teamId: teamObjectId,
            resourceType: PerResourceTypeEnum.dataset,
            resourceId: resourceId,
            tmbId: new Types.ObjectId(memberId)
          },
          { $set: { permission } },
          { upsert: true }
        );
      })
    );

    // // 处理群组权限
    // await Promise.all(
    //   groups.map(async (groupId) => {
    //     await MongoResourcePermission.updateOne(
    //       {
    //         teamId: teamObjectId,
    //         resourceType: PerResourceTypeEnum.dataset,
    //         resourceId: resourceId,
    //         groupId: new Types.ObjectId(groupId),
    //       },
    //       { $set: { permission } },
    //       { upsert: true }
    //     );
    //   })
    // );

    // // 处理组织权限
    // await Promise.all(
    //   orgs.map(async (orgId) => {
    //     await MongoResourcePermission.updateOne(
    //       {
    //         teamId: teamObjectId,
    //         resourceType: PerResourceTypeEnum.dataset,
    //         resourceId: resourceId,
    //         orgId: new Types.ObjectId(orgId),
    //       },
    //       { $set: { permission } },
    //       { upsert: true }
    //     );
    //   })
    // );
    addLog.info('success');
    return res.status(200).json({
      code: 200,
      statusText: '',
      message: 'Collaborators updated successfully',
      data: null
    });
  } catch (error: any) {
    addLog.error('Error updating collaborators:', error);
    return res.status(500).json({
      code: 500,
      statusText: '',
      message: error.message || 'Failed to update collaborators',
      data: null
    });
  }
}

export default NextAPI(handler);

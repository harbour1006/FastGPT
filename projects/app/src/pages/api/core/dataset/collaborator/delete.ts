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

// 定义查询参数类型
interface RequestQuery {
  datasetId?: string;
  tmbId?: string;
}

async function handler(
  req: ApiRequestProps<{}, RequestQuery>,
  res: NextApiResponse<{
    code: number;
    statusText: string;
    message: string;
    data: null;
  }>
) {
  if (req.method !== 'DELETE') {
    return res
      .status(405)
      .json({ code: 405, statusText: '', message: 'Method Not Allowed', data: null });
  }

  const { datasetId, tmbId } = req.query;

  if (!datasetId || !tmbId) {
    return res.status(400).json({
      code: 400,
      statusText: '',
      message: 'Missing datasetId or tmbId in query parameters',
      data: null
    });
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

    const query: any = {
      teamId: new Types.ObjectId(teamId),
      resourceType: PerResourceTypeEnum.dataset,
      resourceId: new Types.ObjectId(datasetId),
      tmbId: new Types.ObjectId(tmbId)
    };

    const result = await MongoResourcePermission.deleteOne(query);

    if (result.deletedCount > 0) {
      return res.status(200).json({
        code: 200,
        statusText: '',
        message: 'Collaborator deleted successfully',
        data: null
      });
    } else {
      return res
        .status(404)
        .json({ code: 404, statusText: '', message: 'Collaborator not found', data: null });
    }
  } catch (error: any) {
    console.error('Error deleting collaborator:', error);
    return res.status(500).json({
      code: 500,
      statusText: '',
      message: error.message || 'Failed to delete collaborator',
      data: null
    });
  }
}

export default NextAPI(handler);

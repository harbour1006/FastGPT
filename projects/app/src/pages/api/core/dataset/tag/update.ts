import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  WritePermissionVal,
  PerResourceTypeEnum
} from '@fastgpt/global/support/permission/constant';

// 定义请求体类型
interface RequestBody {
  datasetId: string;
  tagId: string; // 要更新的标签 _id
  tag: string; // 新的标签名
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

  const { datasetId, tag, tagId } = req.body;

  if (!datasetId || !tagId || !tag) {
    return res.status(400).json({
      code: 400,
      statusText: '',
      message: 'Missing datasetId, tag id, or new tag',
      data: null
    });
  }

  try {
    // 验证用户身份和对数据集的写权限
    await authUserPer({
      req,
      authToken: true,
      //   resourceType: PerResourceTypeEnum.dataset,
      //   resourceId: datasetId,
      per: WritePermissionVal
    });

    const result = await MongoDatasetCollectionTags.updateOne(
      {
        _id: tagId,
        datasetId: datasetId
        // teamId: req.tmb?.teamId, // 从 authUserPer 中间件注入的 req.tmb 获取 teamId
      },
      { $set: { tag: tag } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        code: 404,
        statusText: '',
        message: 'Tag not found or no changes applied',
        data: null
      });
    }

    return res
      .status(200)
      .json({ code: 200, statusText: '', message: 'Tag updated successfully', data: null });
  } catch (error: any) {
    console.error('Error updating dataset tag:', error);
    return res.status(500).json({
      code: 500,
      statusText: '',
      message: error.message || 'Failed to update tag',
      data: null
    });
  }
}

export default NextAPI(handler);

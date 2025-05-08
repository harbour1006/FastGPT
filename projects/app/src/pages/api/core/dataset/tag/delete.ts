import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  WritePermissionVal,
  PerResourceTypeEnum
} from '@fastgpt/global/support/permission/constant';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';

// 定义查询参数类型
interface RequestQuery {
  datasetId?: string;
  id?: string; // 要删除的标签 _id
}

// 定义请求体类型 (DELETE 请求通常没有 body，但为了统一 ApiRequestProps 的类型定义，可以保留为空)
interface RequestBody {}

async function handler(
  req: ApiRequestProps<RequestBody, RequestQuery>,
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

  const { datasetId, id: tagId } = req.query;

  if (!datasetId || !tagId) {
    return res
      .status(400)
      .json({ code: 400, statusText: '', message: 'Missing datasetId or tag id', data: null });
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

    const result = await MongoDatasetCollectionTags.deleteOne({
      _id: tagId,
      datasetId: datasetId
      //   teamId: req.tmb?.teamId, // 从 authUserPer 中间件注入的 req.tmb 获取 teamId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        code: 404,
        statusText: '',
        message: 'Tag not found or does not belong to this dataset/team',
        data: null
      });
    }

    return res
      .status(200)
      .json({ code: 200, statusText: '', message: 'Tag deleted successfully', data: null });
  } catch (error: any) {
    console.error('Error deleting dataset tag:', error);
    return res.status(500).json({
      code: 500,
      statusText: '',
      message: error.message || 'Failed to delete tag',
      data: null
    });
  }
}

export default NextAPI(handler);

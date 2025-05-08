import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  ReadPermissionVal,
  PerResourceTypeEnum
} from '@fastgpt/global/support/permission/constant';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import { Types } from 'mongoose'; // 确保引入 Types

// 定义查询参数类型
interface RequestQuery {
  datasetId?: string;
}

// 定义返回数据类型
interface TagUsageResponseData {
  collections: string[];
  tagId: string;
}

interface CollectionResult {
  _id: any; // 使用更精确的 ObjectId 类型
  tags: string[];
}

async function handler(
  req: ApiRequestProps<{}, RequestQuery>,
  res: NextApiResponse<{
    code: number;
    statusText: string;
    message: string;
    data: TagUsageResponseData[];
  }>
) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ code: 405, statusText: '', message: 'Method Not Allowed', data: [] });
  }

  const { datasetId } = req.query;

  if (!datasetId) {
    return res
      .status(400)
      .json({ code: 400, statusText: '', message: 'Missing datasetId', data: [] });
  }

  try {
    // 验证用户身份和对数据集的读权限
    await authUserPer({
      req,
      authToken: true,
      per: ReadPermissionVal
    });

    // 查询指定 datasetId 下所有包含标签的 collections
    const collectionsWithTags = (await MongoDatasetCollection.find(
      {
        datasetId: datasetId,
        tags: { $exists: true, $not: { $size: 0 } }
      },
      { _id: 1, tags: 1 }
    ).lean()) as CollectionResult[]; // 添加类型断言

    const tagUsageMap: Record<string, string[]> = {};
    // 遍历所有包含标签的 collections，整理标签的使用情况
    for (const collection of collectionsWithTags) {
      for (const tagId of collection.tags) {
        if (!tagUsageMap[tagId]) {
          tagUsageMap[tagId] = [];
        }
        tagUsageMap[tagId].push(collection._id.toString());
      }
    }

    const responseData: TagUsageResponseData[] = Object.entries(tagUsageMap).map(
      ([tagId, collections]) => ({
        collections: collections,
        tagId: tagId
      })
    );

    return res.status(200).json({ code: 200, statusText: '', message: '', data: responseData });
  } catch (error: any) {
    console.error('Error getting tag usage:', error);
    return res.status(500).json({
      code: 500,
      statusText: '',
      message: error.message || 'Failed to get tag usage',
      data: []
    });
  }
}

export default NextAPI(handler);

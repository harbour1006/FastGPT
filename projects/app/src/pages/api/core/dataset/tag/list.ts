import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  ReadPermissionVal,
  PerResourceTypeEnum
} from '@fastgpt/global/support/permission/constant';

// 定义请求体类型 (用于接收 datasetId)
interface RequestBody {
  datasetId?: string;
}

// 定义查询参数类型 (这里不再使用查询参数)
interface RequestQuery {}

// 定义返回数据类型
interface ListTagsResponseData {
  list: {
    _id: string;
    teamId: string;
    datasetId: string;
    tag: string;
    __v: number;
  }[];
  total: number;
}

async function handler(
  req: ApiRequestProps<RequestBody, RequestQuery>,
  res: NextApiResponse<{
    code: number;
    statusText: string;
    message: string;
    data: ListTagsResponseData;
  }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      code: 405,
      statusText: '',
      message: 'Method Not Allowed',
      data: { list: [], total: 0 }
    });
  }

  const { datasetId } = req.body;

  try {
    // 验证用户身份和权限 (这里假设获取标签列表至少需要读权限)
    const { teamId } = await authUserPer({
      req,
      authToken: true,
      // 如果需要针对特定数据集获取标签，可以加上 resourceType 和 resourceId 的校验
      //   resourceType: datasetId ? PerResourceTypeEnum.dataset : undefined,
      //   resourceId: datasetId,
      per: ReadPermissionVal
    });

    const findOptions: any = { teamId };
    if (datasetId) {
      findOptions.datasetId = datasetId;
    }

    const tags = await MongoDatasetCollectionTags.find(findOptions).lean();
    const total = tags.length;

    const responseData: ListTagsResponseData = {
      list: tags.map((tagDoc) => ({
        _id: tagDoc._id.toString(),
        teamId: tagDoc.teamId.toString(),
        datasetId: tagDoc.datasetId.toString(),
        tag: tagDoc.tag,
        __v: tagDoc.__v
      })),
      total: total
    };

    return res.status(200).json({ code: 200, statusText: '', message: '', data: responseData });
  } catch (error: any) {
    console.error('Error getting dataset tag list:', error);
    return res.status(500).json({
      code: 500,
      statusText: '',
      message: error.message || 'Failed to get tag list',
      data: { list: [], total: 0 }
    });
  }
}

export default NextAPI(handler);

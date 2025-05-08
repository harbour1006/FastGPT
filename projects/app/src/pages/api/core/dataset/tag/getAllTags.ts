import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  ReadPermissionVal,
  PerResourceTypeEnum
} from '@fastgpt/global/support/permission/constant';

// 定义请求体类型 (这里我们可能不需要 body，但为了统一 ApiRequestProps 的类型定义，可以保留为空)
interface RequestBody {}

// 定义查询参数类型 (可以根据需要添加查询参数，例如 datasetId 过滤)
interface RequestQuery {
  datasetId?: string;
}

// 定义返回数据类型
interface GetAllTagsResponseData {
  list: {
    _id: string;
    teamId: string;
    datasetId: string;
    tag: string;
    __v: number;
  }[];
}

async function handler(
  req: ApiRequestProps<RequestBody, RequestQuery>,
  res: NextApiResponse<{
    code: number;
    statusText: string;
    message: string;
    data: GetAllTagsResponseData;
  }>
) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ code: 405, statusText: '', message: 'Method Not Allowed', data: { list: [] } });
  }

  const { datasetId } = req.query;

  try {
    // 验证用户身份和权限 (这里假设获取所有标签至少需要读权限)
    const { teamId } = await authUserPer({
      req,
      authToken: true,
      // 如果需要针对特定数据集获取标签，可以加上 resourceType 和 resourceId 的校验
      // resourceType: datasetId ? PerResourceTypeEnum.dataset : undefined,
      // resourceId: datasetId,
      per: ReadPermissionVal
    });

    const findOptions: any = { teamId };
    if (datasetId) {
      findOptions.datasetId = datasetId;
    }

    const tags = await MongoDatasetCollectionTags.find(findOptions).lean();

    const responseData: GetAllTagsResponseData = {
      list: tags.map((tagDoc) => ({
        _id: tagDoc._id.toString(),
        teamId: tagDoc.teamId.toString(),
        datasetId: tagDoc.datasetId.toString(),
        tag: tagDoc.tag,
        __v: tagDoc.__v
      }))
    };

    return res.status(200).json({ code: 200, statusText: '', message: '', data: responseData });
  } catch (error: any) {
    console.error('Error getting all dataset tags:', error);
    return res.status(500).json({
      code: 500,
      statusText: '',
      message: error.message || 'Failed to get tags',
      data: { list: [] }
    });
  }
}

export default NextAPI(handler);

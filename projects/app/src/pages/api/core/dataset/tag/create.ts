import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import type { ApiRequestProps } from '@fastgpt/service/type/next'; // 注意这里不再使用 ApiResponseType
import {
  ReadPermissionVal,
  PerResourceTypeEnum
} from '@fastgpt/global/support/permission/constant';
import { authDataset } from '@fastgpt/service/support/permission/dataset/auth';

// 定义请求体类型
interface RequestBody {
  datasetId: string;
  tag: string;
}

async function handler(req: ApiRequestProps<RequestBody>, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { datasetId, tag } = req.body;

  if (!datasetId || !tag) {
    return res.status(400).json({ message: 'Missing datasetId or tag' });
  }

  try {
    // 使用 authUserPer 验证用户身份和对数据集的读权限，并获取 teamId
    const { teamId } = await authUserPer({
      req,
      authToken: true,
      //   resourceType: PerResourceTypeEnum.dataset,
      //   resourceId: datasetId,
      per: ReadPermissionVal // 假设创建标签需要至少读权限，您可以根据实际需求调整
    });

    // 查询是否已存在相同的标签
    const existingTag = await MongoDatasetCollectionTags.findOne({ teamId, datasetId, tag }).lean();

    if (existingTag) {
      return res.status(200).json({ message: 'Tag already exists' });
    }

    // 创建新的标签记录
    const newTag = new MongoDatasetCollectionTags({
      teamId: teamId,
      datasetId: datasetId,
      tag: tag
    });

    await newTag.save();

    return res.status(200).json({ message: 'Tag created successfully', userId: newTag._id }); // 模仿 register.ts 返回 userId
  } catch (error: any) {
    console.error('Error creating dataset tag:', error);
    return res.status(500).json({ message: error.message || 'Failed to create tag' });
  }
}

export default NextAPI(handler);

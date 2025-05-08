import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { MongoDatasetCollectionTags } from '@fastgpt/service/core/dataset/tag/schema';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  WritePermissionVal,
  PerResourceTypeEnum
} from '@fastgpt/global/support/permission/constant';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import { Types } from 'mongoose';

// 定义请求体类型
interface RequestBody {
  datasetId: string;
  tag: string; // tag 的 _id
  originCollectionIds: string[]; // 原始关联的 Collection _ids (可能用于对比)
  collectionIds: string[]; // 要关联的 Collection _ids
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

  const { datasetId, tag: tagId, collectionIds } = req.body;

  if (!datasetId || !tagId || !Array.isArray(collectionIds)) {
    return res.status(400).json({
      code: 400,
      statusText: '',
      message: 'Missing datasetId, tag id, or collectionIds',
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

    // 检查标签是否存在且属于当前团队和数据集
    const existingTag = await MongoDatasetCollectionTags.findOne({
      _id: tagId,
      datasetId: datasetId
      //   teamId: req.tmb?.teamId,
    }).lean();

    if (!existingTag) {
      return res.status(404).json({
        code: 404,
        statusText: '',
        message: 'Tag not found or does not belong to this dataset/team',
        data: null
      });
    }

    // 检查要关联的 Collections 是否存在且属于当前团队和数据集
    const existingCollections = await MongoDatasetCollection.find({
      _id: { $in: collectionIds.map((id) => new Types.ObjectId(id)) },
      datasetId: datasetId
      //   teamId: req.tmb?.teamId,
    }).lean();

    if (existingCollections.length !== collectionIds.length) {
      return res.status(400).json({
        code: 400,
        statusText: '',
        message: 'One or more collections not found or do not belong to this dataset/team',
        data: null
      });
    }

    // 更新 Collections 的 tags 字段，将 tagId 添加到指定的 Collections 中
    const updateResult = await MongoDatasetCollection.updateMany(
      {
        _id: { $in: collectionIds.map((id) => new Types.ObjectId(id)) },
        datasetId: datasetId,
        // teamId: req.tmb?.teamId,
        tags: { $ne: tagId } // 避免重复添加
      },
      { $push: { tags: tagId } }
    );

    return res.status(200).json({
      code: 200,
      statusText: '',
      message: 'Tag added to collections successfully',
      data: null
    });
  } catch (error: any) {
    console.error('Error adding tag to collections:', error);
    return res.status(500).json({
      code: 500,
      statusText: '',
      message: error.message || 'Failed to add tag to collections',
      data: null
    });
  }
}

export default NextAPI(handler);

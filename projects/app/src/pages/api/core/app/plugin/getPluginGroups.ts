import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { MongoPluginGroups } from '@fastgpt/service/core/app/plugin/pluginGroupSchema';
import { ApiRequestProps } from '@fastgpt/service/type/next';

async function handler(req: ApiRequestProps, res: NextApiResponse<any>) {
  try {
    const pluginGroups = await MongoPluginGroups.find().sort({ groupOrder: 1 });

    res.status(200).json({
      code: 200,
      statusText: '',
      message: '',
      data: pluginGroups
    });
  } catch (error) {
    console.error('Error fetching plugin groups:', error);
    res.status(500).json({
      code: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to fetch plugin groups.',
      data: []
    });
  }
}

export default NextAPI(handler);

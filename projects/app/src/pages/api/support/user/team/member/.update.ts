import { NextApiRequest, NextApiResponse } from 'next';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { connectionMongo } from '@fastgpt/service/common/mongo';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ code: 405, message: '方法不允许' });
  }

  const { tmbId, memberName, contact } = req.body as {
    tmbId: string;
    memberName?: string;
    contact?: string;
  };

  if (!tmbId) {
    return res.status(400).json({ code: 400, message: '成员 ID (tmbId) 不能为空' });
  }

  if (!memberName && !contact) {
    return res.status(401).json({ code: 401, message: '没有提供需要更新的信息' });
  }

  try {
    const updateData: { memberName?: string; contact?: string; updateTime: Date } = {
      updateTime: new Date()
    };
    if (memberName) {
      updateData.memberName = memberName;
    }
    if (contact) {
      updateData.contact = contact;
    }

    const result = await MongoTeamMember.updateOne(
      { _id: new mongoose.Types.ObjectId(tmbId) },
      { $set: updateData }
    );

    if (result.modifiedCount > 0) {
      return res.status(200).json({ code: 200, message: '用户信息更新成功' });
    } else {
      return res.status(402).json({ code: 402, message: '用户信息未更改或成员不存在' });
    }
  } catch (error) {
    console.error('更新团队成员信息失败', error);
    return res.status(500).json({ code: 500, message: '更新团队成员信息失败' });
  }
}

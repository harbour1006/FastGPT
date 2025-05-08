import { NextApiRequest, NextApiResponse } from 'next';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { connectionMongo } from '@fastgpt/service/common/mongo';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ code: 405, message: '方法不允许' });
  }

  const { tmbId } = req.query;
  const { memberName, contact } = req.body as { memberName?: string; contact?: string };

  if (!tmbId || typeof tmbId !== 'string') {
    return res.status(400).json({ code: 400, message: '成员 ID (tmbId) 无效' });
  }

  if (!memberName && !contact) {
    return res.status(401).json({ code: 401, message: '没有提供需要更新的信息' });
  }

  try {
    const teamMember = await MongoTeamMember.findById(tmbId).populate('user');

    if (!teamMember) {
      return res.status(404).json({ code: 404, message: '找不到该团队成员' });
    }

    const userId = teamMember.userId;

    if (!userId) {
      return res.status(500).json({ code: 500, message: '无法获取用户 ID' });
    }

    const updateData: { username?: string; contact?: string; updateTime: Date } = {
      updateTime: new Date()
    };
    if (memberName) {
      updateData.username = memberName; // 使用 'username' 更新 User 模型
    }
    if (contact) {
      updateData.contact = contact;
    }

    const result = await MongoUser.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: updateData }
    );

    if (result.modifiedCount > 0) {
      return res.status(200).json({ code: 200, message: '用户信息更新成功' });
    } else {
      return res.status(402).json({ code: 402, message: '用户信息未更改或用户不存在' });
    }
  } catch (error) {
    console.error('更新用户信息失败', error);
    return res.status(500).json({ code: 500, message: '更新用户信息失败' });
  }
}

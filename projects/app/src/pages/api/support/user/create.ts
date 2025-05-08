import { NextApiRequest, NextApiResponse } from 'next';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { connectionMongo } from '@fastgpt/service/common/mongo';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum
} from '@fastgpt/global/support/user/team/constant';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ data: { code: 405, message: '方法不允许' } });
  }

  const { username, password, teamId, contact } = req.body as {
    username: string;
    password: string;
    teamId: string;
    contact: string;
  };

  if (!username || !password || !teamId) {
    return res.status(400).json({ data: { code: 400, message: '用户名、密码和团队 ID 为必填项' } });
  }

  const existingUser = await MongoUser.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ data: { code: 400, message: '用户名已存在' } });
  }

  let targetTeam;
  try {
    targetTeam = await MongoTeam.findOne({ _id: new mongoose.Types.ObjectId(teamId) });
  } catch (error) {
    console.error('Error finding team:', error);
    return res.status(400).json({ data: { code: 400, message: '指定的团队 ID 格式不正确' } });
  }

  if (!targetTeam) {
    return res.status(400).json({ data: { code: 400, message: '指定的团队 ID 不存在' } });
  }

  let newUser;
  let success = false;
  await connectionMongo.startSession().then(async (session) => {
    await session.withTransaction(async () => {
      newUser = new MongoUser({
        username,
        password,
        contact,
        createTime: new Date(),
        status: 'active',
        teamId: targetTeam._id
      });
      newUser.markModified('password');
      await newUser.save({ session });

      const newTeamMember = new MongoTeamMember({
        teamId: targetTeam._id,
        userId: newUser._id,
        memberName: username,
        role: TeamMemberRoleEnum.memeber,
        status: TeamMemberStatusEnum.active,
        createTime: new Date()
      });
      await newTeamMember.save({ session });
      success = true;
    });
  });

  if (success && newUser) {
    return res
      .status(201)
      .json({ data: { code: 201, message: '用户创建成功并已添加到团队', teamId: targetTeam._id } });
  } else {
    return res.status(500).json({ data: { code: 500, message: '创建用户或添加团队成员失败' } });
  }
}

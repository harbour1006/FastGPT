import { NextApiRequest, NextApiResponse } from 'next';
import { MongoUser } from '@fastgpt/service/support/user/schema'; // 用户模型
import { hashStr } from '@fastgpt/global/common/string/tools'; // 密码加密工具
import { createDefaultTeam } from '@fastgpt/service/support/user/team/controller'; // 团队创建函数
import { connectionMongo } from '@fastgpt/service/common/mongo'; // MongoDB 连接

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '方法不允许' });
  }

  const { username, password } = req.body as { username: string; password: string };

  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码为必填项' });
  }

  // 检查用户名是否已存在
  const existingUser = await MongoUser.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: '用户名已存在' });
  }

  // 创建新用户
  const newUser = new MongoUser({
    username,
    password: hashStr(password),
    createTime: new Date(),
    status: 'active' // 参考 UserStatusEnum
  });
  newUser.markModified('password'); // 强制触发 setter
  await newUser.save();

  // 为新用户创建默认团队
  await connectionMongo.startSession().then(async (session) => {
    await session.withTransaction(async () => {
      await createDefaultTeam({ userId: newUser._id, session });
    });
  });
  debugger;
  return res.status(201).json({ message: '用户注册成功yes', userId: newUser._id });
}

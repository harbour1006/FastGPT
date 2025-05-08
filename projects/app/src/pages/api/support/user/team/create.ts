import { NextApiRequest, NextApiResponse } from 'next';
import { MongoUser } from '@fastgpt/service/support/user/schema'; // 用户模型
import { createTeam } from '@fastgpt/service/support/user/team/controller'; // 团队创建函数
import { connectionMongo } from '@fastgpt/service/common/mongo'; // MongoDB 连接
import { parseHeaderCert } from '@fastgpt/service/support/permission/controller'; // 权限认证
import { AuthUserTypeEnum } from '@fastgpt/global/support/permission/constant';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    // 1. 权限验证：只有 root 用户才能创建团队
    const authResult = await parseHeaderCert({ req, authRoot: true });
    if (authResult.authType !== AuthUserTypeEnum.root) {
      return res.status(403).json({ message: '权限不足，只有 Root 用户才能创建团队' });
    }

    const {
      name: teamName,
      memberName: ownerUsername,
      ownerPassword,
      ownerContact
    } = req.body as {
      name: string;
      memberName: string;
      ownerPassword: string;
      ownerContact?: string; // 新增 ownerContact 字段，可选
    };

    // 2. 参数验证
    if (!teamName || !ownerUsername || !ownerPassword) {
      return res.status(400).json({ message: '团队名称、管理员用户名和密码为必填项' });
    }

    // 3. 检查管理员用户名是否已存在
    const existingUser = await MongoUser.findOne({ username: ownerUsername });
    if (existingUser) {
      return res.status(400).json({ message: `管理员用户名 "${ownerUsername}" 已存在` });
    }

    // 4. 创建团队管理员用户
    const newOwnerUser = new MongoUser({
      username: ownerUsername,
      password: ownerPassword,
      createTime: new Date(),
      status: 'active', // 参考 UserStatusEnum
      contact: ownerContact || '' // 将 ownerContact 保存到 contact 字段，如果未提供则保存空字符串
    });
    newOwnerUser.markModified('password'); // 强制触发 setter
    await newOwnerUser.save();

    // 5. 创建团队
    await connectionMongo.startSession().then(async (session) => {
      await session.withTransaction(async () => {
        const newTeam = await createTeam({
          name: teamName,
          ownerId: newOwnerUser._id,
          session
        });

        return res.status(201).json({
          message: '团队创建成功22222',
          teamId: newTeam._id,
          ownerUserId: newOwnerUser._id
        });
      });
    });
  } catch (error: any) {
    console.error('创建团队失败:', error);
    return res.status(500).json({ message: '创建团队失败', error: error.message });
  }
}

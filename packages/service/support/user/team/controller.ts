import { TeamSchema, TeamTmbItemType } from '@fastgpt/global/support/user/team/type';
import { ClientSession, Types } from '../../../common/mongo';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum,
  notLeaveStatus
} from '@fastgpt/global/support/user/team/constant';
import { MongoTeamMember } from './teamMemberSchema';
import { MongoTeam } from './teamSchema';
import { UpdateTeamProps } from '@fastgpt/global/support/user/team/controller';
import { getResourcePermission } from '../../permission/controller';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { TeamDefaultPermissionVal } from '@fastgpt/global/support/permission/user/constant';
import { MongoMemberGroupModel } from '../../permission/memberGroup/memberGroupSchema';
import { mongoSessionRun } from '../../../common/mongo/sessionRun';
import { DefaultGroupName } from '@fastgpt/global/support/user/team/group/constant';
import { getAIApi } from '../../../core/ai/config';
import { createRootOrg } from '../../permission/org/controllers';
import { refreshSourceAvatar } from '../../../common/file/image/controller';
import { MongoResourcePermission } from '../../permission/schema'; // <-- **添加这一行**
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '../../../common/response';
import { MongoUser } from '../schema';

async function getTeamMember(match: Record<string, any>): Promise<TeamTmbItemType> {
  const tmb = await MongoTeamMember.findOne(match).populate<{ team: TeamSchema }>('team').lean();
  if (!tmb) {
    return Promise.reject('member not exist');
  }

  const Per = await getResourcePermission({
    resourceType: PerResourceTypeEnum.team,
    teamId: tmb.teamId,
    tmbId: tmb._id
  });

  return {
    userId: String(tmb.userId),
    teamId: String(tmb.teamId),
    teamAvatar: tmb.team.avatar,
    teamName: tmb.team.name,
    memberName: tmb.name,
    avatar: tmb.avatar,
    balance: tmb.team.balance,
    tmbId: String(tmb._id),
    teamDomain: tmb.team?.teamDomain,
    role: tmb.role,
    status: tmb.status,
    permission: new TeamPermission({
      per: Per ?? TeamDefaultPermissionVal,
      isOwner: tmb.role === TeamMemberRoleEnum.owner
    }),
    notificationAccount: tmb.team.notificationAccount,

    lafAccount: tmb.team.lafAccount,
    openaiAccount: tmb.team.openaiAccount,
    externalWorkflowVariables: tmb.team.externalWorkflowVariables
  };
}

export async function getTmbInfoByTmbId({ tmbId }: { tmbId: string }) {
  if (!tmbId) {
    return Promise.reject('tmbId or userId is required');
  }
  return getTeamMember({
    _id: new Types.ObjectId(String(tmbId)),
    status: notLeaveStatus
  });
}

export async function getUserDefaultTeam({ userId }: { userId: string }) {
  if (!userId) {
    return Promise.reject('tmbId or userId is required');
  }
  return getTeamMember({
    userId: new Types.ObjectId(userId)
  });
}

export async function createDefaultTeam({
  userId,
  teamName = 'My Team',
  avatar = '/icon/logo.svg',
  session
}: {
  userId: string;
  teamName?: string;
  avatar?: string;
  session: ClientSession;
}) {
  // auth default team
  const tmb = await MongoTeamMember.findOne({
    userId: new Types.ObjectId(userId),
    defaultTeam: true
  });

  if (!tmb) {
    // create team
    const [{ _id: insertedId }] = await MongoTeam.create(
      [
        {
          ownerId: userId,
          name: teamName,
          avatar,
          createTime: new Date()
        }
      ],
      { session }
    );
    // create team member
    const [tmb] = await MongoTeamMember.create(
      [
        {
          teamId: insertedId,
          userId,
          name: 'Owner',
          role: TeamMemberRoleEnum.owner,
          status: TeamMemberStatusEnum.active,
          createTime: new Date(),
          defaultTeam: true
        }
      ],
      { session }
    );
    // create default group
    const [defaultGroup] = await MongoMemberGroupModel.create(
      // <-- **修改这里，获取 defaultGroup 实例**
      [
        {
          teamId: tmb.teamId,
          name: DefaultGroupName,
          avatar
        }
      ],
      { session }
    );

    // ！！！！ 添加：为默认群组创建 resource_permissions 记录 ！！！！
    await MongoResourcePermission.create(
      [
        {
          teamId: tmb.teamId,
          groupId: defaultGroup._id, // 使用默认群组的 ID
          resourceType: PerResourceTypeEnum.team, // 权限是针对团队层面的
          permission: 60, // 您的目标权限值：read(4) + appCreate(8) + datasetCreate(16) + apikeyCreate(32) = 60
          resourceId: null // 团队层面的权限，resourceId 为 null
        }
      ],
      { session }
    );

    await createRootOrg({ teamId: tmb.teamId, session });
    console.log('create default team, group and root org', userId);
    return tmb;
  } else {
    console.log('default team exist', userId);
  }
}

export async function updateTeam({
  teamId,
  name,
  avatar,
  teamDomain,
  lafAccount,
  openaiAccount,
  externalWorkflowVariable
}: UpdateTeamProps & { teamId: string }) {
  // auth openai key
  if (openaiAccount?.key) {
    console.log('auth user openai key', openaiAccount?.key);
    const baseUrl = openaiAccount?.baseUrl || 'https://api.openai.com/v1';
    openaiAccount.baseUrl = baseUrl;

    const ai = getAIApi({
      userKey: openaiAccount
    });

    const response = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }]
    });
    if (response?.choices?.[0]?.message?.content === undefined) {
      return Promise.reject('Key response is empty');
    }
  }

  return mongoSessionRun(async (session) => {
    const unsetObj = (() => {
      const obj: Record<string, 1> = {};
      if (lafAccount?.pat === '') {
        obj.lafAccount = 1;
      }
      if (openaiAccount?.key === '') {
        obj.openaiAccount = 1;
      }
      if (externalWorkflowVariable) {
        if (externalWorkflowVariable.value === '') {
          obj[`externalWorkflowVariables.${externalWorkflowVariable.key}`] = 1;
        }
      }

      if (Object.keys(obj).length === 0) {
        return undefined;
      }
      return {
        $unset: obj
      };
    })();
    const setObj = (() => {
      const obj: Record<string, any> = {};
      if (lafAccount?.pat && lafAccount?.appid) {
        obj.lafAccount = lafAccount;
      }
      if (openaiAccount?.key && openaiAccount?.baseUrl) {
        obj.openaiAccount = openaiAccount;
      }
      if (externalWorkflowVariable) {
        if (externalWorkflowVariable.value !== '') {
          obj[`externalWorkflowVariables.${externalWorkflowVariable.key}`] =
            externalWorkflowVariable.value;
        }
      }
      if (Object.keys(obj).length === 0) {
        return undefined;
      }
      return obj;
    })();

    // This is where we get the old team
    const team = await MongoTeam.findByIdAndUpdate(
      teamId,
      {
        $set: {
          ...(name ? { name } : {}),
          ...(avatar ? { avatar } : {}),
          ...(teamDomain ? { teamDomain } : {}),
          ...setObj
        },
        ...unsetObj
      },
      { session }
    );

    // Update member group avatar
    if (avatar) {
      await MongoMemberGroupModel.updateOne(
        {
          teamId: teamId,
          name: DefaultGroupName
        },
        {
          avatar
        },
        { session }
      );

      await refreshSourceAvatar(avatar, team?.avatar, session);
    }
  });
}

//创建团队
export async function createTeam({
  name,
  ownerId,
  session
}: {
  name: string;
  ownerId: string;
  session: ClientSession;
}): Promise<TeamSchema> {
  // 1. 创建团队
  const [{ _id: teamId }] = await MongoTeam.create(
    [
      {
        ownerId: ownerId,
        name: name,
        createTime: new Date()
      }
    ],
    { session }
  );

  // 2. 将创建者添加为团队 Owner
  await MongoTeamMember.create(
    [
      {
        teamId: teamId,
        userId: ownerId,
        name: 'Owner', // 默认 Owner 名称
        role: TeamMemberRoleEnum.owner,
        status: TeamMemberStatusEnum.active,
        createTime: new Date(),
        defaultTeam: false // 不是默认团队
      }
    ],
    { session }
  );

  // 3. 创建默认群组
  const [defaultGroup] = await MongoMemberGroupModel.create(
    // <-- **修改这里：获取 defaultGroup 实例**
    [
      {
        teamId: teamId,
        name: DefaultGroupName
        // 可以设置默认的群组头像，或者留空
      }
    ],
    { session }
  );

  // ！！！！ 添加：为默认群组创建 resource_permissions 记录 ！！！！
  await MongoResourcePermission.create(
    [
      {
        teamId: teamId,
        groupId: defaultGroup._id, // 使用默认群组的 ID
        resourceType: PerResourceTypeEnum.team, // 权限是针对团队层面的
        permission: 63,
        resourceId: null // 团队层面的权限，resourceId 为 null
      }
    ],
    { session }
  );

  // 4. 创建根组织
  await createRootOrg({ teamId: teamId, session });

  // 5. 返回新创建的团队信息
  const newTeam = await MongoTeam.findById(teamId).session(session).lean();
  if (!newTeam) {
    return Promise.reject('Failed to retrieve created team');
  }
  return newTeam;
}

/**
 * 辅助函数：更新用户的当前活跃团队信息到数据库
 * 主要更新 MongoUser 文档中的 team.teamId, team.teamName, team.avatar
 */
async function updateCurrentUserTeamInDB(userId: string, newTeamId: string) {
  try {
    const newTeam = await MongoTeam.findById(newTeamId);

    if (!newTeam) {
      throw new Error(`Team with ID ${newTeamId} not found.`);
    }

    await MongoUser.findByIdAndUpdate(
      userId,
      {
        'team.teamId': newTeamId,
        'team.teamName': newTeam.name,
        'team.avatar': newTeam.avatar
      },
      {
        new: true
      }
    );

    console.log(`User ${userId} successfully updated current active team to ${newTeamId}`);
  } catch (err) {
    console.error('Failed to update current user team in DB:', err);
    throw err;
  }
}

/**
 * API 控制器：切换用户的当前活跃团队
 * PUT /proApi/support/user/team/switch
 */
export const switchUserTeam = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // req.user 应该由 authUser 中间件提供，如果 authUser 是 Express 风格，
    // 则 Next.js API 路由需要一个中间件来兼容 req.user。
    // 或者，您需要确保 authUser 返回的是一个 Next.js 的 request/response 组合。
    // 假设 req.user 仍然可用
    const userId = (req as any).user?.userId; // 强制转换为 any 以访问 req.user
    const currentUserRole = (req as any).user?.role;
    const currentTeamId = (req as any).user?.team?.teamId;

    const { teamId: newTeamId } = req.body;

    // 1. 基本参数校验
    if (!userId || !newTeamId) {
      // ！！！！ 使用 jsonRes ！！！！
      return jsonRes(res, {
        code: 400, // Bad Request
        message: 'Invalid user ID or new team ID.'
      });
    }

    // 2. 如果当前团队和目标团队相同，无需操作
    if (currentTeamId === newTeamId) {
      // ！！！！ 使用 jsonRes ！！！！
      return jsonRes(res, {
        code: 200, // OK
        message: 'Already in this team.'
      });
    }

    // 3. 权限验证：只有 Root 用户才能通过此 API 切换团队
    // 根据您的确认：Root 用户角色是 TeamMemberRoleEnum.owner
    if (currentUserRole !== TeamMemberRoleEnum.owner) {
      // ！！！！ 使用 jsonRes ！！！！
      return jsonRes(res, {
        code: 403, // Forbidden
        message: 'Permission denied: Only root users can switch teams.'
      });
    }

    // 4. Root 用户逻辑：切换团队仅为“视角切换”，无需验证成员身份
    await updateCurrentUserTeamInDB(userId, newTeamId);

    // 5. 返回成功响应
    // ！！！！ 使用 jsonRes ！！！！
    jsonRes(res, {
      code: 200, // OK
      message: 'Team switched successfully.'
    });
  } catch (err) {
    console.error('Error in switchUserTeam API:', err);
    // 统一的错误响应处理，可以利用 jsonRes 的 error 参数
    jsonRes(res, {
      code: 500, // Internal Server Error
      message: 'Server error during team switch.',
      error: err // 将原始错误传递给 jsonRes 进行处理
    });
  }
};

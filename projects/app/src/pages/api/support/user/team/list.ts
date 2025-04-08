// File: projects/app/src/pages/api/support/user/team/list.ts
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import { getResourcePermission } from '@fastgpt/service/support/permission/controller';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { TeamDefaultPermissionVal } from '@fastgpt/global/support/permission/user/constant';
import type { UserType } from '@fastgpt/global/support/user/type';
import type { TeamTmbItemType } from '@fastgpt/global/support/user/team/type';

export type TeamListQuery = {
  status?: TeamMemberStatusEnum;
};

export type TeamListResponse = Array<
  Omit<TeamTmbItemType, 'permission'> & {
    permission: {
      value: number;
      isOwner: boolean;

      hasManagePer: boolean;
      hasWritePer: boolean;
      hasReadPer: boolean;
    };
  }
>;

async function handler(
  req: ApiRequestProps<{}, TeamListQuery>,
  res: ApiResponseType<TeamListResponse>
): Promise<TeamListResponse> {
  // 1. 鉴权获取用户基础信息
  const { userId } = await authCert({ req, authToken: true });
  const user = await MongoUser.findById(userId).lean();
  if (!user) throw new Error('用户不存在');

  // 2. 构建聚合查询
  const { status } = req.query;
  const members = await MongoTeamMember.aggregate([
    {
      $match: {
        userId: user._id,
        ...(status && { status })
      }
    },
    {
      $lookup: {
        from: 'teams',
        localField: 'teamId',
        foreignField: '_id',
        as: 'team'
      }
    },
    { $unwind: '$team' },
    {
      $project: {
        _id: 1,
        teamId: 1,
        role: 1,
        status: 1,
        teamName: '$team.name',
        teamAvatar: '$team.avatar',
        memberName: '$name'
        // notificationAccount: '$team.notificationAccount'
      }
    }
  ]);

  // 3. 构建数据结构（移除外层 UserType 嵌套）
  return Promise.all(
    members.map(async (member) => {
      const Per = await getResourcePermission({
        resourceType: PerResourceTypeEnum.team,
        teamId: member.teamId,
        tmbId: member._id.toString()
      });

      const permission = new TeamPermission({
        per: Per ?? TeamDefaultPermissionVal,
        isOwner: member.role === 'owner'
      });

      return {
        userId: user._id.toString(),
        teamId: member.teamId.toString(),
        teamName: member.teamName,
        memberName: member.memberName,
        avatar: member.teamAvatar || '',
        tmbId: member._id.toString(),
        role: member.role,
        status: member.status,
        permission: {
          // 手动展开属性
          value: permission.value,
          isOwner: permission.isOwner,
          _permissionList: permission._permissionList,
          hasManagePer: permission.hasManagePer,
          hasWritePer: permission.hasWritePer,
          hasReadPer: permission.hasReadPer
        },
        ...(member.notificationAccount && { notificationAccount: member.notificationAccount })
      };
    })
  );
}

export default NextAPI(handler);

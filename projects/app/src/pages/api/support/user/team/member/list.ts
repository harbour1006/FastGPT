import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support/permission/org/orgMemberSchema';
import { MongoOrgModel } from '@fastgpt/service/support/permission/org/orgSchema';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { getResourcePermission } from '@fastgpt/service/support/permission/controller';
import {
  PerResourceTypeEnum,
  ReadPermissionVal
} from '@fastgpt/global/support/permission/constant';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { TeamMemberSchema } from '@fastgpt/global/support/user/team/type';
import { Types } from 'mongoose'; // 导入 Mongoose Types 以处理 ObjectId

export type GetTeamMembersQuery = {
  pageNum: number;
  pageSize: number;
  searchText?: string;
  pageNumStr: string;
  pageSizeStr: string;
};

export type TeamMemberListItemType = {
  avatar: string;
  contact?: string;
  createTime: Date;
  memberName: string | undefined;
  orgs: string[];
  permission: {
    value: number;
    isOwner: boolean;
    _permissionList?: any;
    hasManagePer: boolean;
    hasWritePer: boolean;
    hasReadPer: boolean;
  };
  role: string;
  status: TeamMemberStatusEnum;
  teamId: string;
  tmbId: string;
  userId: string;
  ownerTeam?: string; // 团队名称
};

export type GetTeamMembersResponse = {
  pageNum: number;
  pageSize: number;
  total: number;
  list: TeamMemberListItemType[];
};

async function handler(
  req: ApiRequestProps<{}, GetTeamMembersQuery>,
  res: NextApiResponse<ApiResponseType<GetTeamMembersResponse>>
): Promise<GetTeamMembersResponse> {
  const { pageNumStr = 1, pageSizeStr = 20, searchText = '' } = req.query;

  // 显式转换为数字并验证
  const pageNum = Number(pageNumStr);
  const pageSize = Number(pageSizeStr);
  // 1. Authenticate and authorize user
  const {
    teamId,
    tmbId: userTmbId,
    isRoot
  } = await authUserPer({
    req,
    authToken: true,
    per: ReadPermissionVal
  });

  // 2. Build the MongoDB query
  const baseMatch = {
    ...(isRoot ? {} : { teamId: Types.ObjectId.createFromHexString(teamId as string) }),
    status: { $ne: TeamMemberStatusEnum.leave }
  };

  // 3. Fetch paginated team members and total count using aggregate
  const [members, total] = await Promise.all([
    MongoTeamMember.aggregate([
      {
        $match: baseMatch // 仅使用基础过滤条件
      },
      {
        $lookup: {
          from: 'teams', // 关联 teams集合
          localField: 'teamId',
          foreignField: '_id',
          as: 'team'
        }
      },
      {
        $unwind: '$team' // 展开 user 数组
      },
      // 在关联后应用 teamname 搜索
      ...(searchText
        ? [
            {
              $match: {
                'team.name': { $regex: searchText, $options: 'i' }
              }
            }
          ]
        : []),
      {
        $project: {
          _id: 1,
          teamId: 1,
          userId: 1,
          name: '$team.name', // 使用 username 作为 name
          avatar: 1,
          status: 1,
          role: 1,
          createTime: 1
        }
      },
      { $skip: (pageNum - 1) * pageSize },
      { $limit: pageSize }
    ]),
    // 调整 total 计算，考虑 username 过滤
    MongoTeamMember.aggregate([
      {
        $match: baseMatch
      },
      {
        $lookup: {
          from: 'teams',
          localField: 'teamId',
          foreignField: '_id',
          as: 'team'
        }
      },
      {
        $unwind: '$team'
      },
      ...(searchText
        ? [
            {
              $match: {
                'team.name': { $regex: searchText, $options: 'i' }
              }
            }
          ]
        : []),
      {
        $count: 'total'
      }
    ]).then((result) => (result.length > 0 ? result[0].total : 0))
  ]);

  // 4. Fetch related data (user contact, orgs, permissions, and team name) for each member
  const list = await Promise.all(
    members.map(async (member) => {
      const user = await MongoUser.findOne({ _id: member.userId }, 'contact username').lean();
      const orgMemberships = await MongoOrgMemberModel.find(
        { teamId: member.teamId, tmbId: member._id },
        'orgId'
      ).lean();
      const orgIds = orgMemberships.map((om) => om.orgId);
      const orgsData = await MongoOrgModel.find({ _id: { $in: orgIds } }, 'path').lean();
      const orgPaths = orgsData.map((org) => org.path).filter((path): path is string => !!path);

      const memberPer = await getResourcePermission({
        resourceType: PerResourceTypeEnum.team,
        teamId: member.teamId,
        tmbId: member._id
      });

      const permission = new TeamPermission({
        per: memberPer || 0,
        isOwner: member.role === 'owner'
      });

      // 查询团队名称
      const team = await MongoTeam.findById(member.teamId, 'name').lean();
      const ownerTeam = team?.name || 'Unknown Team';

      return {
        avatar: member.avatar || '/imgs/avatar/default.svg',
        contact: user?.contact,
        createTime: member.createTime,
        memberName: user?.username,
        orgs: orgPaths,
        permission: {
          value: permission.value,
          isOwner: permission.isOwner,
          _permissionList: permission._permissionList,
          hasManagePer: permission.hasManagePer,
          hasWritePer: permission.hasWritePer,
          hasReadPer: permission.hasReadPer
        },
        role: member.role,
        status: member.status as TeamMemberStatusEnum,
        teamId: member.teamId.toString(),
        tmbId: member._id.toString(),
        userId: member.userId.toString(),
        ownerTeam: ownerTeam
      };
    })
  );

  return {
    pageNum,
    pageSize,
    total,
    list
  };
}

export default NextAPI(handler);

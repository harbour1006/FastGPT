import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import {
  ReadPermissionVal,
  PerResourceTypeEnum
} from '@fastgpt/global/support/permission/constant';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { MongoOrgModel } from '@fastgpt/service/support/permission/org/orgSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support/permission/org/orgMemberSchema';
import { getResourcePermission } from '@fastgpt/service/support/permission/controller';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
// 假设 MongoMemberGroupModel 定义在以下路径，请根据您的实际路径修改
import { MongoMemberGroupModel } from '@fastgpt/service/support/permission/memberGroup/memberGroupSchema';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import type { SearchResult } from '@fastgpt/global/support/user/api';
import type { TeamMemberItemType } from '@fastgpt/global/support/user/team/type';
import type { OrgType } from '@fastgpt/global/support/user/team/org/type';
import { MemberGroupSchemaType } from '@fastgpt/global/support/permission/memberGroup/type';

// Define Query Parameters Type based on frontend definition
export type GetSearchUserGroupOrgQuery = {
  searchKey: string;
  members?: boolean;
  orgs?: boolean;
  groups?: boolean;
};

// Define the structure of a single search result item (matching list.ts)
export type SearchMemberResultItem = {
  avatar: string;
  contact?: string;
  createTime: Date;
  memberName: string | undefined;
  orgs: string[] | undefined;
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
};

async function handler(
  req: ApiRequestProps<{}, GetSearchUserGroupOrgQuery>,
  res: NextApiResponse<ApiResponseType<SearchResult>> // 使用导入的 SearchResult
): Promise<SearchResult> {
  // 使用导入的 SearchResult
  const { searchKey, members = true, orgs = false, groups = false } = req.query;
  const pageNum = 1;
  const pageSize = '1000';

  if (!searchKey) {
    return {
      // 直接返回 SearchResult 类型的数据
      members: [],
      orgs: [],
      groups: []
    };
  } // 1. Authenticate and authorize user
  const { teamId } = await authUserPer({ req, authToken: true, per: ReadPermissionVal });
  const memberList: Omit<TeamMemberItemType, 'teamId' | 'permission'>[] = [];
  const orgList: Omit<OrgType, 'permission' | 'members'>[] = [];
  const groupList: MemberGroupSchemaType[] = [];

  if (members) {
    const memberMatch = {
      teamId: teamId,
      $or: [
        { name: { $regex: searchKey, $options: 'i' } },
        {
          userId: {
            $in: (
              await MongoUser.find(
                {
                  $or: [
                    { username: { $regex: searchKey, $options: 'i' } },
                    { contact: { $regex: searchKey, $options: 'i' } }
                  ]
                },
                '_id'
              ).lean()
            ).map((u) => u._id)
          }
        }
      ]
    };
    const teamMembers = await MongoTeamMember.find(
      memberMatch,
      '_id teamId userId name avatar status role createTime'
    ).lean();
    memberList.push(
      ...(await Promise.all(
        teamMembers.map(async (member) => {
          const user = await MongoUser.findOne({ _id: member.userId }, 'contact username').lean();
          const memberPer = await getResourcePermission({
            resourceType: PerResourceTypeEnum.team,
            teamId: member.teamId,
            tmbId: member._id
          });
          const permission = new TeamPermission({
            per: memberPer || 0,
            isOwner: member.role === 'owner'
          });
          return {
            avatar: member.avatar || '/imgs/avatar/default.svg',
            contact: user?.contact,
            createTime: member.createTime,
            memberName: user?.username || member.name,
            role: member.role,
            status: member.status as TeamMemberStatusEnum,
            tmbId: member._id.toString(),
            userId: member.userId.toString()
          }; // 注意这里返回的是 Omit<TeamMemberItemType, 'teamId' | 'permission'> 的结构
        })
      ))
    );
  }
  //     if (orgs) {
  //       const orgMatch = { teamId: teamId, name: { $regex: searchKey, $options: 'i' } };
  //       const organizations = await MongoOrgModel.find(orgMatch, '_id pathId path name avatar description updateTime').lean();
  //       orgList.push(...organizations.map(org => ({
  //         _id: org._id.toString(),
  //         pathId: org.pathId,
  //         path: org.path,
  //         name: org.name,
  //         avatar: org.avatar || '/imgs/org/default.svg',
  //         description: org.description,
  //         updateTime: org.updateTime,
  //       })));
  //     }
  //
  //     if (groups) {
  //       const groupMatch = { teamId: teamId, name: { $regex: searchKey, $options: 'i' } };
  //       const groupsData = await MongoMemberGroupModel.find(groupMatch, '_id name avatar updateTime').lean();
  //       groupList.push(...groupsData.map(group => ({
  //         _id: group._id.toString(),
  //         name: group.name,
  //         avatar: group.avatar || '/imgs/group/default.svg',
  //         updateTime: group.updateTime,
  //       })));
  //     }
  //
  return { members: memberList, orgs: orgList, groups: groupList }; // 返回符合 SearchResult 类型的数据
}
export default NextAPI(handler);

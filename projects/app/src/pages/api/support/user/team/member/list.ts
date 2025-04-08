import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';

import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support/permission/org/orgMemberSchema'; // Use the model defined earlier
import { MongoOrgModel } from '@fastgpt/service/support/permission/org/orgSchema'; // Use the org model
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { getResourcePermission } from '@fastgpt/service/support/permission/controller';
import {
  PerResourceTypeEnum,
  ReadPermissionVal
} from '@fastgpt/global/support/permission/constant';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { TeamMemberSchema } from '@fastgpt/global/support/user/team/type'; // Assuming this type exists for members

// Define Query Parameters Type
export type GetTeamMembersQuery = {
  pageNum: number;
  pageSize: number;
  searchText?: string; // Optional search text
};

// Define the structure of a single item in the response list
export type TeamMemberListItemType = {
  avatar: string;
  contact?: string; // Contact might be optional
  createTime: Date;
  memberName: string | undefined;
  orgs: string[]; // Array of organization paths or identifiers
  permission: {
    value: number;
    isOwner: boolean;
    _permissionList?: any; // Include the detailed list if needed, adjust type as necessary
    hasManagePer: boolean;
    hasWritePer: boolean;
    hasReadPer: boolean;
  };
  role: string; // Assuming role comes from TeamMemberSchema
  status: TeamMemberStatusEnum;
  teamId: string;
  tmbId: string;
  userId: string;
};

// Define the overall response data structure directly
export type GetTeamMembersResponse = {
  // <--- 修改这里
  pageNum: number;
  pageSize: number;
  total: number;
  list: TeamMemberListItemType[];
};

async function handler(
  req: ApiRequestProps<{}, GetTeamMembersQuery>,
  res: NextApiResponse<ApiResponseType<GetTeamMembersResponse>> // <-- 响应类型可能也需要调整，取决于 ApiResponseType 如何处理泛型
): Promise<GetTeamMembersResponse> {
  // <--- 修改函数返回类型
  const { pageNum = 1, pageSize = 10, searchText = '' } = req.query;

  // 1. Authenticate and authorize user - ensure they have at least read permission for the team
  const { teamId, tmbId: userTmbId } = await authUserPer({
    req,
    authToken: true,
    per: ReadPermissionVal // Require at least read permission to list members
  });

  // 2. Build the MongoDB query
  const searchMatch = searchText
    ? {
        $or: [
          { name: { $regex: searchText, $options: 'i' } }
          // Add search on user contact/username if needed, requires lookup first
          // Example (needs adjustment with $lookup): { 'user.username': { $regex: searchText, $options: 'i' } }
        ]
      }
    : {};

  const match = {
    teamId: teamId,
    status: { $ne: TeamMemberStatusEnum.leave }, // Usually exclude members who left
    ...searchMatch
  };

  // 3. Fetch paginated team members and total count
  const [members, total] = await Promise.all([
    MongoTeamMember.find(match, '_id teamId userId name avatar status role createTime')
      .sort({ createTime: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    MongoTeamMember.countDocuments(match)
  ]);

  // 4. Fetch related data (user contact, orgs, permissions) for each member
  const list = await Promise.all(
    members.map(async (member) => {
      // Fetch user contact (if needed and available)
      const user = await MongoUser.findOne({ _id: member.userId }, 'contact username').lean();

      // Fetch organizations the member belongs to
      const orgMemberships = await MongoOrgMemberModel.find(
        { teamId: teamId, tmbId: member._id },
        'orgId'
      ).lean();
      const orgIds = orgMemberships.map((om) => om.orgId);
      const orgsData = await MongoOrgModel.find({ _id: { $in: orgIds } }, 'path').lean();
      const orgPaths = orgsData.map((org) => org.path).filter((path): path is string => !!path); // Get paths, ensure they are strings

      // Get member's permission in the team
      const memberPer = await getResourcePermission({
        resourceType: PerResourceTypeEnum.team,
        teamId: member.teamId,
        tmbId: member._id // Use the member's tmbId
      });

      const permission = new TeamPermission({
        per: memberPer || 0, // Default to 0 if no specific permission found
        isOwner: member.role === 'owner'
      });

      return {
        avatar: member.avatar || '/imgs/avatar/default.svg', // Provide a default avatar
        contact: user?.contact, // User contact
        createTime: member.createTime,
        memberName: user?.username,
        orgs: orgPaths, // List of organization paths
        permission: {
          value: permission.value,
          isOwner: permission.isOwner,
          _permissionList: permission._permissionList, // Include if needed
          hasManagePer: permission.hasManagePer,
          hasWritePer: permission.hasWritePer,
          hasReadPer: permission.hasReadPer
        },
        role: member.role,
        status: member.status as TeamMemberStatusEnum, // Assuming status matches enum
        teamId: member.teamId.toString(),
        tmbId: member._id.toString(),
        userId: member.userId.toString()
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

// Wrap the handler with the NextAPI middleware
export default NextAPI(handler);

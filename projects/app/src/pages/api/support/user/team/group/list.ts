import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { MongoMemberGroupModel } from '@fastgpt/service/support/permission/memberGroup/memberGroupSchema';
import { MongoGroupMemberModel } from '@fastgpt/service/support/permission/memberGroup/groupMemberSchema';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema'; // Import team model
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { getResourcePermission } from '@fastgpt/service/support/permission/controller';
import {
  PerResourceTypeEnum,
  ReadPermissionVal
} from '@fastgpt/global/support/permission/constant';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { MemberGroupType as GlobalMemberGroupType } from '@fastgpt/global/support/permission/memberGroup/type'; // Import with alias
import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';

// Define the structure for the 'members' array items - includes name and avatar
interface GroupMemberPreviewItem {
  tmbId: string;
  name: string;
  avatar: string;
}

// Define the structure for the 'owner' object (Keep this as is)
interface GroupOwnerInfo {
  tmbId: string;
  name: string;
  avatar: string;
}

// Define the structure for a single item in the response list
// Use Omit to inherit from the base type but exclude conflicting 'members' and 'permission' properties
export interface TeamGroupListItemType
  extends Omit<GlobalMemberGroupType, 'members' | 'permission'> {
  // Inherits _id, teamId, name, avatar, updateTime from MemberGroupSchemaType via GlobalMemberGroupType

  // Explicitly define the members structure required for this API response (with name and avatar)
  members: GroupMemberPreviewItem[];

  // Explicitly define the permission structure required for this API response
  permission: {
    value: number;
    isOwner: boolean;
    _permissionList?: any;
    hasManagePer: boolean;
    hasWritePer: boolean;
    hasReadPer: boolean;
  };

  // Add other properties specific to the API response
  count: number;
  owner: GroupOwnerInfo | null;
  createdAt?: Date; // Keep if needed
}

// Define the overall response data structure (an array of groups)
export type GetTeamGroupsResponse = TeamGroupListItemType[];

// Limit how many members to show in the preview per group
const MEMBER_PREVIEW_LIMIT = 5;

async function handler(
  req: ApiRequestProps,
  res: NextApiResponse<ApiResponseType<GetTeamGroupsResponse>>
): Promise<GetTeamGroupsResponse> {
  // 1. Authenticate and authorize user
  const { teamId, tmbId: requesterTmbId } = await authUserPer({
    req,
    authToken: true,
    per: ReadPermissionVal
  });

  // 2. Fetch team owner info
  const team = await MongoTeam.findById(teamId, 'ownerId').lean();
  if (!team) {
    return Promise.reject(TeamErrEnum.notUser);
  }
  const ownerUserId = team.ownerId;
  const ownerTmb = await MongoTeamMember.findOne(
    { teamId: teamId, userId: ownerUserId },
    '_id name avatar'
  ).lean();
  const ownerInfo: GroupOwnerInfo | null = ownerTmb
    ? {
        tmbId: ownerTmb._id.toString(),
        name: ownerTmb.name,
        avatar: ownerTmb.avatar
      }
    : null;

  // 3. Fetch all groups for the team
  const groups = await MongoMemberGroupModel.find({ teamId }).lean();

  // 4. Process each group
  const result = await Promise.all(
    groups.map(async (group) => {
      const groupId = group._id;

      // Get member count
      const memberCount = await MongoGroupMemberModel.countDocuments({ groupId });

      // Get member preview tmbIds
      const groupMembers = await MongoGroupMemberModel.find({ groupId }, 'tmbId')
        .limit(MEMBER_PREVIEW_LIMIT)
        .lean();
      const memberTmbIds = groupMembers.map((gm) => gm.tmbId);

      // Fetch name and avatar for the preview members from team_members
      const membersData = await MongoTeamMember.find(
        { _id: { $in: memberTmbIds } },
        '_id name avatar' // Select name and avatar
      ).lean();

      // Map to the desired preview structure { tmbId, name, avatar }
      const membersPreview: GroupMemberPreviewItem[] = membersData.map((m) => ({
        tmbId: m._id.toString(),
        name: m.name,
        avatar: m.avatar
      }));

      // Calculate requester's permission on this group (same logic as before)
      let permissionValue = 0;
      try {
        const groupPer = await getResourcePermission({
          resourceType: PerResourceTypeEnum.team || ('memberGroup' as any),
          teamId: teamId,
          tmbId: requesterTmbId
          //   groupId: groupId
        });
        permissionValue = 0;
      } catch (error) {
        console.error(`Could not retrieve permission for group ${groupId}:`, error);
      }

      // Format permission object
      const permission = new TeamPermission({
        per: permissionValue,
        isOwner: false
      });

      return {
        // Populate all fields required by TeamGroupListItemType
        _id: groupId.toString(),
        teamId: group.teamId.toString(),
        name: group.name,
        avatar: group.avatar,
        updateTime: group.updateTime,
        createdAt: (group as any).createdAt,
        count: memberCount,
        members: membersPreview, // Use the array containing {tmbId, name, avatar}
        owner: ownerInfo,
        permission: {
          value: permission.value,
          isOwner: permission.isOwner,
          _permissionList: permission._permissionList,
          hasManagePer: permission.hasManagePer,
          hasWritePer: permission.hasWritePer,
          hasReadPer: permission.hasReadPer
        }
      } as TeamGroupListItemType;
    })
  );

  return result;
}

export default NextAPI(handler);

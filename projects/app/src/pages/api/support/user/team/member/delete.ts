import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { MongoMemberGroupModel } from '@fastgpt/service/support/permission/memberGroup/memberGroupSchema';
import { MongoOrgModel } from '@fastgpt/service/support/permission/org/orgSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support/permission/org/orgMemberSchema';

interface DeleteMemberQuery {
  tmbId: string;
}

interface DeleteMemberResponse {
  success: boolean;
  message?: string;
}

async function handler(
  req: ApiRequestProps<{}, DeleteMemberQuery>,
  res: NextApiResponse<ApiResponseType<DeleteMemberResponse>>
): Promise<DeleteMemberResponse> {
  const { tmbId } = req.query;

  if (!tmbId) {
    return Promise.reject({ code: 400, message: '缺少团队成员 ID (tmbId)' });
  }

  const { userId: requesterUserId } = await authUserPer({ req, authToken: true });

  const teamMemberToDelete = await MongoTeamMember.findById(tmbId).lean();
  if (!teamMemberToDelete) {
    return Promise.reject({ code: 404, message: '找不到要删除的团队成员' });
  }
  const { userId: memberToDeleteUserId, teamId: currentTeamId } = teamMemberToDelete;
  // TODO: Implement proper permission checks using requesterUserId and currentTeamId

  const session = await MongoTeamMember.startSession();
  session.startTransaction();

  try {
    // 3. Delete from team_member_groups (based on teamId)
    await MongoMemberGroupModel.deleteMany({ teamId: currentTeamId }, { session });
    console.log(`Deleted member groups for team: ${currentTeamId}`);

    // 4. Delete from team_orgs (based on teamId)
    await MongoOrgModel.deleteMany({ teamId: currentTeamId }, { session });
    console.log(`Deleted orgs for team: ${currentTeamId}`);

    // 5. Delete from team_org_members (based on tmbId)
    await MongoOrgMemberModel.deleteMany({ tmbId: tmbId }, { session });
    console.log(`Deleted org members for team member: ${tmbId}`);

    // 6. Delete the team member record
    const deletionResult = await MongoTeamMember.findByIdAndDelete(tmbId, { session });
    if (!deletionResult) {
      await session.abortTransaction();
      session.endSession();
      return Promise.reject({ code: 404, message: '找不到要删除的团队成员' });
    }

    // 7. Delete the user (DIRECT DELETE - AS PER YOUR REQUEST)
    const userDeletionResult = await MongoUser.findByIdAndDelete(memberToDeleteUserId, { session });
    if (userDeletionResult) {
      console.log(`Deleted user: ${memberToDeleteUserId}`);
    } else {
      console.log(`User ${memberToDeleteUserId} not found during deletion attempt.`);
    }

    // 8. Delete the team if no members left (DIRECT DELETE - AS PER YOUR REQUEST)
    const remainingMembers = await MongoTeamMember.countDocuments(
      { teamId: currentTeamId },
      { session }
    );
    if (remainingMembers === 0) {
      const teamDeletionResult = await MongoTeam.findByIdAndDelete(currentTeamId, { session });
      if (teamDeletionResult) {
        console.log(`Deleted team: ${currentTeamId}`);
      } else {
        console.log(`Team ${currentTeamId} not found during deletion attempt.`);
      }
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: '团队成员及相关数据已成功删除'
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('删除团队成员及相关数据失败:', error);
    return Promise.reject({
      code: 500,
      message: '删除团队成员及相关数据失败',
      error: error.message
    });
  }
}

export default NextAPI(handler);

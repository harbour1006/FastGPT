import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
// import { checkTeamManagePermission } from '@fastgpt/service/support/permission/team/manage'; // Consider adding this back
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';

// Define Request Query Type (as per frontend's DELETE request)
interface DeleteMemberQuery {
  tmbId: string; // Team Member ID to delete
}

// Define Response Type (can be a simple success message or more detailed)
interface DeleteMemberResponse {
  success: boolean;
  message?: string;
}

async function handler(
  req: ApiRequestProps<{}, DeleteMemberQuery>, // Empty body, query parameters
  res: NextApiResponse<ApiResponseType<DeleteMemberResponse>>
): Promise<DeleteMemberResponse> {
  const { tmbId } = req.query;

  if (!tmbId) {
    return Promise.reject({ code: 400, message: '缺少团队成员 ID (tmbId)' });
  } // 1. Authenticate user (identify the requester)

  const { userId: requesterUserId } = await authUserPer({ req, authToken: true }); // 2. Authorize user to perform this action (e.g., team owner or admin)
  // TODO: Implement proper permission checks to ensure the requester can delete members from this team.
  // You might need to fetch the teamId associated with the tmbId and then check permissions.
  // Example (you'll need to implement checkTeamManagePermission):
  // const teamMemberToDelete = await MongoTeamMember.findById(tmbId).lean();
  // if (!teamMemberToDelete?.teamId) {
  //   return Promise.reject({ code: 404, message: '找不到要删除的团队成员' });
  // }
  // await checkTeamManagePermission(requesterUserId, teamMemberToDelete.teamId);
  // 3. Find and delete the team member

  const deletionResult = await MongoTeamMember.findByIdAndDelete(tmbId);

  if (!deletionResult) {
    return Promise.reject({ code: 404, message: '找不到要删除的团队成员' });
  } // 4. Return success response

  return {
    success: true,
    message: '团队成员已成功删除'
  };
}

export default NextAPI(handler);

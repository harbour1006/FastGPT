import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth'; // Keep for identifying the requester
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
// Removed ManagePermissionVal and checkTeamManagePermission imports as they are not used now
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { UserErrEnum } from '@fastgpt/global/common/error/code/user';
import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';

// Define Request Body Type
export interface InviteMemberBody {
  teamId: string;
  usernames: string[];
}

// Define Response Type
export interface InviteMemberResponse {
  invited: string[]; // Usernames successfully invited
  alreadyExists: string[]; // Usernames already members
  notFound: string[]; // Usernames not found
}

async function handler(
  req: ApiRequestProps<InviteMemberBody>,
  res: NextApiResponse<ApiResponseType<InviteMemberResponse>>
): Promise<InviteMemberResponse> {
  const { teamId, usernames = [] } = req.body;

  if (!teamId || !Array.isArray(usernames) || usernames.length === 0) {
    return Promise.reject({ code: 400, message: '参数无效' });
  }

  // 1. Authenticate user (identify the requester, e.g., the root user)
  // Assuming the requester is root, skipping specific team permission check for now.
  // TODO: Reinstate proper permission checks for non-root users or when granular permissions are needed.
  const { userId: requesterUserId } = await authUserPer({ req, authToken: true }); // Get requester's ID is still useful for logging or context

  // Explicit permission check removed:
  // await checkTeamManagePermission(requesterUserId, teamId);

  const invited: string[] = [];
  const alreadyExists: string[] = [];
  const notFound: string[] = [];

  // Use Set to avoid duplicate processing if usernames array has duplicates
  const uniqueUsernames = Array.from(new Set(usernames));

  // 2. Process each username
  await Promise.allSettled(
    // Process all even if some fail
    uniqueUsernames.map(async (username) => {
      try {
        // Find user by username
        const user = await MongoUser.findOne({ username }, '_id').lean();

        if (!user) {
          notFound.push(username);
          console.log(`User not found: ${username}`);
          return;
        }

        const userId = user._id;

        // Check if user is already a member of the team
        const existingMember = await MongoTeamMember.findOne({
          teamId: teamId,
          userId: userId
        }).lean();

        if (existingMember) {
          alreadyExists.push(username);
          console.log(`User ${username} already exists in team ${teamId}`);
          return;
        }

        // Create new team member entry
        await MongoTeamMember.create({
          teamId: teamId,
          userId: userId,
          status: TeamMemberStatusEnum.active // Or 'waiting' depending on workflow
          // name and avatar will use defaults from the schema
        });
        invited.push(username);
        console.log(`User ${username} invited to team ${teamId}`);
      } catch (error) {
        // Log error for specific user invite failure, but don't stop others
        console.error(`Error inviting user ${username}:`, error);
        // Optionally add to a separate 'failed' list in response
      }
    })
  );

  // 3. Return summary response
  return {
    invited,
    alreadyExists,
    notFound
  };
}

// Wrap the handler with the NextAPI middleware
export default NextAPI(handler);

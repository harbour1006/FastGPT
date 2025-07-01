// C:\FastGPT\gitHubCode2\FastGPT\projects\app\src\pages\api\support\user\team\switch.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { TeamMemberRoleEnum } from '@fastgpt/global/support/user/team/constant';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';

async function updateCurrentUserTeamInDB(userId: string, newTeamId: string) {
  try {
    const newTeam = await MongoTeam.findById(newTeamId);
    if (!newTeam) {
      throw new Error(`Team with ID ${newTeamId} not found.`);
    }
    const updatedUser = await MongoUser.findByIdAndUpdate(
      userId,
      {
        'team.teamId': newTeamId,
        'team.teamName': newTeam.name,
        'team.avatar': newTeam.avatar
      },
      { new: true }
    );
    console.log(`User ${userId} successfully updated current active team to ${newTeamId}`);
    return updatedUser;
  } catch (err) {
    console.error('Failed to update current user team in DB:', err);
    throw err;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return jsonRes(res, { code: 405, message: 'Method Not Allowed' });
  }

  try {
    const { tmb, isRoot } = await authUserPer({ req, authToken: true });

    const userId = tmb.userId;
    const currentTeamId = tmb.teamId;
    const { teamId: newTeamId } = req.body;

    if (!userId || !newTeamId) {
      return jsonRes(res, { code: 400, message: 'Invalid user ID or new team ID.' });
    }

    if (currentTeamId === newTeamId) {
      return jsonRes(res, { code: 200, message: 'Already in this team.' });
    }

    // 权限验证
    if (!isRoot) {
      const userTeams = await MongoTeam.find({ 'members.userId': userId });
      if (!userTeams.some((team) => team._id.toString() === newTeamId)) {
        return jsonRes(res, { code: 403, message: 'Permission denied. User not in target team.' });
      }
    }

    const updatedUser = await updateCurrentUserTeamInDB(userId, newTeamId);
    console.log('Updated user data:', JSON.stringify(updatedUser, null, 2));

    return jsonRes(res, {
      code: 200,
      message: 'Team switched successfully.',
      data: updatedUser // 返回更新后的用户数据
    });
  } catch (err: any) {
    console.error('Error in switchUserTeam API:', err);
    if (err.message && typeof err.message === 'string') {
      if (err.message.startsWith('tmbId')) {
        jsonRes(res, { code: 401, message: 'Authentication failed or user/team not found.' });
      } else if (err.message.includes('Permission denied')) {
        jsonRes(res, { code: 403, message: 'Permission denied.' });
      } else if (err.message.includes('Team with ID') && err.message.includes('not found')) {
        jsonRes(res, { code: 404, message: 'Target team not found.' });
      } else {
        jsonRes(res, {
          code: 500,
          message: 'Server error during team switch.',
          error: err.message
        });
      }
    } else {
      jsonRes(res, { code: 500, message: 'An unknown server error occurred.' });
    }
  }
}

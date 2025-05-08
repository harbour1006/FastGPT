import type { NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import {
  ReadPermissionVal,
  PerResourceTypeEnum
} from '@fastgpt/global/support/permission/constant';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { MongoMemberGroupModel } from '@fastgpt/service/support/permission/memberGroup/memberGroupSchema';
import { MongoOrgModel } from '@fastgpt/service/support/permission/org/orgSchema';
import { Types } from 'mongoose';

// 定义查询参数类型
interface RequestQuery {
  datasetId?: string;
}

// 定义返回数据类型
interface CollaboratorResponse {
  tmbId?: string;
  teamId: string;
  permission: {
    value: number;
    isOwner: boolean; // 需要根据逻辑判断
    _permissionList: Record<
      string,
      { name: string; description: string; value: number; checkBoxType: string }
    >;
    hasManagePer: boolean;
    hasWritePer: boolean;
    hasReadPer: boolean;
  };
  name?: string;
  avatar?: string;
  groupId?: string;
  orgId?: string;
  type: 'member' | 'group' | 'org';
}

type ListCollaboratorResponseData = CollaboratorResponse[];

async function handler(
  req: ApiRequestProps<{}, RequestQuery>,
  res: NextApiResponse<{
    code: number;
    statusText: string;
    message: string;
    data: ListCollaboratorResponseData;
  }>
) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ code: 405, statusText: '', message: 'Method Not Allowed', data: [] });
  }

  const { datasetId } = req.query;

  if (!datasetId) {
    return res
      .status(400)
      .json({ code: 400, statusText: '', message: 'Missing datasetId', data: [] });
  }

  try {
    // 验证用户身份和对数据集的读权限
    const { teamId: currentTeamId, tmbId: currentTmbId } = await authUserPer({
      req,
      authToken: true,
      per: ReadPermissionVal
    });

    const permissions = await MongoResourcePermission.find({
      teamId: new Types.ObjectId(currentTeamId),
      resourceType: PerResourceTypeEnum.dataset,
      resourceId: new Types.ObjectId(datasetId)
    }).lean();

    const collaboratorList: CollaboratorResponse[] = [];

    // 定义权限列表 (需要根据您的系统实际定义)
    const permissionListConfig = {
      read: { name: 'common:permission.read', description: '', value: 4, checkBoxType: 'single' },
      write: { name: 'common:permission.write', description: '', value: 2, checkBoxType: 'single' },
      manage: {
        name: 'common:permission.manager',
        description: '',
        value: 1,
        checkBoxType: 'single'
      }
    };

    const getPermissionObject = (permissionValue: number): CollaboratorResponse['permission'] => {
      return {
        value: permissionValue,
        isOwner: permissionValue === 4294967295, // 根据您的系统定义判断 Owner
        _permissionList: permissionListConfig,
        hasManagePer: !!(permissionValue & permissionListConfig.manage.value),
        hasWritePer: !!(permissionValue & permissionListConfig.write.value),
        hasReadPer: !!(permissionValue & permissionListConfig.read.value)
      };
    };

    for (const perm of permissions) {
      if (perm.tmbId) {
        const member = await MongoTeamMember.findById(perm.tmbId).lean();
        if (member) {
          collaboratorList.push({
            type: 'member',
            tmbId: perm.tmbId.toString(),
            teamId: perm.teamId.toString(),
            permission: getPermissionObject(perm.permission),
            name: member.name || member.userId,
            avatar: member.avatar
          });
        }
      } else if (perm.groupId) {
        const group = await MongoMemberGroupModel.findById(perm.groupId).lean();
        if (group) {
          collaboratorList.push({
            type: 'group',
            groupId: perm.groupId.toString(),
            teamId: perm.teamId.toString(),
            permission: getPermissionObject(perm.permission),
            name: group.name
          });
        }
      } else if (perm.orgId) {
        const org = await MongoOrgModel.findById(perm.orgId).lean();
        if (org) {
          collaboratorList.push({
            type: 'org',
            orgId: perm.orgId.toString(),
            teamId: perm.teamId.toString(),
            permission: getPermissionObject(perm.permission),
            name: org.name
          });
        }
      }
    }

    return res.status(200).json({ code: 200, statusText: '', message: '', data: collaboratorList });
  } catch (error: any) {
    console.error('Error getting collaborator list:', error);
    return res.status(500).json({
      code: 500,
      statusText: '',
      message: error.message || 'Failed to get collaborator list',
      data: []
    });
  }
}

export default NextAPI(handler);

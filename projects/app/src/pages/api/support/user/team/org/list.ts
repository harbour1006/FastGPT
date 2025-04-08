// File: projects/app/src/pages/api/support/user/team/org/list.ts
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { getResourcePermission } from '@fastgpt/service/support/permission/controller';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { TeamDefaultPermissionVal } from '@fastgpt/global/support/permission/user/constant';

// 根据图片中的实际模型名称修正
import { MongoOrgModel } from '@fastgpt/service/support/permission/org/orgSchema';
import { MongoOrgMemberModel } from '@fastgpt/service/support/permission/org/orgMemberSchema';

// 定义聚合结果类型
interface OrgAggregateResult {
  _id: any; // MongoDB ObjectId
  teamId: any;
  name: string;
  path: string;
  pathId: string;
  avatar?: string;
  updateTime: Date;
  createdAt: Date;
  members: Array<{
    _id: any;
    teamId: any;
    orgId: any;
    tmbId: any;
  }>;
}

export type OrgListResponse = Array<{
  _id: string;
  teamId: string;
  name: string;
  path: string;
  pathId: string;
  avatar?: string;
  updateTime: string;
  createdAt: string;
  members: Array<{
    _id: string;
    teamId: string;
    orgId: string;
    tmbId: string;
  }>;
  permission: {
    value: number;
    isOwner: boolean;
    _permissionList: {
      read: { name: string; description: string; value: number; checkBoxType: string };
      write: { name: string; description: string; value: number; checkBoxType: string };
      manage: { name: string; description: string; value: number; checkBoxType: string };
    };
    hasManagePer: boolean;
    hasWritePer: boolean;
    hasReadPer: boolean;
  };
}>;

async function handler(
  req: ApiRequestProps,
  res: ApiResponseType<OrgListResponse>
): Promise<OrgListResponse> {
  // 1. 鉴权
  const { teamId, tmbId } = await authCert({ req, authToken: true });

  // 2. 聚合查询（修正集合名称和字段映射）
  const orgs = await MongoOrgModel.aggregate<OrgAggregateResult>([
    {
      $match: { teamId: teamId } // 使用 ObjectId 匹配
    },
    {
      $lookup: {
        from: 'team_org_members', // 根据图片中的集合名称修正
        localField: '_id',
        foreignField: 'orgId',
        as: 'members'
      }
    },
    {
      $project: {
        _id: 1,
        teamId: 1,
        name: 1,
        path: 1,
        pathId: 1,
        avatar: 1,
        updateTime: 1,
        createdAt: 1,
        members: {
          $map: {
            input: '$members',
            as: 'm',
            in: {
              _id: '$$m._id',
              teamId: '$$m.teamId',
              orgId: '$$m.orgId',
              tmbId: '$$m.tmbId'
            }
          }
        }
      }
    }
  ]);

  // 3. 处理权限和类型转换
  return Promise.all(
    orgs.map(async (org) => {
      const Per = await getResourcePermission({
        resourceType: PerResourceTypeEnum.team,
        teamId: teamId,
        tmbId: tmbId
      });

      const permission = new TeamPermission({
        per: Per ?? TeamDefaultPermissionVal,
        isOwner: false // 根据图片中的控制器逻辑设置
      });

      return {
        ...org,
        _id: org._id.toString(),
        teamId: org.teamId.toString(),
        updateTime: org.updateTime.toISOString(),
        createdAt: org.createdAt.toISOString(),
        members: org.members.map((m) => ({
          _id: m._id.toString(),
          teamId: m.teamId.toString(),
          orgId: m.orgId.toString(),
          tmbId: m.tmbId.toString()
        })),
        permission: {
          value: permission.value,
          isOwner: permission.isOwner,
          _permissionList: {
            read: {
              name: 'common:permission.read',
              description: '',
              value: 4,
              checkBoxType: 'single'
            },
            write: {
              name: 'common:permission.write',
              description: '',
              value: 2,
              checkBoxType: 'single'
            },
            manage: {
              name: 'common:permission.manager',
              description: '',
              value: 1,
              checkBoxType: 'single'
            }
          },
          hasManagePer: permission.hasManagePer,
          hasWritePer: permission.hasWritePer,
          hasReadPer: permission.hasReadPer
        }
      };
    })
  );
}

export default NextAPI(handler);

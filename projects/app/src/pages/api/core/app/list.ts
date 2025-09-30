import { MongoApp } from '@fastgpt/service/core/app/schema';
import { AppListItemType } from '@fastgpt/global/core/app/type';
import { NextAPI } from '@/service/middleware/entry';
import mongoose from 'mongoose';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
import {
  PerResourceTypeEnum,
  ReadPermissionVal
} from '@fastgpt/global/support/permission/constant';
import { AppPermission } from '@fastgpt/global/support/permission/app/controller';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { ParentIdType } from '@fastgpt/global/common/parentFolder/type';
import { parseParentIdInMongo } from '@fastgpt/global/common/parentFolder/utils';
import { AppFolderTypeList, AppTypeEnum } from '@fastgpt/global/core/app/constants';
import { AppDefaultPermissionVal } from '@fastgpt/global/support/permission/app/constant';
import { authApp } from '@fastgpt/service/support/permission/app/auth';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { replaceRegChars } from '@fastgpt/global/common/string/tools';
import { concatPer } from '@fastgpt/service/support/permission/controller';
import { getGroupsByTmbId } from '@fastgpt/service/support/permission/memberGroup/controllers';
import { getOrgIdSetWithParentByTmbId } from '@fastgpt/service/support/permission/org/controllers';
import { addSourceMember } from '@fastgpt/service/support/user/utils';

export type ListAppBody = {
  parentId?: ParentIdType;
  type?: AppTypeEnum | AppTypeEnum[];
  getRecentlyChat?: boolean;
  searchKey?: string;
};

/*
  获取 APP 列表权限
  1. 校验 folder 权限和获取 team 权限（owner 单独处理）
  2. 获取 team 下所有 app 权限。获取我的所有组。并计算出我所有的app权限。
  3. 过滤我有的权限的 app，以及当前 parentId 的 app（由于权限继承问题，这里没法一次性根据 id 去获取）
  4. 根据过滤条件获取 app 列表
  5. 遍历搜索出来的 app，并赋予权限（继承的 app，使用 parent 的权限）
  6. 再根据 read 权限进行一次过滤。
*/

async function handler(req: ApiRequestProps<ListAppBody>): Promise<AppListItemType[]> {
  const { parentId, type, getRecentlyChat, searchKey } = req.body;

  // Auth user permission
  const [{ tmbId, teamId, permission: teamPer }] = await Promise.all([
    authUserPer({
      req,
      authToken: true,
      authApiKey: true,
      per: ReadPermissionVal
    }),
    ...(parentId
      ? [
          authApp({
            req,
            authToken: true,
            authApiKey: true,
            appId: parentId,
            per: ReadPermissionVal
          })
        ]
      : [])
  ]);
  // Get team all app permissions
  const [perList, myGroupMap, myOrgSet] = await Promise.all([
    MongoResourcePermission.find({
      resourceType: PerResourceTypeEnum.app,
      teamId,
      resourceId: {
        $exists: true
      }
    }).lean(),
    getGroupsByTmbId({
      tmbId,
      teamId
    }).then((item) => {
      const map = new Map<string, 1>();
      item.forEach((item) => {
        map.set(String(item._id), 1);
      });
      return map;
    }),
    getOrgIdSetWithParentByTmbId({
      teamId,
      tmbId
    })
  ]);
  // Get my permissions
  const myPerList = perList.filter(
    (item) =>
      String(item.tmbId) === String(tmbId) ||
      myGroupMap.has(String(item.groupId)) ||
      myOrgSet.has(String(item.orgId))
  );

  const findAppsQuery = (() => {
    const teamObjectId = new mongoose.Types.ObjectId(teamId);
    if (getRecentlyChat) {
      return {
        // get all chat app
        teamId: teamObjectId
        // type: { $in: [AppTypeEnum.workflow, AppTypeEnum.simple, AppTypeEnum.plugin] }
      };
    }

    // Filter apps by permission, if not owner, only get apps that I have permission to access
    const idList = { _id: { $in: myPerList.map((item) => item.resourceId) } };
    const appPerQuery = teamPer.isOwner
      ? {}
      : parentId
        ? {
            $or: [idList, parseParentIdInMongo(parentId)]
          }
        : { $or: [idList, { parentId: null }] };

    const searchMatch = searchKey
      ? {
          $or: [
            { name: { $regex: new RegExp(`${replaceRegChars(searchKey)}`, 'i') } },
            { intro: { $regex: new RegExp(`${replaceRegChars(searchKey)}`, 'i') } }
          ]
        }
      : {};

    if (searchKey) {
      return {
        ...appPerQuery,
        teamId: teamObjectId,
        ...searchMatch
      };
    }

    return {
      ...appPerQuery,
      teamId: teamObjectId,
      // ...(type && (Array.isArray(type) ? { type: { $in: type } } : { type })),
      ...parseParentIdInMongo(parentId)
    };
  })();
  const limit = (() => {
    if (getRecentlyChat) return 15;
    if (searchKey) return 20;
    return 1000;
  })();

  const myApps = await MongoApp.aggregate([
    {
      $match: findAppsQuery
    },

    {
      $lookup: {
        from: 'team_member_groups',
        localField: 'teamId',
        foreignField: 'teamId',
        as: 'teamGroups'
      }
    },

    {
      $project: {
        _id: 1,
        parentId: 1,
        avatar: 1,
        type: 1,
        name: 1,
        intro: 1,
        tmbId: 1,
        updateTime: 1,
        pluginData: 1,
        inheritPermission: 1,
        teamGroups: {
          $cond: {
            // 使用 $cond (if-then-else) 来检查数组是否为空
            if: { $gt: [{ $size: '$teamGroups' }, 0] }, // 如果 teamGroups 数组大小大于 0
            then: { $toString: { $arrayElemAt: ['$teamGroups._id', 0] } }, // 则取第一个元素的 _id 并转字符串
            else: null // 否则为 null (或者可以设置为 ""、[] 等)
          }
        }
      }
    },
    {
      $sort: {
        updateTime: -1
      }
    },
    {
      $limit: limit
    }
  ]);

  // Add app permission and filter apps by read permission
  const formatApps = myApps
    .map((app) => {
      const { Per, privateApp } = (() => {
        const getPer = (appId: string) => {
          const tmbPer = myPerList.find(
            (item) => String(item.resourceId) === appId && !!item.tmbId
          )?.permission;
          const groupPer = concatPer(
            myPerList
              .filter(
                (item) => String(item.resourceId) === appId && (!!item.groupId || !!item.orgId)
              )
              .map((item) => item.permission)
          );

          return new AppPermission({
            per: tmbPer ?? groupPer ?? AppDefaultPermissionVal,
            isOwner: String(app.tmbId) === String(tmbId) || teamPer.isOwner
          });
        };

        const getClbCount = (appId: string) => {
          return perList.filter((item) => String(item.resourceId) === String(appId)).length;
        };

        // Inherit app, check parent folder clb
        if (!AppFolderTypeList.includes(app.type) && app.parentId && app.inheritPermission) {
          return {
            Per: getPer(String(app.parentId)),
            privateApp: getClbCount(String(app.parentId)) <= 1
          };
        }

        return {
          Per: getPer(String(app._id)),
          privateApp: AppFolderTypeList.includes(app.type)
            ? getClbCount(String(app._id)) <= 1
            : getClbCount(String(app._id)) === 0
        };
      })();

      return {
        ...app,
        permission: Per,
        private: privateApp
      };
    })
    .filter((app) => app.permission.hasReadPer);

  return addSourceMember({
    list: formatApps
  });
}

export default NextAPI(handler);

import React, { ReactNode, useState, useEffect, useCallback } from 'react';
import { createContext } from 'use-context-selector';
import type { EditTeamFormDataType } from '../team/EditInfoModal';
import dynamic from 'next/dynamic';
import { getTeamList, getTeamMembers, putSwitchTeam } from '@/web/support/user/team/api';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import { useUserStore } from '@/web/support/user/useUserStore';
import type { TeamTmbItemType, TeamMemberItemType } from '@fastgpt/global/support/user/team/type';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { useTranslation } from 'next-i18next';
import { getGroupList } from '@/web/support/user/team/group/api';
import { MemberGroupListType } from '@fastgpt/global/support/permission/memberGroup/type';
import { useScrollPagination } from '@fastgpt/web/hooks/useScrollPagination';
import { getOrgList } from '@/web/support/user/team/org/api';
import { OrgType } from '@fastgpt/global/support/user/team/org/type';

const EditInfoModal = dynamic(() => import('./EditUserModal'));

type TeamModalContextType = {
  myTeams: TeamTmbItemType[];
  members: TeamMemberItemType[];
  groups: MemberGroupListType;
  orgs: OrgType[];
  isLoading: boolean;
  currentTeamId: string | undefined; // 添加当前团队 ID 状态
  contact: string | undefined;
  onSwitchTeam: (teamId: string) => void;
  setEditTeamData: React.Dispatch<React.SetStateAction<EditTeamFormDataType | undefined>>;

  refetchMembers: () => void;
  refetchTeams: () => void;
  refetchGroups: () => void;
  refetchOrgs: () => void;
  teamSize: number;
  MemberScrollData: ReturnType<typeof useScrollPagination>['ScrollData'];
};

export const TeamContext = createContext<TeamModalContextType>({
  myTeams: [],
  groups: [],
  members: [],
  orgs: [],
  isLoading: false,
  currentTeamId: undefined, // 初始化为 undefined
  contact: undefined,
  onSwitchTeam: function (_teamId: string): void {
    throw new Error('Function not implemented.');
  },
  setEditTeamData: function (_value: React.SetStateAction<EditTeamFormDataType | undefined>): void {
    throw new Error('Function not implemented.');
  },
  refetchTeams: function (): void {
    throw new Error('Function not implemented.');
  },
  refetchMembers: function (): void {
    throw new Error('Function not implemented.');
  },
  refetchGroups: function (): void {
    throw new Error('Function not implemented.');
  },
  refetchOrgs: function (): void {
    throw new Error('Function not implemented.');
  },
  teamSize: 0,
  MemberScrollData: () => <></>
});

export const TeamModalContextProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [editTeamData, setEditTeamData] = useState<EditTeamFormDataType>();
  const { userInfo, initUserInfo } = useUserStore();
  console.log('11111111', userInfo);
  const [currentTeamId, setCurrentTeamId] = useState<string | undefined>(userInfo?.team?.teamId); // 初始化为当前用户的 teamId
  const [contact, setContact] = useState<string | undefined>(); // 初始化为当前用户的 teamId
  console.log('currentTeamId', currentTeamId);
  const {
    data: myTeams = [],
    loading: isLoadingTeams,
    refresh: refetchTeams
  } = useRequest2(() => getTeamList(TeamMemberStatusEnum.active), {
    manual: false,
    refreshDeps: [userInfo?._id]
  });

  useEffect(() => {
    if (userInfo?.team?.teamId && !currentTeamId) {
      setCurrentTeamId(userInfo.team.teamId);
    }
  }, [userInfo?.team?.teamId, currentTeamId]);

  const {
    data: orgs = [],
    loading: isLoadingOrgs,
    refresh: refetchOrgs
  } = useRequest2(getOrgList, {
    manual: false,
    refreshDeps: [currentTeamId] // 依赖 currentTeamId
  });

  // member action

  const {
    data: members = [],
    isLoading: loadingMembers,
    refreshList: refetchMembers,
    total: memberTotal,
    ScrollData: MemberScrollData
    // setParams: setMemberParams // 获取 setParams 函数
  } = useScrollPagination(getTeamMembers, {
    pageSize: 1000,
    params: {
      withLeaved: true,
      teamId: currentTeamId // 初始包含 teamId
    },
    refreshDeps: [currentTeamId] // 当 currentTeamId 变化时重新加载
  });

  const onSwitchTeam = useCallback(
    async (teamId: string) => {
      setCurrentTeamId(teamId); // 更新当前团队 ID
      await putSwitchTeam(teamId);
      return initUserInfo();
    },
    [initUserInfo, putSwitchTeam, setCurrentTeamId]
  );

  const {
    data: groups = [],
    loading: isLoadingGroups,
    refresh: refetchGroups
  } = useRequest2(getGroupList, {
    manual: false,
    refreshDeps: [currentTeamId] // 依赖 currentTeamId
  });

  const isLoading = isLoadingTeams || loadingMembers || isLoadingGroups || isLoadingOrgs;

  const contextValue = {
    contact,
    myTeams,
    refetchTeams,
    isLoading,
    onSwitchTeam,
    orgs,
    refetchOrgs,
    currentTeamId, // 导出 currentTeamId

    // create | update team
    setEditTeamData,
    members,
    refetchMembers,
    groups,
    refetchGroups,
    teamSize: memberTotal,
    MemberScrollData
  };

  return (
    <TeamContext.Provider value={contextValue}>
      {userInfo?.team?.permission && (
        <>
          {children}
          {/* {!!editTeamData && (
                        <EditInfoModal
                            defaultData={editTeamData}
                            onClose={() => setEditTeamData(undefined)}
                            onSuccess={() => {
                                refetchTeams();
                                initUserInfo();
                            }}
                        />
                    )} */}
        </>
      )}
    </TeamContext.Provider>
  );
};

export default TeamModalContextProvider;

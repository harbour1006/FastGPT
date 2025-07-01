import React, { ReactNode, useState, useEffect, useCallback } from 'react';
import { createContext } from 'use-context-selector';
import { Box, Flex } from '@chakra-ui/react';
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
import { useToast } from '@fastgpt/web/hooks/useToast';
const EditInfoModal = dynamic(() => import('./EditUserModal'));
type TeamModalContextType = {
  myTeams: TeamTmbItemType[];
  members: TeamMemberItemType[];
  groups: MemberGroupListType;
  orgs: OrgType[];
  isLoading: boolean;
  currentTeamId: string | undefined;
  contact: string | undefined;
  onSwitchTeam: (teamId: string) => Promise<void>;
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
  currentTeamId: undefined,
  contact: undefined,
  onSwitchTeam: async (_teamId: string) => {
    throw new Error('Function not implemented.');
  },
  setEditTeamData: (_value: React.SetStateAction<EditTeamFormDataType | undefined>) => {
    throw new Error('Function not implemented.');
  },
  refetchTeams: () => {
    throw new Error('Function not implemented.');
  },
  refetchMembers: () => {
    throw new Error('Function not implemented.');
  },
  refetchGroups: () => {
    throw new Error('Function not implemented.');
  },
  refetchOrgs: () => {
    throw new Error('Function not implemented.');
  },
  teamSize: 0,
  MemberScrollData: () => <></>
});
export const TeamModalContextProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editTeamData, setEditTeamData] = useState<EditTeamFormDataType>();
  const { userInfo, initUserInfo, setUserInfo } = useUserStore();
  const [currentTeamId, setCurrentTeamId] = useState<string | undefined>(userInfo?.team?.teamId);
  const {
    data: myTeams = [],
    loading: isLoadingTeams,
    refresh: refetchTeams
  } = useRequest2(() => getTeamList(TeamMemberStatusEnum.active), {
    manual: false,
    refreshDeps: [userInfo?._id]
  });
  useEffect(() => {
    if (currentTeamId && userInfo?.team?.teamId !== currentTeamId) {
      // 保持 currentTeamId 优先
      setCurrentTeamId(currentTeamId); // 防止回滚
    } else if (!currentTeamId && userInfo?.team?.teamId) {
      setCurrentTeamId(userInfo.team.teamId); // 初始值
    }
  }, [userInfo?.team?.teamId, currentTeamId]);
  const {
    data: orgs = [],
    loading: isLoadingOrgs,
    refresh: refetchOrgs
  } = useRequest2(getOrgList, {
    manual: false,
    refreshDeps: [currentTeamId]
  });
  const teamIdParam = userInfo?.isRoot ? undefined : currentTeamId;
  const {
    data: members = [],
    isLoading: loadingMembers,
    refreshList: refetchMembers,
    total: memberTotal,
    ScrollData: MemberScrollData
  } = useScrollPagination(getTeamMembers, {
    pageSize: 1000,
    params: {
      withLeaved: true,
      teamId: teamIdParam
    },
    refreshDeps: [currentTeamId]
  });
  const onSwitchTeam = useCallback(
    async (teamId: string) => {
      try {
        const response = await putSwitchTeam(teamId);
        setUserInfo(response.data);
        setCurrentTeamId(teamId);
        refetchMembers(); // 刷新成员数据
        console.log('Team switched successfully, new currentTeamId:', teamId);
      } catch (error) {
        console.error('Failed to switch team:', error);
        toast({ status: 'error', title: t('common:user.team.Switch Team Failed') });
      }
    },
    [setUserInfo, refetchMembers, toast, t]
  );
  const {
    data: groups = [],
    loading: isLoadingGroups,
    refresh: refetchGroups
  } = useRequest2(getGroupList, {
    manual: false,
    refreshDeps: [currentTeamId]
  });
  const isLoading = isLoadingTeams || loadingMembers || isLoadingGroups || isLoadingOrgs;
  const contextValue = {
    contact: userInfo?.team?.notificationAccount,
    myTeams,
    refetchTeams,
    isLoading,
    onSwitchTeam,
    orgs,
    refetchOrgs,
    currentTeamId,
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
      {userInfo?.team?.permission ? (
        <>{children}</>
      ) : (
        <Flex justify="center" align="center" h="200px" flexDirection="column">
          <Box color="gray.500">{'ddf '}</Box>
        </Flex>
      )}
    </TeamContext.Provider>
  );
};
export default TeamModalContextProvider;

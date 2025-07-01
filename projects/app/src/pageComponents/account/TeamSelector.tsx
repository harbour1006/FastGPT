// C:\FastGPT\gitHubCode2\FastGPT\projects\app\src\pageComponents\account\TeamSelector.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { Box, ButtonProps, Flex } from '@chakra-ui/react';
import { useUserStore } from '@/web/support/user/useUserStore';
import { useTranslation } from 'next-i18next';
import Avatar from '@fastgpt/web/components/common/Avatar';
import { getTeamList, putSwitchTeam } from '@/web/support/user/team/api';
import {
  TeamMemberStatusEnum,
  TeamMemberRoleEnum
} from '@fastgpt/global/support/user/team/constant';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import MySelect from '@fastgpt/web/components/common/MySelect';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useRouter } from 'next/router';
import { TeamTmbItemType } from '@fastgpt/global/support/user/team/type';
import { useToast } from '@fastgpt/web/hooks/useToast';

const TeamSelector = ({
  showManage,
  onChange,
  onSelectTeamId,
  currentSelectedTeamId,
  ...props
}: Omit<ButtonProps, 'onChange'> & {
  showManage?: boolean;
  onChange?: () => void;
  onSelectTeamId?: (teamId: string) => void;
  currentSelectedTeamId?: string;
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const { userInfo, initUserInfo } = useUserStore();
  const { setLoading } = useSystemStore();

  const [localSelectedTeamId, setLocalSelectedTeamId] = useState<string | undefined>(
    currentSelectedTeamId
  );

  useEffect(() => {
    if (currentSelectedTeamId && currentSelectedTeamId !== localSelectedTeamId) {
      setLocalSelectedTeamId(currentSelectedTeamId);
    }
  }, [currentSelectedTeamId, localSelectedTeamId]);

  const { data: myTeams = [] } = useRequest2<TeamTmbItemType[], []>(
    () => getTeamList(TeamMemberStatusEnum.active, TeamMemberRoleEnum.owner),
    {
      manual: false,
      refreshDeps: [userInfo]
    }
  );

  const { runAsync: onSwitchTeam } = useRequest2(
    async (teamId: string) => {
      setLoading(true);
      await putSwitchTeam(teamId);
      setLocalSelectedTeamId(teamId);
      onSelectTeamId?.(teamId);
      await initUserInfo();
    },
    {
      onFinally: () => {
        setLoading(false);
        onChange?.();
      },
      errorToast: t('common:user.team.Switch Team Failed')
    }
  );

  const teamList = useMemo(() => {
    return myTeams.map((team) => ({
      label: (
        <Flex
          key={team.teamId}
          alignItems={'center'}
          borderRadius={'md'}
          cursor={'default'}
          gap={3}
          onClick={() => {
            console.log('Team list item clicked, teamId:', team.teamId);
            onSwitchTeam(team.teamId);
          }}
          _hover={{
            cursor: 'pointer'
          }}
        >
          <Avatar src={team.teamAvatar} w={['1.25rem', '1.375rem']} />
          <Box flex={'1 0 0'} w={0} className="textEllipsis" fontSize={'sm'}>
            {team.teamName}
          </Box>
        </Flex>
      ),
      value: team.teamId
    }));
  }, [myTeams, onSwitchTeam]);

  const formatTeamList = useMemo(() => {
    return [
      ...(showManage
        ? [
            {
              label: (
                <Flex
                  key={'manage'}
                  alignItems={'center'}
                  borderRadius={'md'}
                  cursor={'pointer'}
                  gap={3}
                  onClick={() => router.push('/account/team')}
                >
                  <MyIcon name="common/setting" w={['1.25rem', '1.375rem']} />
                  <Box flex={'1 0 0'} w={0} className="textEllipsis" fontSize={'sm'}>
                    {t('user:manage_team')}
                  </Box>
                </Flex>
              ),
              value: 'manage',
              showBorder: true
            }
          ]
        : []),
      ...teamList
    ];
  }, [showManage, t, teamList, router]);

  return (
    <Box w={'100%'}>
      <MySelect {...props} value={localSelectedTeamId} list={formatTeamList} />
    </Box>
  );
};

export default TeamSelector;

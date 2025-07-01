import Avatar from '@fastgpt/web/components/common/Avatar';
import {
  Box,
  Button,
  Flex,
  HStack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack,
  Spinner
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useUserStore } from '@/web/support/user/useUserStore';
import { useConfirm } from '@fastgpt/web/hooks/useConfirm';
import {
  delRemoveMember,
  putSwitchTeam,
  updateStatus,
  getTeamMembers,
  delLeaveTeam
} from '@/web/support/user/team/api';
import Tag from '@fastgpt/web/components/common/Tag';
import { useContextSelector } from 'use-context-selector';
import { TeamContext } from './UserContext';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import MyIcon from '@fastgpt/web/components/common/Icon';
import dynamic from 'next/dynamic';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { postSyncMembers } from '@/web/support/user/api';
import MyLoading from '@fastgpt/web/components/common/MyLoading';
import format from 'date-fns/format';
import SearchInput from '@fastgpt/web/components/common/Input/SearchInput';
import { useState, useCallback, useEffect } from 'react';
import { downloadFetch } from '@/web/common/system/utils';
import { LuPencil, LuTrash2 } from 'react-icons/lu';
import type { TeamMemberItemType } from '@fastgpt/global/support/user/team/type';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import { PaginationProps, PaginationResponse } from '@fastgpt/web/common/fetch/type';

const CreateUserModal = dynamic(() => import('./CreateUserModal'));
const TeamTagModal = dynamic(() => import('@/components/support/user/team/TeamTagModal'));
const EditUserModal = dynamic(() => import('./EditUserModal'));

interface UserTableProps {
  Tabs: React.ReactNode;
}

function UserTable({ Tabs }: UserTableProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { userInfo, teamPlanStatus, initUserInfo } = useUserStore();
  const { feConfigs, setNotSufficientModalType } = useSystemStore();
  const {
    refetchGroups,
    myTeams,
    refetchTeams,
    currentTeamId,
    contact: defaultContact
  } = useContextSelector(TeamContext, (v) => v);

  const {
    isOpen: isOpenTeamTagsAsync,
    onOpen: onOpenTeamTagsAsync,
    onClose: onCloseTeamTagsAsync
  } = useDisclosure();
  const {
    isOpen: isOpenCreateUser,
    onOpen: onOpenCreateTeam,
    onClose: onCloseCreateTeam
  } = useDisclosure();
  const { ConfirmModal: ConfirmRemoveMemberModal, openConfirm: openRemoveMember } = useConfirm({
    type: 'delete'
  });
  const { ConfirmModal: ConfirmRestoreMemberModal, openConfirm: openRestoreMember } = useConfirm({
    type: 'common',
    title: t('account_team:restore_tip_title'),
    iconSrc: 'common/confirm/restoreTip',
    iconColor: 'primary.500'
  });

  const [searchText, setSearchText] = useState<string>('');
  const isSyncMember = feConfigs.register_method?.includes('sync');

  const {
    isOpen: isEditModalOpen,
    onOpen: onEditModalOpen,
    onClose: onEditModalClose
  } = useDisclosure();
  const [editingMember, setEditingMember] = useState<TeamMemberItemType | undefined>(undefined);

  const {
    data: memberPaginationData,
    loading: membersLoading,
    run: fetchMembers,
    error
  } = useRequest2<
    PaginationResponse<TeamMemberItemType>,
    [PaginationProps<{ teamId: string; withLeaved?: boolean; searchText?: string }>]
  >(
    async (params) => {
      if (!params.teamId) {
        return { list: [], total: 0 };
      }
      const res = await getTeamMembers(params);
      return res;
    },
    { manual: true, errorToast: t('account_team:get_members_failed') }
  );

  const members = memberPaginationData?.list || [];

  useEffect(() => {
    if (currentTeamId) {
      fetchMembers({
        teamId: currentTeamId,
        searchText: searchText,
        pageNum: 1,
        pageSize: 20
      });
    } else {
      console.warn('currentTeamId is undefined');
    }
  }, [currentTeamId, searchText, fetchMembers]);

  useEffect(() => {
    if (error) {
      console.error('fetchMembers error from state:', error);
    }
  }, [memberPaginationData, error]);

  const handleSearch = useCallback(() => {
    if (currentTeamId) {
      console.log('handleSearch triggered, currentTeamId:', currentTeamId);
      fetchMembers({
        teamId: currentTeamId,
        searchText: searchText,
        pageNum: 1,
        pageSize: 20
      });
    }
  }, [currentTeamId, searchText, fetchMembers]);

  const { runAsync: onLeaveTeam } = useRequest2<void, []>(
    async () => {
      const defaultTeam = myTeams?.[0];
      await delLeaveTeam();
      if (defaultTeam) {
        await putSwitchTeam(defaultTeam.teamId);
      }
      await initUserInfo();
    },
    {
      onSuccess() {
        refetchTeams();
        toast({ status: 'success', title: t('account_team:user_team_leave_team_success') });
      },
      errorToast: t('account_team:user_team_leave_team_failed')
    }
  );

  const { ConfirmModal: ConfirmLeaveTeamModal, openConfirm: openLeaveConfirm } = useConfirm({
    content: t('account_team:confirm_leave_team')
  });

  const { runAsync: onSyncMember, loading: isSyncing } = useRequest2<void, []>(
    async () => await postSyncMembers(),
    {
      onSuccess() {
        if (currentTeamId) {
          fetchMembers({
            teamId: currentTeamId,
            searchText: searchText,
            pageNum: 1,
            pageSize: 20
          });
        }
      },
      successToast: t('account_team:sync_member_success'),
      errorToast: t('account_team:sync_member_failed')
    }
  );

  const { runAsync: onRestore, loading: isUpdateInvite } = useRequest2<
    void,
    [string, keyof typeof TeamMemberStatusEnum]
  >(
    async (tmbId: string, status: keyof typeof TeamMemberStatusEnum) =>
      await updateStatus({ tmbId, status }),
    {
      onSuccess() {
        if (currentTeamId) {
          fetchMembers({
            teamId: currentTeamId,
            searchText: searchText,
            pageNum: 1,
            pageSize: 20
          });
        }
      },
      successToast: t('common:user.team.invite.Accepted'),
      errorToast: t('common:user.team.invite.Reject')
    }
  );

  const { runAsync: onDelete, loading: isDeleting } = useRequest2<void, [string]>(
    async (tmbId: string) => await delRemoveMember(tmbId),
    {
      onSuccess() {
        refetchTeams();
        if (currentTeamId) {
          fetchMembers({
            teamId: currentTeamId,
            searchText: searchText,
            pageNum: 1,
            pageSize: 20
          });
        }
        toast({
          status: 'success',
          title: t('common:common.Delete Success')
        });
      },
      errorToast: t('common:common.Delete Failed')
    }
  );

  const onEdit = useCallback(
    (member: TeamMemberItemType) => {
      setEditingMember(member);
      onEditModalOpen();
    },
    [onEditModalOpen]
  );

  const handleCreateUserSuccess = useCallback(() => {
    if (currentTeamId) {
      fetchMembers({
        teamId: currentTeamId,
        searchText: searchText,
        pageNum: 1,
        pageSize: 20
      });
    }
  }, [fetchMembers, currentTeamId, searchText]);

  const handleEditUserSuccess = useCallback(() => {
    if (currentTeamId) {
      fetchMembers({
        teamId: currentTeamId,
        searchText: searchText,
        pageNum: 1,
        pageSize: 20
      });
    }
  }, [fetchMembers, currentTeamId, searchText]);

  const isLoading = membersLoading || isUpdateInvite || isSyncing;

  if (!currentTeamId) {
    console.log('Rendering "Please select a team" prompt, currentTeamId:', currentTeamId);
    return (
      <Flex justify="center" align="center" h="200px" flexDirection="column">
        <Spinner size="lg" />
        <Box mt={4} color="gray.500">
          {t('account_team:please_select_team')}
        </Box>
      </Flex>
    );
  }

  const renderMembers = () => {
    if (membersLoading) return <div>Loading...</div>;
    if (!memberPaginationData?.list?.length) return <div>No members found</div>;
    return memberPaginationData.list.map((member) => (
      <Tr key={member.tmbId} overflow={'unset'}>
        <Td>
          <HStack>
            <Avatar src={member.avatar} sizes="sm" mr={2} />
            <Box className={'textEllipsis'}>
              {member.memberName || '-'}
              {member.status === 'waiting' && (
                <Tag ml="2" colorSchema="yellow">
                  {t('account_team:waiting')}
                </Tag>
              )}
              {member.status === 'leave' && (
                <Tag ml="2" colorSchema="gray">
                  {t('account_team:leave')}
                </Tag>
              )}
            </Box>
          </HStack>
        </Td>
        <Td maxW={'300px'}>{member.ownerTeam}</Td>
        <Td maxW={'300px'}>{t(`account_team:${member.role}`)}</Td>
        <Td maxW={'300px'}>{member.contact || '-'}</Td>
        <Td maxW={'300px'}>
          <VStack gap={0}>
            <Box>{format(new Date(member.createTime), 'yyyy-MM-dd HH:mm:ss')}</Box>
            {member.updateTime && (
              <Box color="gray.500" fontSize="xs">
                {format(new Date(member.updateTime), 'yyyy-MM-dd HH:mm:ss')}
              </Box>
            )}
          </VStack>
        </Td>
        <Td>
          <Flex align="center" gap={2}>
            {userInfo?.isRoot && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<LuPencil />}
                  onClick={() => onEdit(member)}
                >
                  {t('common:common.Edit')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<LuTrash2 />}
                  isLoading={isDeleting}
                  onClick={() => openRemoveMember(() => onDelete(member.tmbId))()}
                >
                  {t('common:common.Delete')}
                </Button>
              </>
            )}
            {!userInfo?.isRoot && userInfo?.team?.permission?.isOwner && (
              <>
                {member.tmbId !== userInfo.team?.tmbId && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<LuPencil />}
                      onClick={() => onEdit(member)}
                    >
                      {t('common:common.Edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<LuTrash2 />}
                      isLoading={isDeleting}
                      onClick={() => openRemoveMember(() => onDelete(member.tmbId))()}
                    >
                      {t('common:common.Delete')}
                    </Button>
                  </>
                )}
              </>
            )}
          </Flex>
        </Td>
      </Tr>
    ));
  };

  return (
    <>
      {isLoading && <MyLoading />}
      <Flex justify={'space-between'} align={'center'} pb={'1rem'}>
        {Tabs}
        <HStack alignItems={'center'}>
          <Box width={'200px'}>
            <SearchInput
              placeholder={t('account_team:team_select')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
            />
          </Box>
          {userInfo?.team?.permission?.hasManagePer && !isSyncMember && (
            <Button
              variant={'whitePrimary'}
              size="md"
              borderRadius={'md'}
              ml={3}
              leftIcon={<MyIcon name="core/dataset/tag" w={'16px'} />}
              onClick={() => {
                onOpenTeamTagsAsync();
              }}
            >
              {t('account_team:label_sync')}
            </Button>
          )}
          {userInfo?.team?.permission?.hasManagePer && isSyncMember && (
            <Button
              variant={'primary'}
              size="md"
              borderRadius={'md'}
              ml={3}
              leftIcon={<MyIcon name="common/retryLight" w={'16px'} color={'white'} />}
              onClick={() => {
                onSyncMember();
              }}
            >
              {t('account_team:sync_immediately')}
            </Button>
          )}
          {userInfo?.team?.permission?.hasManagePer && !isSyncMember && (
            <Button
              variant={'primary'}
              size="md"
              borderRadius={'md'}
              ml={3}
              leftIcon={<MyIcon name="common/addLight" w={'16px'} color={'white'} />}
              onClick={onOpenCreateTeam}
            >
              {t('account_team:create_new_user')}
            </Button>
          )}
          {userInfo?.team?.permission?.isOwner && isSyncMember && (
            <Button
              variant={'whitePrimary'}
              size="md"
              borderRadius={'md'}
              ml={3}
              leftIcon={<MyIcon name="export" w={'16px'} />}
              onClick={() => {
                downloadFetch({
                  url: '/api/proApi/support/user/team/member/export',
                  filename: `${userInfo.team?.teamName || 'team'}-${format(new Date(), 'yyyyMMddHHmmss')}.csv`
                });
              }}
            >
              {t('account_team:export_members')}
            </Button>
          )}
          {!userInfo?.team?.permission?.isOwner && (
            <Button
              variant={'whitePrimary'}
              size="md"
              borderRadius={'md'}
              ml={3}
              leftIcon={<MyIcon name={'support/account/loginoutLight'} w={'14px'} />}
              onClick={() => openLeaveConfirm(onLeaveTeam)()}
            >
              {t('account_team:user_team_leave_team')}
            </Button>
          )}
        </HStack>
      </Flex>

      <Box flex={'1 0 0'} overflow={'auto'}>
        <TableContainer overflow={'unset'} fontSize={'sm'}>
          <Table overflow={'unset'}>
            <Thead>
              <Tr bgColor={'white !important'}>
                <Th borderLeftRadius="6px" bgColor="myGray.100">
                  {t('account_team:user_name')}
                </Th>
                <Th bgColor="myGray.100">{t('account_team:owner_team')}</Th>
                <Th bgColor="myGray.100">{t('account_team:user_role')}</Th>
                <Th bgColor="myGray.100">{t('account_team:contact')}</Th>
                <Th bgColor="myGray.100">{t('account_team:join_update_time')}</Th>
                <Th borderRightRadius="6px" bgColor="myGray.100">
                  {t('common:common.Action')}
                </Th>
              </Tr>
            </Thead>
            <Tbody>{renderMembers()}</Tbody>
          </Table>
          <ConfirmRemoveMemberModal />
          <ConfirmRestoreMemberModal />
        </TableContainer>
      </Box>

      <ConfirmLeaveTeamModal />
      <CreateUserModal
        isOpen={isOpenCreateUser}
        onClose={onCloseCreateTeam}
        onSuccess={handleCreateUserSuccess}
        defaultTeamId={currentTeamId}
        contact={defaultContact}
      />
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={onEditModalClose}
        onSuccess={handleEditUserSuccess}
        memberData={editingMember}
      />
      {isOpenTeamTagsAsync && <TeamTagModal onClose={onCloseTeamTagsAsync} />}
    </>
  );
}

export default UserTable;

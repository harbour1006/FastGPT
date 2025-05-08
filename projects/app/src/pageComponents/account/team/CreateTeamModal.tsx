import React, { useState, useCallback } from 'react';
import MyModal from '@fastgpt/web/components/common/MyModal';
import { useTranslation } from 'next-i18next';
import {
  ModalCloseButton,
  ModalBody,
  Box,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  useToast
} from '@chakra-ui/react';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { useRouter } from 'next/router'; // 导入 useRouter
import { useUserStore } from '@/web/support/user/useUserStore'; // 确保已经导入
import { postCreateTeam } from '@/web/support/user/team/api'; // 假设您有创建团队的 API 函数
import type { CreateTeamResponse } from '@/web/support/user/team/api'; // 假设您有创建团队的 Response 类型
import type { CreateTeamProps } from '@fastgpt/global/support/user/team/controller.d';
import { hashStr } from '@fastgpt/global/common/string/tools'; // 导入相同的哈希函数

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // 用于通知父组件刷新团队列表
}

const CreateTeamModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const router = useRouter();

  const [teamName, setTeamName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerContact, setOwnerContact] = useState('');

  const { userInfo } = useUserStore(); // 获取用户信息
  const ROOT_KEY = 'fdafasd';

  const { runAsync: onCreateTeam, loading: isLoading } = useRequest2(
    (payload: Omit<CreateTeamProps, 'ownerId'>) => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (userInfo?.isRoot) {
        headers['rootkey'] = ROOT_KEY;
      }
      return fetch('/api/support/user/team/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      }).then((response) => {
        // 检查 HTTP 状态码是否成功 (2xx)
        if (!response.ok) {
          return response.json().then((error) => {
            throw error; // 将错误信息抛给 onError
          });
        }
        return response.json(); // 返回成功的数据给 onSuccess
      });
    },
    {
      onSuccess(res: CreateTeamResponse) {
        onSuccess();
        toast({
          status: 'success',
          title: t('account_team:create_team_success'),
          isClosable: true
        });
        onClose();
      },
      onError(error) {
        toast({
          status: 'error',
          title: t('account_team:create_team_failed'),
          description: error?.message || t('common:error.unknown'),
          isClosable: true
        });
      }
    }
  );

  const handleCreate = useCallback(() => {
    if (!teamName || !ownerUsername || !ownerPassword) {
      toast({
        status: 'warning',
        title: t('account_team:create_team_required_fields'),
        isClosable: true
      });
      return;
    }
    onCreateTeam({
      name: teamName,
      // ownerId 由后端创建用户后生成
      memberName: ownerUsername, // 可以将创建者用户名作为初始的团队成员名
      ownerPassword: hashStr(ownerPassword), // 在前端进行哈希处理
      ownerContact
    });
  }, [onCreateTeam, teamName, ownerUsername, ownerContact, toast]);

  return (
    <MyModal
      isOpen={isOpen}
      onClose={onClose}
      iconSrc="common/addLight"
      iconColor="primary.600"
      title={t('account_team:create_new_team')}
      maxW={['90vw', '400px']}
      overflow={'unset'}
    >
      <ModalCloseButton onClick={onClose} />
      <ModalBody>
        <FormControl mb={4}>
          <FormLabel htmlFor="teamName">{t('account_team:team_name')}</FormLabel>
          <Input
            id="teamName"
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel htmlFor="ownerUsername">{t('account_team:user_name')}</FormLabel>
          <Input
            id="ownerUsername"
            type="text"
            value={ownerUsername}
            onChange={(e) => setOwnerUsername(e.target.value)}
          />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel htmlFor="ownerPassword">{t('account_team:owner_password')}</FormLabel>
          <Input
            id="ownerPassword"
            type="password"
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
          />
        </FormControl>

        <FormControl mb={4}>
          <FormLabel htmlFor="ownerContact">{t('account_team:owner_contact')}</FormLabel>
          <Input
            id="ownerContact"
            type="text"
            value={ownerContact}
            onChange={(e) => setOwnerContact(e.target.value)}
          />
        </FormControl>
      </ModalBody>
      <ModalFooter>
        <Button colorScheme="blue" mr={3} isLoading={isLoading} onClick={handleCreate}>
          {t('common:common.Confirm')}
        </Button>
        <Button onClick={onClose}>{t('common:common.Cancel')}</Button>
      </ModalFooter>
    </MyModal>
  );
};

export default CreateTeamModal;

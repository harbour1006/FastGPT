import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  useToast,
  VStack
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useState, useCallback, useEffect } from 'react';
import { putUpdateMember } from '@/web/support/user/team/api';
import type { TeamMemberItemType } from '@fastgpt/global/support/user/team/type';
import { useRequest } from '@fastgpt/web/hooks/useRequest'; // 导入 useRequest

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  memberData?: TeamMemberItemType;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  memberData
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');

  useEffect(() => {
    if (memberData) {
      setUsername(memberData.memberName || '');
      setContact(memberData.contact || '');
    } else {
      setUsername('');
      setContact('');
    }
  }, [memberData]);

  const { mutate: onSave, isLoading } = useRequest({
    mutationFn: async (data: { tmbId: string; memberName: string; contact: string }) => {
      if (!data.tmbId || !data.memberName || !data.contact) {
        return Promise.reject(t('account_user:edit_user_form_required'));
      }
      return putUpdateMember(data.tmbId, { memberName: data.memberName, contact: data.contact });
    },
    onSuccess: () => {
      onClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('更新用户信息失败:', error);
    },
    successToast: t('account_user:edit_user_success'),
    errorToast: t('account_user:edit_user_failed') // 这里可以根据 error 添加更详细的信息
  });

  const handleSave = useCallback(() => {
    if (memberData?.tmbId) {
      onSave({ tmbId: memberData.tmbId, memberName: username, contact: contact });
    } else {
      toast({
        title: t('account_user:edit_user_failed'),
        description: t('account_user:member_data_error'),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  }, [memberData?.tmbId, username, contact, onSave, t, toast]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('account_user:edit_user_info')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel htmlFor="username">{t('account_user:user_name')}</FormLabel>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel htmlFor="contact">{t('account_user:contact_number')}</FormLabel>
              <Input
                id="contact"
                type="tel"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose} isDisabled={isLoading}>
            {t('common:common.Cancel')}
          </Button>
          <Button colorScheme="primary" onClick={handleSave} isLoading={isLoading}>
            {t('common:common.Save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditUserModal;

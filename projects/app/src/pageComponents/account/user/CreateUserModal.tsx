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
  VStack,
  Text
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useState, useCallback } from 'react';
import { postCreateUser } from '@/web/support/user/api';
import { hashStr } from '@fastgpt/global/common/string/tools';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultTeamId: string | undefined;
  contact: string | undefined;
}

interface CreateUserResponse {
  message: string;
  userId: string;
  teamId: string; // 后端返回 teamId
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultTeamId
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contact, setContact] = useState('');

  const handleCreateUser = useCallback(async () => {
    if (!username || !password || !contact) {
      toast({
        title: t('account_user:create_user_form_required'),
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t('account_user:create_user_password_mismatch'),
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    setIsLoading(true);
    try {
      const hashedPassword = hashStr(password);
      const response = await postCreateUser({
        username,
        password: hashedPassword,
        teamId: defaultTeamId,
        contact: contact
      });
      if (response.message === '用户创建成功并已添加到团队') {
        toast({
          title: t('account_user:create_user_success'),
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        onClose();
        onSuccess?.();
      } else {
        toast({
          title: t('account_user:create_user_failed'),
          description: response.message,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
      }
    } catch (error: any) {
      toast({
        title: t('account_user:create_user_failed'),
        description: error.message || t('common:error.unknown'),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  }, [username, password, confirmPassword, onClose, onSuccess, t, toast, defaultTeamId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t('account_user:create_new_user')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {/* 表单内容保持不变 */}
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
              <FormLabel htmlFor="password">{t('account_user:password')}</FormLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel htmlFor="confirmPassword">{t('account_user:confirm_password')}</FormLabel>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel htmlFor="contact">{t('common:common.Contact')}</FormLabel>
              <Input
                id="contact"
                type="mobile"
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
          <Button colorScheme="primary" onClick={handleCreateUser} isLoading={isLoading}>
            {t('account_user:create_new_user')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreateUserModal;

import React, { useState, useCallback, useEffect } from 'react';
import MyModal from '@fastgpt/web/components/common/MyModal';
import { useTranslation } from 'next-i18next';
import CollaboratorContextProvider, { MemberManagerInputPropsType } from '../MemberManager/context';
import {
  Box,
  Button,
  Flex,
  HStack,
  ModalBody,
  useDisclosure,
  Switch,
  Spinner
} from '@chakra-ui/react';
import Avatar from '@fastgpt/web/components/common/Avatar';
import MyIcon from '@fastgpt/web/components/common/Icon';
import ResumeInherit from '../ResumeInheritText';
import { ChangeOwnerModal } from '../ChangeOwnerModal';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { useToast } from '@fastgpt/web/hooks/useToast';
import {
  postUpdateAppCollaborators,
  deleteAppCollaborators,
  checkAppGroupReadPermission
} from '@/web/core/app/api/collaborator';
import {
  AppCollaboratorDeleteParams,
  UpdateAppCollaboratorBody
} from '@fastgpt/global/core/app/collaborator';

export type ConfigPerModalProps = {
  avatar?: string;
  name: string;
  groupId: string;
  managePer: MemberManagerInputPropsType & {
    appId: string;
  };
  isInheritPermission?: boolean;
  resumeInheritPermission?: () => void;
  hasParent?: boolean;
  refetchResource?: () => void;
  onChangeOwner?: (tmbId: string) => Promise<unknown>;
  onClose: () => void;
};

const ConfigPerModal = ({
  avatar,
  name,
  groupId,
  managePer,
  isInheritPermission,
  resumeInheritPermission,
  hasParent,
  onClose,
  refetchResource,
  onChangeOwner
}: ConfigPerModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    isOpen: isChangeOwnerModalOpen,
    onOpen: onOpenChangeOwnerModal,
    onClose: onCloseChangeOwnerModal
  } = useDisclosure();

  const READ_PERMISSION_VALUE = 4;

  const [isGroupReadPermitted, setIsGroupReadPermitted] = useState<boolean | undefined>(undefined);

  // API 请求：检查权限状态
  const {
    runAsync: checkPermissionStatus,
    loading: isCheckingPermission // 用于显示加载状态
  } = useRequest2(
    async () => {
      if (!managePer.appId || !groupId) {
        console.warn('Missing appId or groupId for permission check, skipping API call.');
        return false;
      }
      const params: AppCollaboratorDeleteParams = {
        appId: managePer.appId,
        groupId: groupId
      };
      try {
        const result = await checkAppGroupReadPermission(params);
        console.log('API Call: checkPermissionStatus success, result:', result); // Debug: API call success
        return result; // checkAppGroupReadPermission 返回 boolean
      } catch (error) {
        console.error('API Call: checkPermissionStatus failed:', error); // Debug: API call error
        throw error; // Re-throw to trigger onError callback
      }
    },
    {
      manual: true, // 手动触发
      onError: (err) => {
        console.error('useRequest2 onError (checkPermissionStatus):', err); // Debug: useRequest2 error callback
        toast({
          status: 'error',
          title: t('common:permission.check_permission_failed'), // 国际化文本
          description: err.message
        });
        setIsGroupReadPermitted(false); // 检查失败，默认为 false
      }
    }
  );

  // API 请求：设置权限 (创建或更新)
  const {
    runAsync: setPermission,
    loading: isSettingPermission // 用于显示加载状态
  } = useRequest2(
    async () => {
      const body: UpdateAppCollaboratorBody = {
        appId: managePer.appId,
        groups: [groupId],
        permission: READ_PERMISSION_VALUE
      };
      await postUpdateAppCollaborators(body);
    },
    {
      manual: true,
      onSuccess: () => {
        toast({ status: 'success', title: t('common:permission.permission_set_success') }); // 国际化文本
        setIsGroupReadPermitted(true); // 更新状态
        refetchResource?.(); // 刷新资源数据
      },
      onError: (err) => {
        console.error('useRequest2 onError (setPermission):', err); // Debug: useRequest2 error callback
        toast({
          status: 'error',
          title: t('common:permission.permission_set_failed'), // 国际化文本
          description: err.message
        });
        setIsGroupReadPermitted(false); // 操作失败，回滚状态
      }
    }
  );

  // API 请求：删除权限
  const {
    runAsync: deletePermission,
    loading: isDeletingPermission // 用于显示加载状态
  } = useRequest2(
    async () => {
      const params: AppCollaboratorDeleteParams = {
        appId: managePer.appId,
        groupId: groupId
      };
      await deleteAppCollaborators(params);
    },
    {
      manual: true,
      onSuccess: () => {
        toast({ status: 'success', title: t('common:permission.permission_delete_success') }); // 国际化文本
        setIsGroupReadPermitted(false); // 更新状态
        refetchResource?.(); // 刷新资源数据
      },
      onError: (err) => {
        console.error('useRequest2 onError (deletePermission):', err); // Debug: useRequest2 error callback
        toast({
          status: 'error',
          title: t('common:permission.permission_delete_failed'), // 国际化文本
          description: err.message
        });
        setIsGroupReadPermitted(true); // 操作失败，回滚状态
      }
    }
  );

  // 初始化开关状态：在组件挂载和 appId 改变时调用 checkPermissionStatus
  useEffect(() => {
    console.log('useEffect triggered. managePer.appId:', managePer.appId); // Debug: useEffect trigger
    if (managePer.appId && groupId) {
      checkPermissionStatus()
        .then((result) => {
          console.log(
            'checkPermissionStatus promise resolved. Setting isGroupReadPermitted to:',
            result
          ); // Debug: Promise resolved
          setIsGroupReadPermitted(result);
        })
        .catch((err) => {
          console.error('checkPermissionStatus promise rejected:', err); // Debug: Promise rejected (should be handled by useRequest2 onError, but good to catch here too)
        });
    } else {
      console.log('Skipping checkPermissionStatus due to missing managePer.appId or groupId.'); // Debug: Skipping API call
      // If appId is not available, default to false or handle appropriately
      setIsGroupReadPermitted(false);
    }
  }, [managePer.appId, checkPermissionStatus, groupId]); // 依赖项确保在相关值变化时重新运行

  // 处理开关切换逻辑
  const handleToggleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked;
      setIsGroupReadPermitted(isChecked); // 乐观更新 UI，提升用户体验

      if (isChecked) {
        await setPermission();
      } else {
        await deletePermission();
      }
    },
    [setPermission, deletePermission]
  );

  return (
    <>
      <MyModal
        isOpen
        iconSrc="keyPrimary"
        onClose={onClose}
        title={t('common:permission.Permission config')}
      >
        <ModalBody>
          <HStack>
            <Avatar src={avatar} w={'1.75rem'} borderRadius={'md'} />
            <Box>{name}</Box>
          </HStack>
          {!isInheritPermission && (
            <Box mt={3}>
              <ResumeInherit onResume={resumeInheritPermission} />
            </Box>
          )}
          <Box mt={4}>
            <CollaboratorContextProvider
              {...managePer}
              refetchResource={refetchResource}
              isInheritPermission={isInheritPermission}
              hasParent={hasParent}
            >
              {({ MemberListCard, onOpenManageModal, onOpenAddMember }) => {
                return (
                  <>
                    <Flex
                      alignItems="center"
                      flexDirection="row"
                      justifyContent="space-between"
                      w="full"
                    >
                      <HStack spacing={2}>
                        <Box fontSize={'sm'}>{t('common:permission.Collaborator')}</Box>
                        {/* 动态选择开关 */}
                        {isCheckingPermission || isGroupReadPermitted === undefined ? (
                          <Spinner size="sm" /> // 初始加载或检查权限时显示加载动画
                        ) : (
                          <Switch
                            isChecked={isGroupReadPermitted}
                            onChange={handleToggleChange}
                            isDisabled={isSettingPermission || isDeletingPermission}
                            colorScheme="teal" // Chakra UI 的颜色主题
                            aria-label={t('common:permission.Group Read Permission')} // 无障碍标签
                          />
                        )}
                      </HStack>
                      {/* <Flex flexDirection="row" gap="2">
                        <Button
                          size="sm"
                          variant="whitePrimary"
                          leftIcon={<MyIcon w="4" name="common/settingLight" />}
                          onClick={onOpenManageModal}
                        >
                          {t('common:permission.Manage')}
                        </Button>
                        <Button
                          size="sm"
                          variant="whitePrimary"
                          leftIcon={<MyIcon w="4" name="support/permission/collaborator" />}
                          onClick={onOpenAddMember}
                        >
                          {t('common:common.Add')}
                        </Button>
                      </Flex> */}
                    </Flex>
                    {/* <MemberListCard mt={2} p={1.5} bg="myGray.100" borderRadius="md" /> */}
                  </>
                );
              }}
            </CollaboratorContextProvider>
          </Box>
        </ModalBody>
      </MyModal>
      {isChangeOwnerModalOpen && onChangeOwner && (
        <ChangeOwnerModal
          onClose={onCloseChangeOwnerModal}
          avatar={avatar}
          name={name}
          onChangeOwner={onChangeOwner}
        />
      )}
    </>
  );
};

export default ConfigPerModal;

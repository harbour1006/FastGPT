// C:\FastGPT\gitHubCode2\FastGPT\projects\app\src\pageComponents\app\detail\InfoModal.tsx

import React, { useCallback, useState, useEffect } from 'react'; // 确保导入 useEffect 和 useState
import CollaboratorContextProvider from '@/components/support/permission/MemberManager/context';
import ResumeInherit from '@/components/support/permission/ResumeInheritText';
import { AppContext } from './context';
import { useSelectFile } from '@/web/common/file/hooks/useSelectFile';
import { useI18n } from '@/web/context/I18n';
import { resumeInheritPer } from '@/web/core/app/api';
// 导入 ConfigPerModal 中使用的权限相关 API 和类型
import {
  deleteAppCollaborators,
  getCollaboratorList, // 保持这个，因为 MemberListCard 可能需要
  postUpdateAppCollaborators, // 用于设置和删除群组权限
  checkAppGroupReadPermission // 获取群组读取权限状态
} from '@/web/core/app/api/collaborator';
import {
  AppCollaboratorDeleteParams,
  UpdateAppCollaboratorBody
} from '@fastgpt/global/core/app/collaborator'; // 导入相关类型

import {
  Box,
  Button,
  Flex,
  FormControl,
  Input,
  ModalBody,
  ModalFooter,
  Textarea,
  HStack, // <-- 新增：用于布局开关
  Spinner, // <-- 新增：用于加载状态
  Switch // <-- 新增：开关组件
} from '@chakra-ui/react';
import type { RequireOnlyOne } from '@fastgpt/global/common/type/utils';
import type { AppSchema } from '@fastgpt/global/core/app/type.d';
import { AppPermissionList } from '@fastgpt/global/support/permission/app/constant';
import type { PermissionValueType } from '@fastgpt/global/support/permission/type';
import Avatar from '@fastgpt/web/components/common/Avatar';
import MyIcon from '@fastgpt/web/components/common/Icon';
import MyModal from '@fastgpt/web/components/common/MyModal';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { useTranslation } from 'next-i18next';
import { useForm } from 'react-hook-form';
import { useContextSelector } from 'use-context-selector';

const InfoModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const { commonT } = useI18n();
  const { toast } = useToast();
  const { updateAppDetail, appDetail, reloadApp } = useContextSelector(AppContext, (v) => v);

  // --- 从 ConfigPerModal 复制过来的常量 ---
  const TARGET_GROUP_ID = '68662cc51bfd19245e07795f'; // 这个需要确认是否是共享组ID
  const READ_PERMISSION_VALUE = 4; // 这个是读权限的值，需要和你的权限系统匹配
  // --- 复制常量结束 ---

  // --- 从 ConfigPerModal 复制过来的开关相关状态 ---
  const [isGroupReadPermitted, setIsGroupReadPermitted] = useState<boolean | undefined>(undefined);
  // --- 复制状态结束 ---

  // --- 从 ConfigPerModal 复制过来的 API 请求：检查权限状态 ---
  const { runAsync: checkPermissionStatus, loading: isCheckingPermission } = useRequest2(
    async () => {
      if (!appDetail._id || !TARGET_GROUP_ID) {
        console.warn('Missing appId or TARGET_GROUP_ID for permission check, skipping API call.');
        return false;
      }
      const params: AppCollaboratorDeleteParams = {
        // Reusing AppCollaboratorDeleteParams for consistency
        appId: appDetail._id,
        groupId: TARGET_GROUP_ID
      };
      try {
        const result = await checkAppGroupReadPermission(params);
        return result; // checkAppGroupReadPermission 返回 boolean
      } catch (error) {
        console.error('API Call: checkPermissionStatus failed:', error);
        throw error;
      }
    },
    {
      manual: true,
      onError: (err) => {
        toast({
          status: 'error',
          title: t('common:permission.check_permission_failed'),
          description: err.message
        });
        setIsGroupReadPermitted(false);
      }
    }
  );
  // --- 复制 API 请求：检查权限状态 结束 ---

  // --- 从 ConfigPerModal 复制过来的 API 请求：设置权限 (创建或更新) ---
  const { runAsync: setPermission, loading: isSettingPermission } = useRequest2(
    async () => {
      const body: UpdateAppCollaboratorBody = {
        appId: appDetail._id,
        groups: [TARGET_GROUP_ID],
        permission: READ_PERMISSION_VALUE
      };
      await postUpdateAppCollaborators(body);
    },
    {
      manual: true,
      onSuccess: () => {
        toast({ status: 'success', title: t('common:permission.permission_set_success') });
        setIsGroupReadPermitted(true);
        reloadApp(); // 刷新资源数据
      },
      onError: (err) => {
        toast({
          status: 'error',
          title: t('common:permission.permission_set_failed'),
          description: err.message
        });
        setIsGroupReadPermitted(false);
      }
    }
  );
  // --- 复制 API 请求：设置权限 结束 ---

  // --- 从 ConfigPerModal 复制过来的 API 请求：删除权限 ---
  const { runAsync: deletePermission, loading: isDeletingPermission } = useRequest2(
    async () => {
      const params: AppCollaboratorDeleteParams = {
        appId: appDetail._id,
        groupId: TARGET_GROUP_ID
      };
      await deleteAppCollaborators(params);
    },
    {
      manual: true,
      onSuccess: () => {
        toast({ status: 'success', title: t('common:permission.permission_delete_success') });
        setIsGroupReadPermitted(false);
        reloadApp(); // 刷新资源数据
      },
      onError: (err) => {
        toast({
          status: 'error',
          title: t('common:permission.permission_delete_failed'),
          description: err.message
        });
        setIsGroupReadPermitted(true);
      }
    }
  );
  // --- 复制 API 请求：删除权限 结束 ---

  // --- 从 ConfigPerModal 复制过来的 useEffect 初始化开关状态 ---
  useEffect(() => {
    if (appDetail._id && TARGET_GROUP_ID) {
      checkPermissionStatus()
        .then((result) => {
          setIsGroupReadPermitted(result);
        })
        .catch((err) => {
          console.error('InfoModal: checkPermissionStatus promise rejected:', err);
        });
    } else {
      setIsGroupReadPermitted(false);
    }
  }, [appDetail._id, checkPermissionStatus, TARGET_GROUP_ID]);
  // --- 复制 useEffect 结束 ---

  // --- 从 ConfigPerModal 复制过来的 handleToggleChange 函数 ---
  const handleToggleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked;
      setIsGroupReadPermitted(isChecked); // 乐观更新 UI
      if (isChecked) {
        await setPermission();
      } else {
        await deletePermission();
      }
    },
    [setPermission, deletePermission]
  );
  // --- 复制 handleToggleChange 结束 ---

  const {
    File,
    onOpen: onOpenSelectFile,
    onSelectImage
  } = useSelectFile({
    fileType: '.jpg,.png',
    multiple: false
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
    handleSubmit
  } = useForm({
    defaultValues: appDetail
  });
  const avatar = watch('avatar');

  // submit config
  const { runAsync: saveSubmitSuccess, loading: btnLoading } = useRequest2(
    async (data: AppSchema) => {
      await updateAppDetail({
        name: data.name,
        avatar: data.avatar,
        intro: data.intro
      });
    },
    {
      onSuccess() {
        toast({
          title: t('common:common.Update Success'),
          status: 'success'
        });
        reloadApp();
      },
      errorToast: t('common:common.Update Failed')
    }
  );

  const saveSubmitError = useCallback(() => {
    const deepSearch = (obj: any): string => {
      if (!obj) return t('common:common.Submit failed');
      if (!!obj.message) {
        return obj.message;
      }
      return deepSearch(Object.values(obj)[0]);
    };
    toast({
      title: deepSearch(errors),
      status: 'error',
      duration: 4000,
      isClosable: true
    });
  }, [errors, t, toast]);

  const saveUpdateModel = useCallback(
    () => handleSubmit((data) => saveSubmitSuccess(data).then(onClose), saveSubmitError)(),
    [handleSubmit, onClose, saveSubmitError, saveSubmitSuccess]
  );

  const onUpdateCollaborators = ({
    members,
    groups,
    orgs,
    permission
  }: {
    members?: string[];
    groups?: string[];
    orgs?: string[];
    permission: PermissionValueType;
  }) =>
    postUpdateAppCollaborators({
      members,
      groups,
      permission,
      orgs,
      appId: appDetail._id
    });

  const onDelCollaborator = async (
    props: RequireOnlyOne<{ tmbId?: string; groupId?: string; orgId?: string }> // changed from tmbId: string
  ) =>
    deleteAppCollaborators({
      appId: appDetail._id,
      ...props
    });

  const { runAsync: resumeInheritPermission } = useRequest2(() => resumeInheritPer(appDetail._id), {
    errorToast: t('common:resume_failed'),
    onSuccess: () => {
      reloadApp();
    }
  });

  return (
    <MyModal
      isOpen={true}
      onClose={onClose}
      iconSrc="/imgs/workflow/ai.svg"
      title={t('common:core.app.setting')}
    >
      <ModalBody>
        <Box fontSize={'sm'}>{t('common:core.app.Name and avatar')}</Box>
        <Flex mt={2} alignItems={'center'}>
          <Avatar
            src={avatar}
            w={['26px', '34px']}
            h={['26px', '34px']}
            cursor={'pointer'}
            borderRadius={'md'}
            mr={4}
            title={t('common:common.Set Avatar')}
            onClick={() => onOpenSelectFile()}
          />
          <FormControl>
            <Input
              bg={'myWhite.600'}
              placeholder={t('common:core.app.Set a name for your app')}
              {...register('name', {
                required: true
              })}
            ></Input>
          </FormControl>
        </Flex>
        <Box mt={4} mb={1} fontSize={'sm'}>
          {t('common:core.app.App intro')}
        </Box>
        <Textarea
          rows={4}
          maxLength={500}
          placeholder={t('common:core.app.Make a brief introduction of your app')}
          bg={'myWhite.600'}
          {...register('intro')}
        />

        {/* role */}
        {appDetail.permission.hasManagePer && (
          <>
            {!appDetail.inheritPermission && appDetail.parentId && (
              <Box mt={3}>
                <ResumeInherit onResume={resumeInheritPermission} />
              </Box>
            )}
            <Box mt={6}>
              {/* === 新增的开关部分，直接复制 ConfigPerModal 中的 HSTACK === */}
              <HStack spacing={2} mb={4}>
                {' '}
                {/* 增加 mb={4} 给下方列表留出空间 */}
                <Box fontSize={'sm'}>{t('common:permission.Collaborator')}</Box>
                {/* 动态选择开关 */}
                {isCheckingPermission || isGroupReadPermitted === undefined ? (
                  <Spinner size="sm" />
                ) : (
                  <Switch
                    isChecked={isGroupReadPermitted}
                    onChange={handleToggleChange}
                    isDisabled={isSettingPermission || isDeletingPermission}
                    colorScheme="teal"
                    aria-label={t('common:permission.Group Read Permission')}
                  />
                )}
              </HStack>
              {/* <CollaboratorContextProvider
                permission={appDetail.permission}
                // onGetCollaboratorList={() => getCollaboratorList(appDetail._id)}
                permissionList={AppPermissionList}
                onUpdateCollaborators={async (props) =>
                  onUpdateCollaborators({
                    permission: props.permission,
                    members: props.members,
                    groups: props.groups,
                    orgs: props.orgs
                  })
                }
                onDelOneCollaborator={onDelCollaborator}
                refreshDeps={[appDetail.inheritPermission]}
                isInheritPermission={appDetail.inheritPermission}
                hasParent={!!appDetail.parentId}
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
                        <Flex flexDirection="row" gap="2">
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
                        </Flex>
                      </Flex>
                      <MemberListCard mt={2} p={1.5} bg="myGray.100" borderRadius="md" />
                    </>
                  );
                }}
              </CollaboratorContextProvider> */}
            </Box>
          </>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant={'whiteBase'} mr={3} onClick={onClose}>
          {t('common:common.Close')}
        </Button>
        <Button isLoading={btnLoading} onClick={saveUpdateModel}>
          {t('common:common.Save')}
        </Button>
      </ModalFooter>

      <File
        onSelect={(e) =>
          onSelectImage(e, {
            maxH: 300,
            maxW: 300,
            callback: (e) => setValue('avatar', e)
          })
        }
      />
    </MyModal>
  );
};

export default React.memo(InfoModal);

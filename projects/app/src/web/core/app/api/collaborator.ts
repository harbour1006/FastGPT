import {
  UpdateAppCollaboratorBody,
  AppCollaboratorDeleteParams
} from '@fastgpt/global/core/app/collaborator';
import { DELETE, GET, POST } from '@/web/common/api/request';
import { CollaboratorItemType } from '@fastgpt/global/support/permission/collaborator';

export const getCollaboratorList = (appId: string) =>
  GET<CollaboratorItemType[]>('/proApi/core/app/collaborator/list', { appId });

export const postUpdateAppCollaborators = (body: UpdateAppCollaboratorBody) =>
  POST('/core/app/collaborator/update', body);

export const deleteAppCollaborators = (params: AppCollaboratorDeleteParams) =>
  DELETE('/core/app/collaborator/delete', params);
//此为新增
export const checkAppGroupReadPermission = (params: AppCollaboratorDeleteParams) =>
  GET<boolean>('/core/app/collaborator/checkPermission', params);

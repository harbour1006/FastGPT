// C:\FastGPT\gitHubCode2\FastGPT\projects\app\src\web\support\user\team\api.ts

import { GET, POST, PUT, DELETE } from '@/web/common/api/request';
import {
  CollaboratorItemType,
  DeletePermissionQuery,
  UpdateClbPermissionProps
} from '@fastgpt/global/support/permission/collaborator';
import {
  CreateTeamProps,
  InviteMemberProps,
  InviteMemberResponse,
  UpdateInviteProps,
  UpdateStatusProps, // 确认这里导入了 UpdateStatusProps
  UpdateTeamProps,
  UpdateTeamMemberProps
} from '@fastgpt/global/support/user/team/controller.d';
import type { TeamTagItemType, TeamTagSchema } from '@fastgpt/global/support/user/team/type';
import {
  TeamTmbItemType,
  TeamMemberItemType,
  TeamMemberSchema
} from '@fastgpt/global/support/user/team/type.d';
import {
  TeamMemberStatusEnum,
  TeamMemberRoleEnum
} from '@fastgpt/global/support/user/team/constant';
import { FeTeamPlanStatusType, TeamSubSchema } from '@fastgpt/global/support/wallet/sub/type';
import { TeamInvoiceHeaderType } from '@fastgpt/global/support/user/team/type';
import { PaginationProps, PaginationResponse } from '@fastgpt/web/common/fetch/type';

export interface CreateTeamResponse {
  message: string;
  teamId: string;
  ownerUserId: string;
}

/* --------------- team  ---------------- */
export const getTeamList = (
  status: `${TeamMemberStatusEnum}`,
  role?: `${TeamMemberRoleEnum}` // 添加 role 参数，并使其可选
) => GET<TeamTmbItemType[]>(`/support/user/team/list`, { status, ...(role && { role }) }); // 将 role 加入到查询参数中
export const postCreateTeam = (data: CreateTeamProps) =>
  POST<CreateTeamResponse>(`/support/user/team/create`, data);
export const putUpdateTeam = (data: UpdateTeamProps) => PUT(`/support/user/team/update`, data);
export const putSwitchTeam = (teamId: string) =>
  PUT<{ code: number; message: string; data: any }>(`/support/user/team/switch`, { teamId }); // 更新返回类型

/* --------------- team member ---------------- */
// 这是需要修改的地方：将 teamId 和 searchText 加入到 PaginationProps 的泛型参数中
export const getTeamMembers = (
  props: PaginationProps<{ teamId?: string; withLeaved?: boolean; searchText?: string }>
) => GET<PaginationResponse<TeamMemberItemType>>(`/support/user/team/member/list`, props);

export const postInviteTeamMember = (data: InviteMemberProps) =>
  POST<InviteMemberResponse>(`/support/user/team/member/invite`, data);
export const putUpdateMemberName = (name: string) =>
  PUT(`/proApi/support/user/team/member/updateName`, { name });
export const putUpdateMember = (tmbId: string, data: UpdateTeamMemberProps) =>
  PUT(`/support/user/team/member/update/${tmbId}`, data);

export const delRemoveMember = (tmbId: string) =>
  DELETE(`/support/user/team/member/delete`, { tmbId });
export const updateInviteResult = (data: UpdateInviteProps) =>
  PUT('/proApi/support/user/team/member/updateInvite', data);

export const updateStatus = (data: UpdateStatusProps) =>
  PUT('/proApi/support/user/team/member/updateStatus', data);
export const delLeaveTeam = () => DELETE('/proApi/support/user/team/member/leave');

/* -------------- team collaborator -------------------- */
export const getTeamClbs = () =>
  GET<CollaboratorItemType[]>(`/proApi/support/user/team/collaborator/list`);
export const updateMemberPermission = (data: UpdateClbPermissionProps) =>
  PUT('/proApi/support/user/team/collaborator/update', data);
export const deleteMemberPermission = (id: DeletePermissionQuery) =>
  DELETE('/proApi/support/user/team/collaborator/delete', id);

/* --------------- team tags ---------------- */
export const getTeamsTags = () => GET<TeamTagSchema[]>(`/proApi/support/user/team/tag/list`);
export const loadTeamTagsByDomain = (domain: string) =>
  GET<TeamTagItemType[]>(`/proApi/support/user/team/tag/async`, { domain });

/* team limit */
export const checkTeamExportDatasetLimit = (datasetId: string) =>
  GET(`/support/user/team/limit/exportDatasetLimit`, { datasetId });
export const checkTeamWebSyncLimit = () => GET(`/support/user/team/limit/webSyncLimit`);
export const checkTeamDatasetSizeLimit = (size: number) =>
  GET(`/support/user/team/limit/datasetSizeLimit`, { size });

/* plans */
export const getTeamPlanStatus = () =>
  GET<FeTeamPlanStatusType>(`/support/user/team/plan/getTeamPlanStatus`, { maxQuantity: 1 });

export const getTeamPlans = () =>
  GET<TeamSubSchema[]>(`/proApi/support/user/team/plan/getTeamPlans`);

export const getTeamInvoiceHeader = () =>
  GET<TeamInvoiceHeaderType>(`/proApi/support/user/team/invoiceAccount/getTeamInvoiceHeader`);

export const updateTeamInvoiceHeader = (data: TeamInvoiceHeaderType) =>
  POST(`/proApi/support/user/team/invoiceAccount/update`, data);

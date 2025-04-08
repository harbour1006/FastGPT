import { GET, POST } from '@/web/common/api/request';
import type { UserInformSchema } from '@fastgpt/global/support/user/inform/type';
import { SystemMsgModalValueType } from '@fastgpt/service/support/user/inform/type';
import { PaginationProps, PaginationResponse } from '@fastgpt/web/common/fetch/type';

export const getInforms = (data: PaginationProps) =>
  POST<PaginationResponse<UserInformSchema>>(`/proApi/support/user/inform/list`, data);

// 不去反复的发送这个请求了，因为这个请求没啥用
// export const getUnreadCount = () =>
//   GET<{
//     unReadCount: number;
//     importantInforms: UserInformSchema[];
//   }>(`/proApi/support/user/inform/countUnread`);
// export const readInform = (id: string) => GET(`/proApi/support/user/inform/read`, { id });

// export const getSystemMsgModalData = () =>
//   GET<SystemMsgModalValueType>(`/proApi/support/user/inform/getSystemMsgModal`);

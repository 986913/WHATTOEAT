export interface GetUsersDTO {
  page: number;
  limit?: number;
  username?: string;
  role?: string; // 前端呈现的select下拉框, 值是 “1”， “2”， “3”
  gender?: string; // 值是 “1”， “2”
}

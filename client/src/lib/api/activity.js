import { request } from "./request";

export const activityLogApi = {
  list: () => request("/activities"),
};

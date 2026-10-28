// 測試用：直接寫入一個註冊的帳號（略過申請與審核），預設為已啟用；資源點同時寫入綁定
import { getUsers, saveUsers, writeBinding } from "../../src/utils/auth.js";

export const TEST_PASSWORD = "test1234";

export function addUser({ name = "測試範例", email, password = TEST_PASSWORD, role, resourceId, status = "active", statusReason = null }) {
  const user = {
    id: `u-${email}`,
    name,
    email,
    password,
    role,
    status,
    statusReason,
    ...(role === "provider" ? { resourceId: resourceId ?? "" } : {}),
  };
  saveUsers([...getUsers(), user]);
  if (role === "provider" && resourceId !== undefined) writeBinding(email, resourceId);
  return user;
}

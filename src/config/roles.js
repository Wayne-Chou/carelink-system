// 使用者角色（doc/assessment-schema.md 第一節）
// 原型階段沿用目前的登入方式，正式權限控管留待後端階段

export const ROLES = [
  { code: "citizen", label: "民眾", description: "候診時填寫評估表；自行查詢資源" },
  { code: "reader", label: "判讀人員", description: "閱讀填答、與民眾談話、判定燈號、取得同意" },
  { code: "manager", label: "健康管理員", description: "橘燈個案的諮詢、連結、追蹤、結案" },
  { code: "provider", label: "資源點", description: "回報出席與參與狀況" },
  { code: "admin", label: "管理員", description: "維護資源、查看全部資料" },
];

export const ROLE_CODES = ROLES.map((r) => r.code);
export const DEFAULT_ROLE = "citizen";

export const isValidRole = (role) => ROLE_CODES.includes(role);

export function getRoleLabel(code) {
  return ROLES.find((r) => r.code === code)?.label ?? "";
}

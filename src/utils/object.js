export const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// 深層合併：物件逐層合併，陣列與其他值（含 null）整個替換，patch 中為 undefined 的欄位忽略
// 回傳新物件，不修改傳入的參數
export function deepMerge(target, patch) {
  const result = { ...target };
  for (const [key, value] of Object.entries(patch || {})) {
    if (value === undefined) continue;
    result[key] =
      isPlainObject(value) && isPlainObject(target?.[key]) ? deepMerge(target[key], value) : value;
  }
  return result;
}

// 以預設值補齊缺漏欄位（一層）：巢狀物件逐欄補、型別不符的陣列與物件改用預設值
// raw 中多出的欄位保留
export function fillDefaults(raw, defaults) {
  const merged = { ...raw };
  for (const [key, def] of Object.entries(defaults)) {
    const value = raw?.[key];
    if (isPlainObject(def)) merged[key] = isPlainObject(value) ? { ...def, ...value } : def;
    else if (Array.isArray(def)) merged[key] = Array.isArray(value) ? value : def;
    else merged[key] = value === undefined ? def : value;
  }
  return merged;
}

// 流水號編碼：前綴加三位數（Res001、Ast001、Case001），超過 999 時位數自動增加
// 下一個編號取目前最大編號加一

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function codePattern(prefix) {
  return new RegExp(`^${escapeRegExp(prefix)}(\\d{3,})$`);
}

export function isValidCode(prefix, code) {
  return codePattern(prefix).test(String(code ?? ""));
}

export function formatCode(prefix, number) {
  return `${prefix}${String(number).padStart(3, "0")}`;
}

export function maxCodeNumber(prefix, items) {
  const pattern = codePattern(prefix);
  return (items || []).reduce((max, item) => {
    const match = pattern.exec(String(item?.code ?? ""));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
}

export function nextCode(prefix, items) {
  return formatCode(prefix, maxCodeNumber(prefix, items) + 1);
}

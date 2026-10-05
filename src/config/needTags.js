// 處方類型與需求標籤代碼表（doc/resource-schema.md 第七節）
// 資料一律存代碼，中文只在這裡對照。

export const PRESCRIPTION_TYPES = [
  { code: "basic_support", label: "基本生活支持" },
  { code: "health", label: "身心健康促進" },
  { code: "social", label: "社會連結" },
  { code: "learning", label: "學習與發展" },
  { code: "self_actualization", label: "自我實現" },
  { code: "other", label: "其他" },
];

export const NEED_TAGS = [
  { code: "financial_aid", label: "經濟援助", type: "basic_support" },
  { code: "legal", label: "法律諮詢", type: "basic_support" },
  { code: "housing", label: "住房支持", type: "basic_support" },
  { code: "transport", label: "交通協助", type: "basic_support" },
  { code: "food", label: "食物援助", type: "basic_support" },
  { code: "caregiver_support", label: "照顧者支持", type: "basic_support" },
  { code: "parenting", label: "親職與家庭教育", type: "basic_support" },
  { code: "welfare_application", label: "福利申請協助", type: "basic_support" },
  { code: "home_support", label: "居家支援", type: "basic_support" },
  { code: "exercise", label: "運動健身", type: "health" },
  { code: "nutrition", label: "飲食營養", type: "health" },
  { code: "cognitive", label: "認知健康", type: "health" },
  { code: "mental", label: "心理支持", type: "health" },
  { code: "companionship", label: "社交陪伴", type: "social" },
  { code: "arts_culture", label: "藝術與文化", type: "social" },
  { code: "nature", label: "自然綠活", type: "social" },
  { code: "spiritual", label: "信仰與靈性關懷", type: "social" },
  { code: "education", label: "教育學習", type: "learning" },
  { code: "digital_skills", label: "數位技能", type: "learning" },
  { code: "self_management", label: "健康自我管理", type: "learning" },
  { code: "volunteer", label: "志願服務", type: "self_actualization" },
  { code: "employment", label: "就業支持", type: "self_actualization" },
  { code: "community", label: "社區參與", type: "self_actualization" },
  // 選 other 時另填 needTagOther
  { code: "other", label: "其他", type: "other" },
];

const TAG_BY_CODE = Object.fromEntries(NEED_TAGS.map((t) => [t.code, t]));
const TYPE_BY_CODE = Object.fromEntries(PRESCRIPTION_TYPES.map((t) => [t.code, t]));

export function getNeedTagLabel(code) {
  return TAG_BY_CODE[code]?.label ?? code;
}

export function getPrescriptionTypeLabel(code) {
  return TYPE_BY_CODE[code]?.label ?? code;
}

export function getNeedTagsByType(type) {
  return NEED_TAGS.filter((t) => t.type === type);
}

// 由需求標籤推得處方類型：去重複、依 PRESCRIPTION_TYPES 順序排列、忽略未知代碼
export function derivePrescriptionTypes(needTags = []) {
  const types = new Set(
    (Array.isArray(needTags) ? needTags : [])
      .map((code) => TAG_BY_CODE[code]?.type)
      .filter(Boolean)
  );
  return PRESCRIPTION_TYPES.map((t) => t.code).filter((code) => types.has(code));
}

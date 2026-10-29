// 列表卡片的顯示資料：評估列表、個案列表、資源列表、探索頁、資源端後台與角色預覽面板共用
// 卡片上的文字（狀態、燈號、階段、風險等）都在這裡由設定檔的標籤產生，頁面與預覽顯示一致

import { STATUS_LABELS, formatLight } from "../config/assessmentLabels.js";
import { LINKAGE_STATUS_OPTIONS, caseLabel, stageShort } from "../config/caseLabels.js";
import { getNeedTagLabel } from "../config/needTags.js";
import {
  PARTNERSHIP_OPTIONS,
  RISK_ICONS,
  RISK_LEVEL_OPTIONS,
  STATUS_OPTIONS,
  VISIBILITY_REASON_LABELS,
  optionLabel,
} from "../config/resourceOptions.js";
import { getVisibility } from "../config/resourceRules.js";
import { isPendingCaseOpening } from "./assessmentService.js";
import {
  canDeleteCase,
  getAllCases,
  getNextFollowUp,
  getReferralsForResource,
  isFirstContactOverdue,
  isFollowUpDue,
} from "./caseService.js";
import { getAllResources, isVerifyOverdue } from "./resourceService.js";
import { formatAudience, formatRegion } from "../utils/resourceFormat.js";
import { hoursBetween } from "../utils/date.js";

// ── 評估列表 ──────────────────────────────────────────────

/**
 * 評估卡片：狀態、燈號、開案情形、黃燈提供的資源
 * @param {object[]} assessments  已排序的評估
 */
export function assessmentRows(assessments, { cases = getAllCases(), resources = getAllResources() } = {}) {
  // 已開案的評估顯示個案編碼；黃燈當場提供的資源顯示名稱
  const caseCodes = new Map(cases.map((c) => [String(c.id), c.code]));
  const resourceNames = new Map(resources.map((r) => [String(r.id), r.name]));
  return assessments.map((a) => ({
    ...a,
    light: !!a.review.light,
    statusText: STATUS_LABELS[a.status] ?? "",
    lightText: a.review.light ? formatLight(a.review.light, a.review.orangeType) : "",
    pendingCase: isPendingCaseOpening(a),
    caseCode: a.caseId ? caseCodes.get(String(a.caseId)) ?? "" : "",
    providedNames: (a.review.providedResources || []).map((id) => resourceNames.get(String(id)) ?? "（資源已不存在）"),
  }));
}

// ── 個案列表 ──────────────────────────────────────────────

const linkageText = (linkage) =>
  linkage ? `${linkage.resourceName || "未知資源"}（${caseLabel(LINKAGE_STATUS_OPTIONS, linkage.status)}）` : "";

// 個案卡片：階段、首次聯繫逾期、最新連結、下次追蹤
export function caseRows(cases, now = new Date()) {
  return cases.map((c) => {
    const latestLinkage = c.linkages.at(-1) ?? null;
    return {
      ...c,
      stageText: stageShort(c.stage),
      overdue: isFirstContactOverdue(c, now),
      daysOpen: Math.floor((hoursBetween(c.createdAt, now) ?? 0) / 24),
      latestLinkage,
      linkageText: linkageText(latestLinkage),
      nextFollowUp: getNextFollowUp(c),
      followUpDue: isFollowUpDue(c),
      deletable: canDeleteCase(c).ok,
    };
  });
}

// ── 資源列表（後台）──────────────────────────────────────

// 資源卡片：狀態、待驗證、風險燈號、合作狀態、探索頁是否顯示
export function resourceRows(resources) {
  return resources.map((item) => {
    const { explore } = getVisibility(item);
    const exploreReasons = explore.reasons.map((code) => VISIBILITY_REASON_LABELS[code] ?? code).join("、");
    return {
      ...item,
      statusText: optionLabel(STATUS_OPTIONS, item.status) || "未設定",
      riskText: item.riskLevel
        ? `${RISK_ICONS[item.riskLevel]} ${optionLabel(RISK_LEVEL_OPTIONS, item.riskLevel)}`
        : "⚪ 未評估",
      partnershipText: optionLabel(PARTNERSHIP_OPTIONS, item.partnership) || "合作狀態未填",
      overdue: isVerifyOverdue(item),
      exploreVisible: explore.visible,
      exploreReasons,
      exploreText: explore.visible ? "探索頁顯示中" : `探索頁未顯示：${exploreReasons}`,
      tagTexts: item.needTags.map((tag) => `#${getNeedTagLabel(tag)}`),
    };
  });
}

// ── 探索頁（民眾）────────────────────────────────────────

export const EXPLORE_DESCRIPTION_FALLBACK = "社區資源據點，提供在地健康、社交與支持服務。";

// 探索頁的資源卡片
export function exploreCard(resource) {
  return {
    badge: resource.needTags.length ? getNeedTagLabel(resource.needTags[0]) : "",
    title: resource.name,
    description: resource.description || EXPLORE_DESCRIPTION_FALLBACK,
    region: formatRegion(resource),
    place: resource.placeName || resource.address.detail || "",
    audience: formatAudience(resource),
  };
}

// ── 資源端後台 ────────────────────────────────────────────

// 轉介到此資源的個案（規則見 caseService.getReferralsForResource），加上狀態與階段文字
export function referralRows(resourceId, cases = getAllCases()) {
  if (!resourceId) return [];
  return getReferralsForResource(resourceId, cases).map((row) => ({
    ...row,
    statusText: caseLabel(LINKAGE_STATUS_OPTIONS, row.linkage.status),
    stageText: stageShort(row.caseItem.stage),
  }));
}

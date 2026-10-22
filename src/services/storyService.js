// 示範情境「林示範的故事」：依目前資料判斷進行到第幾步（純函式，資料由呼叫端傳入，預設讀取各 service）
// 流程說明列（components/StoryBar.vue）、評估填寫頁的示範按鈕都依此判斷
//
// 跟著實際操作走，不限定資源：
//   第 4、7 步轉介到任一資源都符合故事，說明列帶入實際選擇的資源名稱
//   第 5、8 步依所選資源是否綁定資源點帳號決定操作者：有綁定由該資源的資源點回報；沒有則由健康管理員代為記錄
//   第一次轉介就記錄成功時略過連結失敗的示範，直接接到追蹤（第 9 步）
//   「目前資料與故事不符」只用在故事無法繼續的情況（判讀不是橘燈轉介、找不到個案）

import { CASE_OPENING_ORANGE_TYPES } from "../config/assessmentRules.js";
import { formatLight } from "../config/assessmentLabels.js";
import { caseLabel, LINKAGE_STATUS_OPTIONS, stageLabel } from "../config/caseLabels.js";
import {
  PROTAGONIST,
  SKIPPED_FAILURE_NOTE,
  STORY_FAILURE_NOTE,
  UNBOUND_NOTE,
  getStoryStep,
} from "../config/demoStory.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, getRoleLabel } from "../config/roles.js";
import { getAllAssessments, isActiveAssessment } from "./assessmentService.js";
import { getAllCases } from "./caseService.js";
import { getAllResources } from "./resourceService.js";
import { computeTodos } from "./todoService.js";
import { getUsers } from "../utils/auth.js";
import { todayString } from "../utils/date.js";

const normalizeName = (name) => String(name ?? "").replace(/\s+/g, "");
export const isProtagonistName = (name) => normalizeName(name) === PROTAGONIST.name;

// 有示範情境資料：載入示範情境時資源都帶 isDemo
export const hasStoryData = (resources) => (resources || []).some((r) => r?.isDemo === true);

// 主角：姓名為「林示範」、未作廢的最新一筆評估，以及它開的個案
export function findProtagonist(assessments = [], cases = []) {
  const assessment =
    [...assessments]
      .filter((a) => isActiveAssessment(a) && isProtagonistName(a.person?.name))
      .sort((a, b) => String(b.createdAt || b.filledAt).localeCompare(String(a.createdAt || a.filledAt)))[0] ?? null;
  const caseItem = assessment?.caseId
    ? cases.find((c) => String(c.id) === String(assessment.caseId)) ?? null
    : null;
  return { assessment, caseItem };
}

// 綁定該資源的資源點帳號（示範帳號與註冊的帳號）；沒有時為 null
export function providerAccountFor(resourceId, accounts) {
  if (!resourceId) return null;
  return accounts.find((a) => a.role === "provider" && a.resourceId && String(a.resourceId) === String(resourceId)) ?? null;
}

const defaultAccounts = () => [...DEMO_ACCOUNTS, ...getUsers()];

// 每一步之內要做的事（給操作者的提示）
export const TASKS = {
  fill: "到「填寫評估」，姓名填「林示範」，可按「帶入林示範的答案」一鍵填好，再由工作人員送出",
  review: "開啟林示範的評估，判定「橘燈」、類型「轉介」，勾選民眾同意後按「完成判讀」，系統會自動開案",
  firstContact: "在個案頁「晤談」區按首次聯繫時間的「記錄為現在」",
  consult: "填寫「對我而言什麼最重要」，並新增目標「每週出門參加活動兩次」後儲存",
  advanceToLink: "按「下一步：進入「連結」」",
  link: "在「連結」區選擇任一可推薦的資源，填寫連結原因後按「建立連結」（故事範例：示範關懷據點歌唱班）",
  managerRecordFirst: `在個案頁「記錄連結結果」選擇結果並按「儲存結果」。故事範例：選「失敗」、回報說明填「${STORY_FAILURE_NOTE}」，示範回到諮詢的迴圈；選「成功」則略過連結失敗的示範`,
  providerReportFirst: `在資源端後台找到林示範並送出回報。故事範例：選「失敗：無法參加」、說明填「${STORY_FAILURE_NOTE}」，示範回到諮詢的迴圈；選「成功：已開始參加」則略過連結失敗的示範`,
  returnToConsultation: "按「退回第 2 階段重新評估」（或在記錄失敗後的確認視窗按「確定」）",
  supplement: "在晤談區補充晤談紀錄（例：週三下午固定回診）、調整目標，再按「下一步：進入「連結」」",
  relink: "在「連結」區改選其他可推薦的資源，填寫連結原因後按「建立連結」（故事範例：示範社區太極班）",
  managerRecord: "在個案頁「記錄連結結果」選「成功」並按「儲存結果」",
  providerReport: "在資源端後台找到林示範，選「成功：已開始參加」後按「送出回報」",
  advanceToFollowUp: "連結已成功，按「下一步：進入「追蹤」」",
  followUp1: "在追蹤表的「1 個月」按「填寫」，記錄出席、參與與影響後儲存",
  followUp3: "在追蹤表的「3 個月」按「填寫」並儲存",
  followUp6: "在追蹤表的「6 個月」按「填寫」並儲存",
  advanceToClosure: "按「下一步：進入「結案」」",
  close: "選擇結案原因（例：達成目標），勾選已說明再入口機制後結案",
};

/**
 * 判斷目前進行到第幾步
 * @returns {{
 *   active: boolean,             有示範情境資料
 *   step: number|null,           1～11；故事完成或無法繼續時為 null
 *   done: boolean,               已結案
 *   task: string|null,           TASKS 的 key
 *   offTrack: { message, restartStep } | null,   只在故事無法繼續時
 *   skippedFailure: boolean,     第一次轉介就成功，略過連結失敗的示範
 *   linkage: object|null,        這一步相關的連結（第 5、8 步為待回報的那一筆）
 *   operatorRole: string|null,   這一步的操作者（第 5、8 步依資源有無綁定帳號決定）
 *   providerAccount: object|null 綁定所選資源的資源點帳號
 *   assessment, caseItem
 * }}
 */
export function getStoryState({
  resources = getAllResources(),
  assessments = getAllAssessments(),
  cases = getAllCases(),
  accounts = defaultAccounts(),
} = {}) {
  const { assessment, caseItem } = findProtagonist(assessments, cases);
  const state = {
    active: hasStoryData(resources),
    step: null,
    done: false,
    task: null,
    offTrack: null,
    skippedFailure: false,
    linkage: null,
    operatorRole: null,
    providerAccount: null,
    assessment,
    caseItem,
  };
  const at = (step, task, extra = {}) => ({
    ...state,
    step,
    task,
    operatorRole: getStoryStep(step)?.role ?? null,
    ...extra,
  });
  const offTrack = (message, restartStep) => ({ ...state, offTrack: { message, restartStep } });

  if (!assessment) return at(1, "fill");
  if (assessment.status === "filled") return at(2, "review");

  const { light, orangeType } = assessment.review || {};
  if (light !== "orange" || !CASE_OPENING_ORANGE_TYPES.includes(orangeType)) {
    return offTrack(`林示範被判讀為「${formatLight(light, orangeType) || "未判定"}」，故事需要判讀為橘燈轉介才會開案`, 2);
  }
  if (!caseItem) return offTrack("林示範的評估已判讀，但找不到對應的個案", 2);

  const c = caseItem;
  if (c.stage === "closed") return { ...state, done: true };

  const linkages = c.linkages || [];
  const latest = linkages.at(-1) ?? null;
  const failedCount = linkages.filter((l) => l.status === "failed").length;
  const returnCount = (c.history || []).filter((h) => h.action === "return_to_consultation").length;
  // 每一次連結失敗之後都有退回諮詢，表示已回到諮詢重新評估
  const returnedAfterFailure = failedCount > 0 && returnCount >= failedCount;
  // 第一次轉介就成功：沒有任何失敗的連結
  const skippedFailure = linkages.some((l) => l.status === "success") && failedCount === 0;

  if (c.stage === 1 || c.stage === 2) {
    if (!c.consultation?.firstContactAt) return at(3, "firstContact");
    const consulted =
      String(c.consultation.whatMatters ?? "").trim() && (c.consultation.goals || []).some((g) => String(g).trim());
    if (!consulted) return at(3, "consult");
    // 連結失敗後退回諮詢：補充晤談、調整計畫，再進入連結
    return failedCount ? at(6, "supplement", { linkage: latest }) : at(4, "advanceToLink");
  }

  if (c.stage === 3) {
    if (!latest) return at(4, "link");
    if (latest.status === "pending") {
      // 還沒有失敗過的是第一次轉介（第 5 步），失敗後重新轉介的是第 8 步
      const first = failedCount === 0;
      const provider = providerAccountFor(latest.resourceId, accounts);
      const extra = { linkage: latest, providerAccount: provider, operatorRole: provider ? "provider" : "manager" };
      if (first) return at(5, provider ? "providerReportFirst" : "managerRecordFirst", extra);
      return at(8, provider ? "providerReport" : "managerRecord", extra);
    }
    if (latest.status === "failed") {
      return returnedAfterFailure
        ? at(7, "relink", { linkage: latest })
        : at(6, "returnToConsultation", { linkage: latest });
    }
    return at(9, "advanceToFollowUp", { linkage: latest, skippedFailure });
  }

  if (c.stage === 4) {
    const pending = (c.followUps || []).filter((f) => !f.doneAt).map((f) => f.round);
    const extra = { linkage: latest, skippedFailure };
    if (pending.includes(1)) return at(9, "followUp1", extra);
    if (pending.includes(3)) return at(10, "followUp3", extra);
    if (pending.includes(6)) return at(10, "followUp6", extra);
    return at(11, "advanceToClosure", extra);
  }
  return at(11, "close", { linkage: latest, skippedFailure });
}

// ── 給流程說明列的內容 ────────────────────────────────────

const resourceName = (linkage) => linkage?.resourceName || "所選資源";
const isReportStep = (step) => step === 5 || step === 8;

/**
 * 這一步的標題、說明（依實際選擇的資源帶入）
 * @returns {{ step, title, phase, role, page, note } | null}
 */
export function storyStepInfo(state) {
  const base = getStoryStep(state.step);
  if (!base) return null;
  const role = state.operatorRole ?? base.role;
  const page = isReportStep(state.step) ? (role === "provider" ? "resource-dashboard" : "case-detail") : base.page;
  const notes = [];
  if (base.note) notes.push(base.note);
  if (isReportStep(state.step)) {
    notes.push(
      role === "provider"
        ? `此資源有資源點帳號（${state.providerAccount?.email ?? ""}），由該資源的資源點在資源端後台回報`
        : UNBOUND_NOTE
    );
  }
  if (state.skippedFailure && state.step >= 9) notes.push(`${SKIPPED_FAILURE_NOTE}：第一次轉介就成功，直接接到追蹤`);
  return {
    step: base.step,
    phase: base.phase,
    role,
    page,
    title: base.title.replace("{resource}", resourceName(state.linkage)),
    note: notes.join("；"),
  };
}

// 這一步的操作頁面連結
export function storyLink(state) {
  const info = storyStepInfo(state);
  if (!info) return null;
  switch (info.page) {
    case "assessment-new":
      return { path: "/assessment/new", label: "前往填寫評估" };
    case "assessment-review":
      return state.assessment ? { path: `/assessments/${state.assessment.id}`, label: "前往林示範的判讀頁" } : null;
    case "case-detail":
      return state.caseItem ? { path: `/case/${state.caseItem.id}`, label: "前往林示範的個案頁" } : null;
    case "resource-dashboard":
      return { path: "/resource-dashboard", label: "前往資源端後台" };
    default:
      return null;
  }
}

export const operatorAccount = (role) => DEMO_ACCOUNTS.find((a) => a.role === role) ?? null;

/**
 * 給流程說明列的完整內容
 * @param {object} user 目前登入者
 */
export function describeStory(state, user) {
  const info = storyStepInfo(state);
  if (!info) return { info: null, operator: null, isOperator: false, task: "", link: null };
  // 資源點：綁定所選資源的帳號；其他角色：該角色的示範帳號
  const account =
    info.role === "provider" ? state.providerAccount ?? operatorAccount("provider") : operatorAccount(info.role);
  // 操作者只認這一步指定的角色（系統管理員雖有權限，展示時仍請改用該角色的帳號）；資源點須是綁定該資源的帳號
  const isOperator =
    user?.role === info.role &&
    (info.role !== "provider" ||
      !state.providerAccount ||
      String(user.resourceId) === String(state.providerAccount.resourceId));
  return {
    info,
    operator: account
      ? {
          role: info.role,
          roleLabel: getRoleLabel(info.role),
          // 提示用的稱呼：資源點寫出是哪個資源的資源點（例：範例長青共餐食堂的資源點）
          label:
            info.role === "provider" && state.linkage?.resourceName
              ? `${state.linkage.resourceName}的資源點`
              : getRoleLabel(info.role),
          email: account.email,
          password: account.isDemo ? DEMO_PASSWORD : "",
        }
      : null,
    isOperator,
    task: state.task ? TASKS[state.task] : "",
    link: isOperator ? storyLink(state) : null,
  };
}

// ── 各角色現在看得到什麼 ──────────────────────────────────

const name = PROTAGONIST.name;
const statusLabel = (status) => caseLabel(LINKAGE_STATUS_OPTIONS, status) || status;

/**
 * 依目前狀態列出四個角色在哪些頁面看得到林示範的什麼資訊（依實際選擇的資源）
 * @returns {{ role: string, roleLabel: string, items: string[] }[]}
 */
export function describeVisibility(state, { today = todayString(), now = new Date(), accounts = defaultAccounts() } = {}) {
  const { assessment: a, caseItem: c } = state;
  const linkages = c?.linkages || [];
  const todos =
    a || c
      ? computeTodos({ today, now, resources: [], assessments: a ? [a] : [], cases: c ? [c] : [] }).filter(
          (t) => t.code === a?.code || t.code === c?.code
        )
      : [];
  const todoText = (audience) =>
    todos
      .filter((t) => t.audience === audience)
      .map((t) => `待辦：${t.typeLabel}${t.overdueDays > 0 ? `（逾期 ${t.overdueDays} 天）` : ""}`);

  const assessmentText = a
    ? a.status === "filled"
      ? `評估列表：${name} 的評估 ${a.code}（未判讀）`
      : `評估列表、判讀頁：${name} 的評估 ${a.code}（${formatLight(a.review.light, a.review.orangeType)}）`
    : null;
  const caseText = c ? `個案列表、個案頁：${name} 的個案 ${c.code}（${stageLabel(c.stage)}）` : null;

  // 每筆連結：有綁定資源點帳號的由資源點回報；沒有的由健康管理員代為記錄
  const linkageText = linkages.map((l) => {
    const bound = providerAccountFor(l.resourceId, accounts);
    const how = l.status === "pending" ? (bound ? "等資源點回報" : "沒有資源點帳號，由健康管理員代為記錄") : "";
    return `個案頁：連結「${l.resourceName}」${statusLabel(l.status)}${l.providerNote ? `（${l.providerNote}）` : ""}${how ? `，${how}` : ""}`;
  });

  const reader = [
    assessmentText ?? `評估列表：還沒有 ${name} 的評估`,
    ...(c ? [`判讀頁：「已建立個案 ${c.code}」只顯示編碼，無法進入個案頁`] : []),
    ...todoText("reader"),
  ];
  const manager = c
    ? [caseText, ...linkageText, `判讀頁（唯讀）：${name} 已開案的評估 ${a.code}`, ...todoText("manager")]
    : [`個案列表：還沒有 ${name} 的個案（判讀為橘燈轉介後才會開案）`];

  // 每個資源點帳號只看得到轉介到自己綁定資源的連結；沒有綁定帳號的資源，資源點看不到
  const provider = linkages.map((l) => {
    const bound = providerAccountFor(l.resourceId, accounts);
    if (!bound) {
      return `「${l.resourceName}」沒有資源點帳號，這筆轉介只在健康管理員的個案頁，任何資源點帳號都看不到`;
    }
    const status = l.status === "pending" ? "待回報" : `已回報${statusLabel(l.status)}`;
    return `${bound.email} 的資源端後台：${name} 轉介到「${l.resourceName}」（${status}），看不到評估內容與晤談紀錄`;
  });
  if (linkages.length) provider.push("其他資源點帳號看不到這些轉介");
  else provider.push(`資源端後台：看不到 ${name}（尚未轉介）`);

  const admin = [
    "全部頁面：資源列表、評估、個案、待辦（可切換全部）",
    ...(assessmentText ? [assessmentText] : []),
    ...(caseText ? [caseText] : []),
  ];

  return [
    { role: "reader", roleLabel: getRoleLabel("reader"), items: reader },
    { role: "manager", roleLabel: getRoleLabel("manager"), items: manager },
    { role: "provider", roleLabel: getRoleLabel("provider"), items: provider },
    { role: "admin", roleLabel: getRoleLabel("admin"), items: admin },
  ];
}

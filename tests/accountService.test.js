import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

const session = memoryStorage();
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = session;

const svc = await import("../src/services/accountService.js");
const auth = await import("../src/utils/auth.js");
const mail = await import("../src/services/mailService.js");
const { checkPassword } = await import("../src/config/accounts.js");
const { computeTodos } = await import("../src/services/todoService.js");
const { filterTodosFor } = await import("../src/services/accessControl.js");
const { DEMO_ACCOUNTS } = await import("../src/config/roles.js");
const { FIXTURE_RESOURCES, FIXTURE_IDS } = await import("./fixtures/resources.js");
const { addUser } = await import("./helpers/accounts.js");

const RES_A = FIXTURE_IDS.Res101;
const RES_B = FIXTURE_IDS.Res102;
const ADMIN = { name: "系統管理員（示範）", email: "admin@demo.carelink" };
const PASSWORD = "abc12345";
const FAILED = { ok: false, error: auth.LOGIN_FAILED_MESSAGE };
const at = (time) => new Date(`2026-10-28T${time}:00+08:00`);

// 一份完整的申請資料；patch 可覆寫共同欄位，details 覆寫所選角色的額外欄位
function application(role = "reader", patch = {}, details = {}) {
  const form = svc.createEmptyApplication();
  Object.assign(form, {
    name: "李範例",
    email: "li@example.com",
    phone: "0900-000-001",
    organization: "範例醫院",
    jobTitle: "醫師",
    role,
    supervisorName: "王範例主任",
    supervisorContact: "03-0000-0001",
    reason: "協助社區民眾的生活近況評估判讀",
    consent: true,
    ...patch,
  });
  const defaults = {
    reader: { medicalType: "nurse", licenseNo: "範例字第 001 號", institution: "範例醫院" },
    manager: { employeeIdOrEmployer: "範例衛生所 E001" },
    provider: { resourceId: RES_A, orgName: "範例社區發展協會", registrationNo: "", orgContact: "03-0000-0002" },
  };
  form.details[role] = { ...defaults[role], ...details };
  return form;
}

const apply = (role, patch, details, options) => svc.submitApplication(application(role, patch, details), options);
const mailTypes = (to) => mail.getMailsTo(to).map((m) => m.type);
const lastMailTo = (to) => mail.getMailsTo(to).at(-1);
const approve = (id, extra = {}, options) =>
  svc.reviewAccount(id, { decision: "approve", methods: ["phone"], ...extra }, ADMIN, options);
const tokenIn = (m) => m.links[0].path.split("token=")[1];
// 用最近一封信中的連結設定密碼
const setPasswordFromMail = (email, password = PASSWORD) => svc.resetPassword(tokenIn(lastMailTo(email)), password, password);

beforeEach(() => {
  session.data = { resources: JSON.stringify(FIXTURE_RESOURCES) };
});

describe("密碼規則", () => {
  test("至少 8 碼，需包含英文字母與數字", () => {
    assert.equal(checkPassword("abc12345"), "");
    assert.match(checkPassword("abc1234"), /至少 8 碼/);
    assert.match(checkPassword("abcdefgh"), /英文字母與數字/);
    assert.match(checkPassword("12345678"), /英文字母與數字/);
    assert.equal(checkPassword(""), "請輸入密碼");
    assert.equal(checkPassword("abc12345", "abc12346"), "兩次輸入的密碼不一致");
  });
});

describe("註冊申請", () => {
  test("必填欄位、格式與同意", () => {
    const errors = svc.validateApplication(svc.createEmptyApplication());
    for (const key of ["name", "email", "phone", "organization", "jobTitle", "supervisorName", "supervisorContact", "reason", "role", "consent"]) {
      assert.ok(errors[key], key);
    }
    assert.equal(errors.organization, "請填寫目前任職或服務單位");
    assert.equal(errors.supervisorName, "請填寫目前單位主管或聯絡人姓名");
    assert.equal(errors.supervisorContact, "請填寫目前單位主管或聯絡人電話或 Email");
    const bad = svc.validateApplication(application("reader", { email: "x@", phone: "0212345678" }));
    assert.equal(bad.email, "Email 格式不正確");
    assert.match(bad.phone, /手機格式不正確/);
    assert.deepEqual(svc.validateApplication(application("reader")), {});
    assert.equal("password" in svc.createEmptyApplication(), false, "註冊不設密碼");
  });

  test("可申請判讀人員、健康管理員、資源點；系統管理員、資源管理員不開放", () => {
    for (const role of ["admin", "resource_manager", "boss"]) {
      const form = application("reader", { role });
      assert.equal(svc.validateApplication(form).role, "請選擇申請角色", role);
    }
  });

  test("依角色的額外欄位：必填檢查；立案字號選填；資源要存在", () => {
    assert.ok(svc.validateApplication(application("reader", {}, { licenseNo: "" }))["details.reader.licenseNo"]);
    assert.ok(svc.validateApplication(application("manager", {}, { employeeIdOrEmployer: "" }))["details.manager.employeeIdOrEmployer"]);
    assert.deepEqual(svc.validateApplication(application("provider", {}, { registrationNo: "" })), {}, "立案字號選填");
    assert.equal(
      svc.validateApplication(application("provider", {}, { resourceId: "gone" }))["details.provider.resourceId"],
      "找不到這筆資源，請重新選擇"
    );
  });

  test("送出後為待審核、沒有密碼，只保留所選角色的額外欄位，不能登入", () => {
    const result = apply("reader");
    assert.equal(result.ok, true);
    const account = svc.getAccountById(result.account.id);
    assert.equal(account.status, "pending");
    assert.deepEqual(account.details, { medicalType: "nurse", licenseNo: "範例字第 001 號", institution: "範例醫院" });
    assert.equal("password" in account, false, "帳號列表不列出密碼");
    assert.equal(account.hasPassword, false);
    assert.equal(account.supervisorName, "王範例主任");
    assert.equal(account.supervisorContact, "03-0000-0001");
    assert.deepEqual(account.history.map((h) => h.action), ["apply"]);
    assert.deepEqual(auth.login({ email: "li@example.com", password: "anything1" }), FAILED, "與密碼錯誤相同，不透露待審核");
  });

  test("寄信給申請人與所有已啟用的系統管理員（含前往審核的連結）", () => {
    addUser({ email: "admin2@example.com", role: "admin" });
    addUser({ email: "admin3@example.com", role: "admin", status: "suspended" });
    const { account } = apply("manager");
    assert.deepEqual(mailTypes("li@example.com"), ["application_received"]);
    for (const to of ["admin@demo.carelink", "admin2@example.com"]) {
      const m = lastMailTo(to);
      assert.equal(m.type, "application_new", to);
      assert.match(m.subject, /有新的註冊申請/);
      assert.deepEqual(m.links, [{ label: "前往審核", path: `/admin/accounts?review=${account.id}` }]);
    }
    assert.deepEqual(mailTypes("admin3@example.com"), [], "停用的系統管理員不寄");
    assert.deepEqual(mailTypes("resource@demo.carelink"), [], "資源管理員不寄");
  });

  test("Email 不能與示範帳號、已啟用、待審核、已停用的帳號重複", () => {
    assert.equal(svc.validateApplication(application("reader", { email: "reader@demo.carelink" })).email, "這是示範帳號的 Email，請直接登入");
    apply("reader");
    assert.equal(apply("reader").errors.email, "此 Email 已註冊或正在審核中");
    addUser({ email: "s@example.com", role: "reader", status: "suspended" });
    assert.ok(svc.validateApplication(application("reader", { email: "S@example.com" })).email);
  });
});

describe("審核", () => {
  test("通過：記錄確認方式、審核者、時間；寄出設定密碼信，設定後登入並帶入醫事人員類別", () => {
    const { account } = apply("reader");
    const result = svc.reviewAccount(
      account.id,
      { decision: "approve", methods: ["phone", "medical_license"], note: "已向主任確認" },
      ADMIN,
      { now: at("10:00") }
    );
    assert.equal(result.ok, true);
    const reviewed = svc.getAccountById(account.id);
    assert.equal(reviewed.status, "active");
    assert.deepEqual(reviewed.review.methods, ["phone", "medical_license"]);
    assert.deepEqual(reviewed.review.reviewer, ADMIN);
    assert.equal(reviewed.review.at, "2026-10-28T10:00:00+08:00");
    assert.equal(reviewed.review.note, "已向主任確認");
    const m = lastMailTo("li@example.com");
    assert.equal(m.type, "approved");
    assert.equal(m.subject, "【CareLink】帳號已開通，請設定密碼");
    assert.equal(m.links[0].label, "設定密碼");
    assert.match(m.links[0].path, /^\/reset-password\?token=/);
    assert.equal(svc.checkResetToken(tokenIn(m)).purpose, "setup");

    assert.deepEqual(auth.login({ email: "li@example.com", password: PASSWORD }), FAILED, "設定密碼前不能登入，也不透露狀態");
    assert.equal(setPasswordFromMail("li@example.com").ok, true);
    assert.equal(auth.login({ email: "li@example.com", password: PASSWORD }).ok, true);
    assert.equal(auth.getCurrentUser().readerType, "nurse");
  });

  test("確認方式至少一種；選其他需說明；退回須填原因", () => {
    const { account } = apply("reader");
    assert.ok(svc.reviewAccount(account.id, { decision: "approve", methods: [] }, ADMIN).errors.methods);
    assert.ok(svc.reviewAccount(account.id, { decision: "approve", methods: ["other"] }, ADMIN).errors.methodOther);
    assert.ok(svc.reviewAccount(account.id, { decision: "reject", methods: ["phone"] }, ADMIN).errors.reason);
    assert.ok(svc.reviewAccount(account.id, { methods: ["phone"] }, ADMIN).errors.decision);
    assert.equal(svc.getAccountById(account.id).status, "pending", "沒通過檢查時狀態不變");
  });

  test("資源點通過時完成綁定；審核者可以改成其他資源", () => {
    const first = apply("provider");
    approve(first.account.id);
    assert.deepEqual(auth.getProviderAccountsForResource(RES_A).map((a) => a.email), ["li@example.com"]);

    const second = apply("provider", { email: "chen@example.com" });
    assert.equal(auth.getProviderAccountsForResource(RES_A).length, 1, "待審核的申請還沒綁定");
    approve(second.account.id, { resourceId: RES_B });
    assert.deepEqual(auth.getProviderAccountsForResource(RES_B).map((a) => a.email), ["chen@example.com"]);
    assert.equal(svc.getAccountById(second.account.id).review.resourceId, RES_B);
    assert.match(lastMailTo("chen@example.com").body, /綁定的資源：Res102/);
  });

  test("退回：登入時與密碼錯誤相同（原因只寫在退回信中）；退回信附重新申請連結", () => {
    const { account } = apply("reader");
    svc.reviewAccount(account.id, { decision: "reject", methods: ["phone"], reason: "查無醫事人員證書" }, ADMIN);
    assert.equal(svc.getAccountById(account.id).status, "rejected");
    assert.deepEqual(auth.login({ email: "li@example.com", password: "anything1" }), FAILED);
    const m = lastMailTo("li@example.com");
    assert.equal(m.type, "rejected");
    assert.match(m.body, /查無醫事人員證書/);
    assert.deepEqual(m.links, [{ label: "重新申請", path: `/register?reapply=${account.id}` }]);
  });

  test("只能審核待審核的申請", () => {
    const { account } = apply("reader");
    approve(account.id);
    assert.equal(approve(account.id).ok, false);
    assert.equal(approve("demo-admin").ok, false);
  });
});

describe("重新申請", () => {
  test("帶入原本的申請資料（密碼除外）；不是已退回的帳號沒有資料", () => {
    const { account } = apply("provider");
    assert.equal(svc.getReapplyForm(account.id), null, "待審核不能重新申請");
    svc.reviewAccount(account.id, { decision: "reject", methods: ["phone"], reason: "資源名稱不符" }, ADMIN);
    const { form, rejectReason } = svc.getReapplyForm(account.id);
    assert.equal(rejectReason, "資源名稱不符");
    assert.equal(form.email, "li@example.com");
    assert.equal(form.role, "provider");
    assert.equal(form.details.provider.orgName, "範例社區發展協會");
    assert.equal(form.supervisorName, "王範例主任");
    assert.equal(form.supervisorContact, "03-0000-0001");
    assert.equal("password" in form, false);
    assert.equal(form.consent, false, "同意需重新勾選");
  });

  test("用同一個 Email 重新申請：覆蓋舊的申請，退回紀錄保留在狀態歷程", () => {
    const { account } = apply("reader");
    svc.reviewAccount(account.id, { decision: "reject", methods: ["phone"], reason: "資料不完整" }, ADMIN);
    const again = apply("reader", { organization: "範例診所" });
    assert.equal(again.ok, true);
    const accounts = svc.listAccounts().filter((a) => a.email === "li@example.com");
    assert.equal(accounts.length, 1, "不會多一筆");
    assert.equal(accounts[0].id, account.id);
    assert.equal(accounts[0].status, "pending");
    assert.equal(accounts[0].organization, "範例診所");
    assert.equal(accounts[0].review, null);
    assert.deepEqual(accounts[0].history.map((h) => h.action), ["apply", "reject", "reapply"]);
    assert.equal(accounts[0].history[1].reason, "資料不完整");
  });
});

describe("停用與重新啟用", () => {
  test("停用須填原因；不能停用自己與示範帳號", () => {
    addUser({ email: "w@example.com", role: "reader" });
    const id = "u-w@example.com";
    assert.equal(svc.suspendAccount(id, { reason: "" }, ADMIN).errors.reason, "停用須填寫原因");
    assert.equal(svc.suspendAccount(id, { reason: "離職" }, { email: "w@example.com" }).errors.form, "不能停用自己的帳號");
    assert.equal(svc.suspendAccount("demo-reader", { reason: "x" }, ADMIN).ok, false);
  });

  test("停用後已登入的會被登出、不能登入並顯示原因；重新啟用後可以登入", () => {
    addUser({ email: "w@example.com", role: "reader" });
    const id = "u-w@example.com";
    auth.login({ email: "w@example.com", password: "test1234" });
    assert.ok(auth.getCurrentUser());

    assert.equal(svc.suspendAccount(id, { reason: "已離職" }, ADMIN).ok, true);
    assert.equal(auth.getCurrentUser(), null, "已登入的被登出");
    const login = auth.login({ email: "w@example.com", password: "test1234" });
    assert.equal(login.status, "suspended");
    assert.match(login.error, /帳號已停用：已離職/);
    assert.equal(lastMailTo("w@example.com").type, "suspended");

    assert.equal(svc.reactivateAccount(id, { note: "復職" }, ADMIN).ok, true);
    assert.equal(auth.login({ email: "w@example.com", password: "test1234" }).ok, true);
    assert.equal(lastMailTo("w@example.com").type, "reactivated");
    assert.deepEqual(svc.getAccountById(id).history.map((h) => [h.action, h.reason]), [
      ["suspend", "已離職"],
      ["reactivate", "復職"],
    ]);
    assert.equal(svc.reactivateAccount(id, {}, ADMIN).ok, false, "只有已停用的可以重新啟用");
  });
});

describe("系統管理員建立帳號", () => {
  test("可建立全部角色（含系統管理員、資源管理員）；建立後為已啟用但尚未設定密碼", () => {
    for (const role of ["admin", "resource_manager", "reader", "manager"]) {
      const result = svc.createAccount({ ...svc.createEmptyAccountForm(), name: `${role}範例`, email: `${role}@example.com`, role }, ADMIN);
      assert.equal(result.ok, true, role);
      assert.equal(result.account.status, "active");
      assert.equal(svc.getAccountById(result.account.id).hasPassword, false);
      assert.deepEqual(result.account.createdBy, ADMIN);
    }
    assert.deepEqual(auth.login({ email: "admin@example.com", password: "" }), FAILED, "尚未設定密碼不能登入");
  });

  test("寄出設定密碼信，設定後即可登入", () => {
    const { account, mail: setupMail } = svc.createAccount(
      { ...svc.createEmptyAccountForm(), name: "林範例", email: "rm@example.com", role: "resource_manager" },
      ADMIN
    );
    assert.equal(setupMail.type, "account_created");
    const token = setupMail.links[0].path.split("token=")[1];
    assert.equal(svc.checkResetToken(token).purpose, "setup");
    assert.equal(svc.resetPassword(token, PASSWORD, PASSWORD).ok, true);
    assert.equal(auth.login({ email: "rm@example.com", password: PASSWORD }).ok, true);
    assert.equal(auth.getCurrentRole(), "resource_manager");
    assert.equal(account.history[0].action, "create");
  });

  test("資源點須選擇資源並完成綁定；判讀人員可指定類別；Email 不能重複", () => {
    const base = { ...svc.createEmptyAccountForm(), name: "陳範例", email: "p@example.com", role: "provider" };
    assert.ok(svc.createAccount(base, ADMIN).errors.resourceId);
    svc.createAccount({ ...base, resourceId: RES_A }, ADMIN);
    assert.deepEqual(auth.getProviderAccountsForResource(RES_A).map((a) => a.email), ["p@example.com"]);
    assert.ok(svc.createAccount({ ...base, resourceId: RES_A }, ADMIN).errors.email);
    assert.ok(svc.createAccount({ ...base, email: "admin@demo.carelink", resourceId: RES_A }, ADMIN).errors.email);

    const { account } = svc.createAccount({ ...svc.createEmptyAccountForm(), name: "郭範例", email: "r@example.com", role: "reader", medicalType: "doctor" }, ADMIN);
    assert.equal(account.readerType, "doctor");
  });

  test("已退回的 Email 不能由建立帳號覆蓋（請申請人重新申請）", () => {
    const { account } = apply("reader");
    svc.reviewAccount(account.id, { decision: "reject", methods: ["phone"], reason: "x" }, ADMIN);
    assert.ok(svc.createAccount({ ...svc.createEmptyAccountForm(), name: "李範例", email: "li@example.com", role: "reader" }, ADMIN).errors.email);
  });
});

describe("忘記密碼與重設密碼", () => {
  const resetToken = (email) => lastMailTo(email).links[0].path.split("token=")[1];

  test("不論 Email 是否存在都回傳相同訊息；只寄給已啟用的註冊帳號", () => {
    addUser({ email: "w@example.com", role: "reader" });
    addUser({ email: "s@example.com", role: "reader", status: "suspended" });
    const messages = ["w@example.com", "nobody@example.com", "s@example.com", "admin@demo.carelink"].map(
      (email) => svc.requestPasswordReset(email).message
    );
    assert.equal(new Set(messages).size, 1);
    assert.deepEqual(mailTypes("w@example.com"), ["password_reset"]);
    assert.deepEqual(mailTypes("nobody@example.com"), []);
    assert.deepEqual(mailTypes("s@example.com"), [], "停用的帳號不寄");
    assert.deepEqual(mailTypes("admin@demo.carelink"), [], "示範帳號的密碼寫在程式中，不寄");
  });

  test("重設後可用新密碼登入，舊密碼失效；連結只能使用一次", () => {
    addUser({ email: "w@example.com", role: "reader" });
    svc.requestPasswordReset("w@example.com");
    const token = resetToken("w@example.com");
    assert.match(svc.resetPassword(token, "short1", "short1").error, /至少 8 碼/);
    assert.equal(svc.resetPassword(token, "newpass99", "newpass98").error, "兩次輸入的密碼不一致");
    assert.equal(svc.resetPassword(token, "newpass99", "newpass99").ok, true);
    assert.equal(auth.login({ email: "w@example.com", password: "test1234" }).ok, false);
    assert.equal(auth.login({ email: "w@example.com", password: "newpass99" }).ok, true);
    assert.equal(svc.checkResetToken(token).error, "此連結已使用過，如需設定新密碼，請在登入頁使用「忘記密碼」重新取得連結");
  });

  test("忘記密碼的連結 60 分鐘後過期，過期時提示用「忘記密碼」重新取得；重設成功後同一帳號其他未使用的連結也失效", () => {
    addUser({ email: "w@example.com", role: "reader" });
    svc.requestPasswordReset("w@example.com", { now: at("09:00") });
    const first = resetToken("w@example.com");
    assert.equal(svc.checkResetToken(first, { now: at("10:00") }).ok, true, "剛好 60 分鐘仍有效");
    assert.equal(svc.checkResetToken(first, { now: at("10:01") }).error, "連結已過期，請在登入頁使用「忘記密碼」重新取得連結");

    svc.requestPasswordReset("w@example.com", { now: at("10:05") });
    const second = resetToken("w@example.com");
    svc.requestPasswordReset("w@example.com", { now: at("10:06") });
    const third = resetToken("w@example.com");
    assert.equal(svc.resetPassword(third, "newpass99", "newpass99", { now: at("10:10") }).ok, true);
    assert.equal(svc.checkResetToken(second, { now: at("10:10") }).ok, false);
    assert.equal(svc.checkResetToken("not-a-token").error, "連結無效，請在登入頁使用「忘記密碼」重新取得連結");
  });

  test("設定密碼的連結（審核通過、建立帳號）7 天內有效", () => {
    const { account } = apply("manager", {}, {}, { now: at("09:00") });
    approve(account.id, {}, { now: at("09:00") });
    const approvedToken = tokenIn(lastMailTo("li@example.com"));
    svc.createAccount({ ...svc.createEmptyAccountForm(), name: "林範例", email: "rm@example.com", role: "resource_manager" }, ADMIN, {
      now: at("09:00"),
    });
    const createdToken = tokenIn(lastMailTo("rm@example.com"));
    const sevenDays = new Date(at("09:00").getTime() + 7 * 24 * 60 * 60_000);
    const afterSevenDays = new Date(sevenDays.getTime() + 60_000);
    for (const token of [approvedToken, createdToken]) {
      assert.equal(svc.checkResetToken(token, { now: sevenDays }).ok, true, "剛好 7 天仍有效");
      assert.equal(svc.checkResetToken(token, { now: afterSevenDays }).error, "連結已過期，請在登入頁使用「忘記密碼」重新取得連結");
    }
  });

  test("忘記密碼也可用於尚未設定密碼的已啟用帳號", () => {
    const { account } = apply("reader");
    approve(account.id);
    svc.requestPasswordReset("li@example.com");
    assert.equal(lastMailTo("li@example.com").type, "password_reset");
    assert.equal(setPasswordFromMail("li@example.com").ok, true);
    assert.equal(auth.login({ email: "li@example.com", password: PASSWORD }).ok, true);
  });
});

describe("登入訊息不透露帳號狀態", () => {
  test("Email 不存在、密碼錯誤、待審核、已退回、已開通未設定密碼：訊息完全相同，並提示查看 Email 或使用忘記密碼", () => {
    addUser({ email: "w@example.com", role: "reader" });
    apply("reader", { email: "pending@example.com" });
    const rejected = apply("reader", { email: "rejected@example.com" });
    svc.reviewAccount(rejected.account.id, { decision: "reject", methods: ["phone"], reason: "x" }, ADMIN);
    const approved = apply("reader", { email: "approved@example.com" });
    approve(approved.account.id);

    const results = [
      ["nobody@example.com", PASSWORD],
      ["w@example.com", "wrong1234"],
      ["pending@example.com", PASSWORD],
      ["rejected@example.com", PASSWORD],
      ["approved@example.com", PASSWORD],
      ["approved@example.com", ""],
    ].map(([email, password]) => auth.login({ email, password }));
    for (const r of results) assert.deepEqual(r, FAILED);
    assert.match(auth.LOGIN_FAILED_MESSAGE, /^Email 或密碼錯誤/);
    assert.match(auth.LOGIN_FAILED_MESSAGE, /若您已申請帳號但尚未設定密碼，請查看 Email 通知，或使用忘記密碼重新取得連結/);
  });

  test("已設定密碼的帳號：密碼正確後才顯示停用狀態", () => {
    addUser({ email: "s@example.com", role: "reader", status: "suspended", statusReason: "已離職" });
    assert.deepEqual(auth.login({ email: "s@example.com", password: "wrong1234" }), FAILED, "密碼錯誤時不透露停用");
    const login = auth.login({ email: "s@example.com", password: "test1234" });
    assert.equal(login.status, "suspended");
    assert.match(login.error, /帳號已停用：已離職/);
  });
});

describe("帳號列表、待辦與模擬信箱", () => {
  test("待審核排最前面（先申請的在前），示範帳號在最後", () => {
    apply("reader", { email: "b@example.com" }, {}, { now: at("10:00") });
    apply("reader", { email: "a@example.com" }, {}, { now: at("09:00") });
    addUser({ email: "w@example.com", role: "reader" });
    const list = svc.listAccounts();
    assert.deepEqual(list.slice(0, 3).map((a) => a.email), ["a@example.com", "b@example.com", "w@example.com"]);
    assert.ok(list.slice(-DEMO_ACCOUNTS.length).every((a) => a.isDemo && a.status === "active"));
    assert.deepEqual(svc.countByStatus(list), { pending: 2, active: 1 + DEMO_ACCOUNTS.length, rejected: 0, suspended: 0 });
  });

  test("待辦「待審核帳號」：只有系統管理員看得到，依申請時間排序，連到審核畫面", () => {
    apply("reader", { email: "b@example.com", name: "乙範例" }, {}, { now: at("10:00") });
    const { account } = apply("manager", { email: "a@example.com", name: "甲範例" }, {}, { now: at("09:00") });
    const todos = computeTodos({ today: "2026-10-28", assessments: [], cases: [], resources: [] });
    const admin = DEMO_ACCOUNTS.find((a) => a.role === "admin");
    const resourceManager = DEMO_ACCOUNTS.find((a) => a.role === "resource_manager");
    const forAdmin = filterTodosFor(admin, todos).filter((t) => t.type === "account_review");
    assert.deepEqual(forAdmin.map((t) => t.name), ["甲範例", "乙範例"]);
    assert.equal(forAdmin[0].link, `/admin/accounts?review=${account.id}`);
    assert.match(forAdmin[0].detail, /申請角色：健康管理員/);
    assert.deepEqual(filterTodosFor(resourceManager, todos), [], "資源管理員看不到");
    assert.deepEqual(filterTodosFor(admin, todos, "all").length, 2);
  });

  test("模擬信箱依收件人分組，每組新的在前；通知信都寫入、不實際寄出", () => {
    const { account } = apply("reader");
    approve(account.id);
    const boxes = mail.getMailboxes();
    assert.deepEqual(boxes.map((b) => b.to), ["admin@demo.carelink", "li@example.com"]);
    assert.deepEqual(boxes[1].mails.map((m) => m.type), ["approved", "application_received"]);
    assert.ok(session.data.mockMails, "存在 sessionStorage");
    assert.equal(mail.getMailById(boxes[1].mails[0].id).subject, "【CareLink】帳號已開通，請設定密碼");
  });
});

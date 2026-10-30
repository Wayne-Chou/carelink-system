<template>
  <div class="review-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="back">← 返回</button>
      </div>
      <div class="header-center">
        <h2>評估判讀</h2>
      </div>
      <div class="header-right"></div>
    </div>

    <div v-if="!assessment" class="container main">
      <div class="empty-state">
        <p>找不到這筆評估紀錄。</p>
        <button v-if="canOpen('/admin/assessments')" type="button" class="outline-btn" @click="$router.push('/admin/assessments')">回評估列表</button>
      </div>
    </div>

    <div v-else class="container main">
      <!-- 基本資料 -->
      <section class="card person-card" data-tour="review-person">
        <div class="person-head">
          <span class="code">{{ assessment.code }}</span>
          <span :class="['status-badge', assessment.status]">{{ STATUS_LABELS[assessment.status] }}</span>
        </div>
        <h1 class="person-name">{{ assessment.person.name || "未填姓名" }}</h1>
        <p class="person-meta">
          <span>填表日期 {{ assessment.filledAt }}</span>
          <span v-if="assessment.person.nationalId">身分證 {{ maskNationalId(assessment.person.nationalId) }}</span>
          <span>{{ fillModeLabel }}</span>
        </p>
        <p v-if="assessment.fillNote" class="fill-note">施測情境：{{ assessment.fillNote }}</p>
      </section>

      <!-- 已作廢 -->
      <section v-if="isVoided(assessment)" class="card voided-card" role="status">
        <h2><i class="fa-solid fa-ban" aria-hidden="true"></i> 這筆評估已作廢</h2>
        <dl class="void-info">
          <div><dt>作廢原因</dt><dd>{{ assessment.voidReason }}</dd></div>
          <div><dt>作廢時間</dt><dd>{{ formatDateTime(assessment.voidedAt) }}</dd></div>
          <div><dt>操作者</dt><dd>{{ assessment.voidedBy || "未記錄" }}</dd></div>
        </dl>
        <p class="hint">已作廢的評估保留原始資料供查詢，不列入待辦提醒與下次確認日期</p>
        <button v-if="canOpen('/admin/assessments')" type="button" class="outline-btn" @click="$router.push('/admin/assessments')">回評估列表</button>
      </section>

      <!-- 已判讀：結果摘要 -->
      <section v-if="result && !isVoided(assessment)" class="card result-card" role="status">
        <h2>
          <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
          判讀完成：{{ formatLight(result.assessment.review.light, result.assessment.review.orangeType) }}
        </h2>
        <ul class="result-list">
          <li v-if="result.case" class="case-created">
            已建立個案
            <!-- 沒有個案頁權限的角色（判讀人員）只顯示編碼，不顯示連結 -->
            <router-link v-if="canOpen(`/admin/cases/${result.case.id}`)" :to="`/admin/cases/${result.case.id}`" class="case-link">
              {{ result.case.code }}
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </router-link>
            <strong v-else class="case-code">{{ result.case.code }}</strong>
            <span class="hint inline">已直接進入第 2 階段諮詢，由健康管理員接續</span>
          </li>
          <li v-else-if="result.assessment.caseId">已開案，但找不到對應的個案資料</li>
          <li v-else-if="result.caseDeferred">尚未開案：將於個案模組上線後建立個案</li>
          <li v-if="result.assessment.nextCheckAt">下次確認日期：{{ result.assessment.nextCheckAt }}</li>
          <li v-if="result.assessment.review.light === 'yellow'">
            當場提供的資源：
            <template v-if="providedResourceItems.length">
              <ul class="provided-result">
                <li v-for="item in providedResourceItems" :key="item.id">
                  <router-link v-if="item.exists && canOpen(`/admin/resources/${item.id}`)" :to="`/admin/resources/${item.id}`">{{ item.name }}</router-link>
                  <span v-else>{{ item.name }}</span>
                  <small v-if="item.phone">（{{ item.contact }} {{ item.phone }}）</small>
                </li>
              </ul>
            </template>
            <span v-else class="muted inline">未選擇</span>
          </li>
          <li v-if="result.assessment.review.light === 'yellow' && result.assessment.review.escortOffered">
            民眾選擇請專人陪同
          </li>
          <li v-if="result.assessment.review.light === 'red'">
            紅燈依院內既有程序處理，不進行社會處方處置
          </li>
          <li v-if="result.assessment.review.confirmedTags.length">
            確認的需求標籤：{{ result.assessment.review.confirmedTags.map(getNeedTagLabel).join("、") }}
          </li>
        </ul>
        <div class="result-actions">
          <button v-if="nextPendingId && canOpen(`/admin/assessments/${nextPendingId}`)" type="button" class="primary-btn" @click="goNextPending">
            下一筆未判讀
          </button>
          <button v-if="canOpen('/admin/assessments')" type="button" class="outline-btn" @click="$router.push('/admin/assessments')">回評估列表</button>
          <button v-if="canReview && !result.assessment.caseId && !editing" type="button" class="text-btn" @click="startEdit">
            修改判讀
          </button>
        </div>
      </section>

      <p v-if="!canReview" class="readonly-note" data-tour="review-readonly">
        <i class="fa-solid fa-eye" aria-hidden="true"></i>
        唯讀：您可以查看這筆已開案評估的判讀結果，修改判讀與作廢需由判讀人員處理。
      </p>

      <template v-if="editing && canReview">
        <!-- 判讀人員 -->
        <section class="card">
          <h2 class="section-title">判讀人員</h2>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="field-label" for="reader-name">姓名 <span class="required">*</span></label>
              <input id="reader-name" v-model.trim="draft.readerName" type="text" :class="{ invalid: errors.readerName }" />
              <p v-if="errors.readerName" class="field-error">{{ errors.readerName }}</p>
            </div>
            <div class="col-md-6">
              <label class="field-label" for="reader-type">類別</label>
              <select id="reader-type" v-model="draft.readerType">
                <option value="">請選擇</option>
                <option v-for="o in READER_TYPE_OPTIONS" :key="o.code" :value="o.code">{{ o.label }}</option>
              </select>
            </div>
          </div>
          <p class="reminder">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> {{ RED_REMINDER }}
          </p>
        </section>

        <!-- 第一步 Q12 -->
        <section class="card step-card" data-tour="review-steps">
          <header class="step-head">
            <h2 class="section-title"><span class="step-no">1</span> Q12 不順心的事</h2>
            <button type="button" class="emergency-btn" @click="markEmergency">
              <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> 發現緊急狀況
            </button>
          </header>
          <div class="step-body">
            <div class="answers-col">
              <p class="question-text">{{ Q12_TEXT }}</p>
              <blockquote v-if="assessment.answers.q12" class="q12-answer">{{ assessment.answers.q12 }}</blockquote>
              <p v-else class="muted">民眾未填寫</p>
              <template v-if="assessment.answers.q12">
                <label class="field-label" for="q12-note">Q12 談話紀錄</label>
                <textarea id="q12-note" v-model="draft.q12Note" rows="3" placeholder="與民眾談 Q12 的內容"></textarea>
              </template>
            </div>
            <aside class="prompts-col">
              <template v-if="assessment.answers.q12">
                <p class="prompts-title">對話指引</p>
                <p class="guide-say">{{ Q12_GUIDE.ask }}</p>
                <p class="guide-flag">{{ Q12_GUIDE.redFlag }}</p>
                <template v-if="advice.prompts.q12.length">
                  <p class="prompts-title system">系統提示</p>
                  <ul class="prompt-list">
                    <li v-for="p in advice.prompts.q12" :key="p">{{ p }}</li>
                  </ul>
                </template>
              </template>
              <p v-else class="muted">Q12 空白，可直接進入 Q11</p>
            </aside>
          </div>
        </section>

        <!-- 第二步 Q11 -->
        <section class="card step-card">
          <header class="step-head">
            <h2 class="section-title"><span class="step-no">2</span> Q11 生活支持需求</h2>
            <button type="button" class="emergency-btn" @click="markEmergency">
              <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> 發現緊急狀況
            </button>
          </header>
          <div class="step-body">
            <div class="answers-col">
              <p v-if="!assessment.answers.q11.length" class="muted">未勾選（選擇不回答）</p>
              <div v-for="code in assessment.answers.q11" :key="code" class="q11-item">
                <div class="q11-head">
                  <strong>{{ getQ11Label(code) }}</strong>
                  <label v-if="code !== 'q11_none'" class="urgent-check">
                    <input
                      type="checkbox"
                      :checked="q11Note(code).urgent"
                      @change="setQ11Note(code, { urgent: $event.target.checked })"
                    />
                    急迫
                  </label>
                </div>
                <input
                  v-if="code !== 'q11_none'"
                  type="text"
                  :value="q11Note(code).note"
                  :aria-label="`${getQ11Label(code)} 談話紀錄`"
                  placeholder="談話紀錄"
                  @input="setQ11Note(code, { note: $event.target.value })"
                />
              </div>
            </div>
            <aside class="prompts-col">
              <template v-if="q11NeedItems.length || q11HasTalk">
                <p class="prompts-title">對話指引</p>
                <p v-for="code in q11NeedItems" :key="code" class="guide-say">{{ getQ11Ask(getQ11Label(code)) }}</p>
                <template v-if="q11NeedItems.length">
                  <p class="guide-sub">急迫度</p>
                  <p class="guide-say">{{ Q11_GUIDE.urgencyAsk }}</p>
                  <p class="guide-flag">{{ Q11_GUIDE.urgencyRedFlag }}</p>
                </template>
                <template v-if="q11HasTalk">
                  <p class="guide-sub">勾「想找人聊聊」</p>
                  <p class="guide-say">{{ Q11_GUIDE.talkSay }}</p>
                  <p class="guide-action">{{ Q11_GUIDE.talkAction }}</p>
                </template>
              </template>
              <p v-else class="muted">民眾表示目前沒有其他需要，或選擇不回答</p>
              <template v-if="advice.prompts.q11.length">
                <p class="prompts-title system">系統提示</p>
                <ul class="prompt-list">
                  <li v-for="p in advice.prompts.q11" :key="p">{{ p }}</li>
                </ul>
              </template>
            </aside>
          </div>
        </section>

        <!-- 第三步 Q1–Q10 -->
        <section class="card step-card">
          <header class="step-head">
            <h2 class="section-title"><span class="step-no">3</span> Q1–Q10 生活狀況</h2>
            <button type="button" class="emergency-btn" @click="markEmergency">
              <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> 發現緊急狀況
            </button>
          </header>
          <p class="step-summary">
            答是 {{ advice.stats.yesCount }} 題、答否 {{ advice.stats.noCount }} 題、不回答 {{ advice.stats.skipCount }} 題｜{{ QUESTION_FOLLOW_UP_NOTE }}
          </p>
          <div v-for="q in QUESTIONS" :key="q.key" :class="['question-row', answerOf(q.key)]">
            <div class="answers-col">
              <p class="question-line">
                <span class="q-key">{{ q.key.toUpperCase() }}</span>
                <span class="q-text">{{ q.text }}</span>
                <span :class="['answer-badge', answerOf(q.key)]">{{ answerLabel(q.key) }}</span>
              </p>
              <template v-if="needsFollowUp(q.key) || questionNote(q.key).note || openedNotes.includes(q.key)">
                <div v-if="q.key === 'q4' && answerOf('q4') === 'no'" class="q4-direction">
                  <span>追問結果：</span>
                  <label>
                    <input v-model="q4NothingToDo" type="radio" :value="false" /> 提不起勁（偏向心理支持）
                  </label>
                  <label>
                    <input v-model="q4NothingToDo" type="radio" :value="true" /> 沒什麼事可做（比照 Q2）
                  </label>
                </div>
                <input
                  type="text"
                  :value="questionNote(q.key).note"
                  :aria-label="`${q.key.toUpperCase()} 追問紀錄`"
                  placeholder="追問紀錄"
                  @input="setQuestionNote(q.key, $event.target.value)"
                />
                <template v-if="q.key === 'q5'">
                  <label class="field-label small" for="former-interests">以前喜歡做的事</label>
                  <input id="former-interests" v-model="draft.formerInterests" type="text" />
                </template>
              </template>
              <button v-else type="button" class="text-btn small" @click="openedNotes.push(q.key)">
                ＋ 追問紀錄
              </button>
            </div>
            <!-- 答否、不回答，或已展開追問紀錄的題目才顯示對話指引 -->
            <aside v-if="showGuide(q.key)" class="prompts-col">
              <p v-if="needsFollowUp(q.key)" class="meaning">可能意涵：{{ Q1_Q10_SUGGESTIONS[q.key].meaning }}</p>
              <p class="prompts-title">對話指引：建議追問</p>
              <ul class="guide-asks">
                <li v-for="ask in QUESTION_FOLLOW_UPS[q.key].asks" :key="ask">{{ ask }}</li>
              </ul>
              <p v-if="QUESTION_FOLLOW_UPS[q.key].caution" class="guide-caution">
                <strong>注意：</strong>{{ QUESTION_FOLLOW_UPS[q.key].caution }}
              </p>
              <template v-if="questionPrompts(q.key).length">
                <p class="prompts-title system">系統提示</p>
                <ul class="prompt-list">
                  <li v-for="p in questionPrompts(q.key)" :key="p">{{ p }}</li>
                </ul>
              </template>
            </aside>
          </div>
          <div class="extra-assessments">
            <span class="field-label inline">加做的評估：</span>
            <label v-for="o in EXTRA_ASSESSMENT_OPTIONS" :key="o.code">
              <input v-model="draft.extraAssessments" type="checkbox" :value="o.code" /> {{ o.label }}
            </label>
          </div>
        </section>

        <!-- 第四步 判定燈號 -->
        <section ref="decisionSection" class="card step-card decision-card" data-tour="review-decision">
          <header class="step-head">
            <h2 class="section-title"><span class="step-no">4</span> 判定燈號</h2>
          </header>

          <div :class="['suggestion-box', advice.suggestedLight || 'none']">
            <p class="suggestion-title">
              系統建議：
              <strong>{{ advice.suggestedLight ? formatLight(advice.suggestedLight, advice.suggestedOrangeType) : "無法自動建議" }}</strong>
            </p>
            <ul>
              <li v-for="r in advice.reasons" :key="r">{{ r }}</li>
            </ul>
            <p class="suggestion-note">建議僅供參考，燈號由判讀人員依談話內容決定</p>
          </div>

          <fieldset class="light-options">
            <legend class="field-label">判定燈號 <span class="required">*</span></legend>
            <label
              v-for="o in LIGHT_OPTIONS"
              :key="o.code"
              :class="['light-option', o.code, { selected: draft.light === o.code }]"
            >
              <input v-model="draft.light" type="radio" name="light" :value="o.code" />
              <span class="light-icon" aria-hidden="true">{{ o.icon }}</span>
              <span>
                <strong>{{ o.label }}</strong>
                <small>{{ o.description }}</small>
              </span>
            </label>
          </fieldset>
          <p v-if="errors.light" class="field-error">{{ errors.light }}</p>

          <!-- 對話指引：各燈號的說法（橘燈選定類型後才顯示） -->
          <div v-if="lightScript" :class="['script-box', draft.light]" aria-live="polite">
            <p class="prompts-title">對話指引：建議說法</p>
            <p v-if="lightScript.say" class="guide-say">{{ lightScript.say }}</p>
            <p v-if="lightScript.note" class="guide-note">{{ lightScript.note }}</p>
            <p v-if="lightScript.closing" class="guide-note">離開前：<span class="guide-say inline">{{ lightScript.closing }}</span></p>
          </div>

          <!-- 紅燈 -->
          <div v-if="draft.light === 'red'" class="light-fields red">
            <p class="field-label">紅燈原因 <span class="required">*</span></p>
            <div class="check-grid">
              <label v-for="o in RED_REASON_OPTIONS" :key="o.code">
                <input v-model="draft.redReasons" type="checkbox" :value="o.code" /> {{ o.label }}
              </label>
            </div>
            <p v-if="errors.redReasons" class="field-error">{{ errors.redReasons }}</p>
            <label class="field-label" for="red-referred">轉介對象</label>
            <input id="red-referred" v-model.trim="draft.redReferredTo" type="text" placeholder="例：社工、精神科、急難救助窗口" />
            <p class="hint">紅燈依院內既有程序處理，不進行社會處方處置，也不開案</p>
          </div>

          <!-- 橘燈 -->
          <div v-if="draft.light === 'orange'" class="light-fields orange">
            <p class="field-label">橘燈類型 <span class="required">*</span></p>
            <div class="type-options">
              <label
                v-for="o in ORANGE_TYPE_OPTIONS"
                :key="o.code"
                :class="['type-option', { selected: draft.orangeType === o.code }]"
              >
                <input v-model="draft.orangeType" type="radio" name="orange-type" :value="o.code" />
                {{ o.label }}
              </label>
            </div>
            <p v-if="errors.orangeType" class="field-error">{{ errors.orangeType }}</p>

            <template v-if="draft.orangeType === 'refer' || draft.orangeType === 'hesitant'">
              <label class="consent-check">
                <input v-model="draft.consent" type="checkbox" />
                民眾同意轉介給健康管理員 <span class="required">*</span>
              </label>
              <p v-if="errors.consent" class="field-error">{{ errors.consent }}</p>
            </template>
            <template v-if="draft.orangeType === 'reserved'">
              <label class="field-label" for="decline-reason">婉拒原因 <span class="required">*</span></label>
              <textarea id="decline-reason" v-model="draft.declineReason" rows="2" :class="{ invalid: errors.declineReason }"></textarea>
              <p v-if="errors.declineReason" class="field-error">{{ errors.declineReason }}</p>
            </template>
          </div>

          <!-- 黃燈 -->
          <div v-if="draft.light === 'yellow'" class="light-fields yellow">
            <label class="consent-check">
              <input v-model="draft.escortOffered" type="checkbox" />
              民眾選擇請專人陪同
            </label>
            <p v-if="escortPrompt" class="hint strong">
              <i class="fa-solid fa-lightbulb" aria-hidden="true"></i> {{ escortPrompt }}
            </p>
          </div>

          <!-- 需求標籤確認（橘燈、黃燈） -->
          <div v-if="draft.light === 'orange' || draft.light === 'yellow'" class="tags-confirm">
            <p class="field-label">
              {{ draft.light === "yellow" ? "黃燈程序 1｜釐清類型：確認需求標籤" : "確認需求標籤" }}
            </p>
            <p class="hint">Q11 的標籤可直接採用；只來自 Q1–Q10 的標籤請與民眾確認後再勾選</p>
            <div v-if="advice.suggestedTags.length" class="tag-list">
              <label
                v-for="s in advice.suggestedTags"
                :key="s.tag"
                :class="['tag-option', { selected: draft.confirmedTags.includes(s.tag) }]"
              >
                <input v-model="draft.confirmedTags" type="checkbox" :value="s.tag" />
                <span>
                  <strong>{{ getNeedTagLabel(s.tag) }}</strong>
                  <small>
                    來源：{{ s.sources.map(sourceLabel).join("、") }}
                    <em v-if="s.requiresConfirmation">須確認</em>
                  </small>
                </span>
              </label>
            </div>
            <p v-else class="muted">沒有系統建議的標籤</p>
            <div class="add-tag">
              <select v-model="extraTag" aria-label="加入其他需求標籤">
                <option value="">＋ 加入其他標籤</option>
                <option v-for="t in addableTags" :key="t.code" :value="t.code">{{ t.label }}</option>
              </select>
            </div>
            <p v-if="extraConfirmedTags.length" class="hint">
              另外加入：{{ extraConfirmedTags.map(getNeedTagLabel).join("、") }}
            </p>
          </div>

          <!-- 黃燈程序 2、3（對話指引第四節） -->
          <div v-if="draft.light === 'yellow'" class="yellow-program" data-tour="review-yellow">
            <p class="field-label">黃燈程序 2｜指出入口</p>
            <p class="hint">
              開啟探索頁並帶入上方確認的需求標籤，和民眾一起看；不會用數位工具的民眾，可以改提供下方資源的聯絡電話。
            </p>
            <button type="button" class="outline-btn" @click="openExplore">
              <i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i>
              開啟探索頁{{ draft.confirmedTags.length ? `（${draft.confirmedTags.map(getNeedTagLabel).join("、")}）` : "" }}
            </button>

            <p class="field-label step-gap">黃燈程序 3｜選一個起點 <small class="optional">選配</small></p>
            <p class="hint">當場和民眾挑一個離家近、時間合適的資源，記錄為「提供的資源」。</p>
            <div class="provided-filter">
              <span>{{ draft.confirmedTags.length && !showAllProvided ? "符合確認標籤的資源" : "全部可推薦資源" }}（{{ providedCandidates.length }}）</span>
              <button
                v-if="draft.confirmedTags.length"
                type="button"
                class="text-btn small"
                @click="showAllProvided = !showAllProvided"
              >
                {{ showAllProvided ? "只看符合標籤的" : "顯示全部可推薦資源" }}
              </button>
            </div>
            <p v-if="!providedCandidates.length" class="muted">沒有符合的資源，可以改看全部可推薦資源</p>
            <div class="provided-list">
              <label
                v-for="r in providedCandidates"
                :key="r.id"
                :class="['provided-option', { selected: draft.providedResources.includes(r.id) }]"
              >
                <input v-model="draft.providedResources" type="checkbox" :value="r.id" />
                <span>
                  <strong>{{ r.name }}</strong>
                  <small>{{ formatRegion(r) }}｜{{ formatSchedule(r.schedule) || "時間請洽詢" }}</small>
                  <small v-if="r.publicContact.phone">
                    <i class="fa-solid fa-phone" aria-hidden="true"></i> {{ r.publicContact.name }} {{ r.publicContact.phone }}
                  </small>
                </span>
              </label>
            </div>
            <p v-if="draft.providedResources.length" class="hint strong-ok">
              已選 {{ draft.providedResources.length }} 個資源
            </p>
          </div>

          <p v-if="submitError" class="field-error" role="alert">{{ submitError }}</p>
          <div class="submit-row">
            <button v-if="result" type="button" class="outline-btn" @click="cancelEdit">取消修改</button>
            <button type="button" class="primary-btn" @click="submit">完成判讀</button>
          </div>
        </section>
      </template>

      <!-- 作廢（頁面最下方） -->
      <section v-if="canReview && !isVoided(assessment)" class="card void-card" data-tour="review-void">
        <h2 class="section-title small">作廢這筆評估</h2>
        <template v-if="!voidCheck.ok">
          <p class="hint">
            <i class="fa-solid fa-lock" aria-hidden="true"></i> {{ voidCheck.reason }}
          </p>
        </template>
        <template v-else-if="!voidFormOpen">
          <p class="hint">誤建、重複填寫或填錯對象時使用。作廢後資料仍保留，但不會再出現在待辦與預設列表中，也無法再判讀。</p>
          <button type="button" class="danger-outline-btn" @click="voidFormOpen = true">作廢這筆評估</button>
        </template>
        <template v-else>
          <label class="field-label" for="void-reason">作廢原因 <span class="required">*</span></label>
          <textarea
            id="void-reason"
            v-model.trim="voidReason"
            rows="2"
            placeholder="例：重複填寫，以 Ast003 為準"
            :class="{ invalid: voidError }"
          ></textarea>
          <p v-if="voidError" class="field-error" role="alert">{{ voidError }}</p>
          <div class="void-actions">
            <button type="button" class="outline-btn" @click="closeVoidForm">取消</button>
            <button type="button" class="danger-btn" @click="confirmVoid">確認作廢</button>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { useCanOpen } from "../composables/useCanOpen.js";
import { computed, nextTick, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { FILL_MODE_OPTIONS, QUESTIONS, Q12_TEXT, getQ11Label } from "../config/assessmentForm.js";
import {
  EXTRA_ASSESSMENT_OPTIONS,
  LIGHT_OPTIONS,
  ORANGE_TYPE_OPTIONS,
  READER_TYPE_OPTIONS,
  RED_REASON_OPTIONS,
  STATUS_LABELS,
  formatLight,
} from "../config/assessmentLabels.js";
import { Q1_Q10_SUGGESTIONS } from "../config/needMapping.js";
import { NEED_TAGS, getNeedTagLabel } from "../config/needTags.js";
import { RED_REMINDER, SKIP_PROMPT, adviseAssessment } from "../services/assessmentAdvisor.js";
import {
  QUESTION_FOLLOW_UP_NOTE,
  QUESTION_FOLLOW_UPS,
  Q11_GUIDE,
  Q12_GUIDE,
  getLightScript,
  getQ11Ask,
} from "../config/dialogueGuide.js";
import {
  canVoid,
  getAllAssessments,
  getAssessmentById,
  isPendingCaseOpening,
  isVoided,
  maskNationalId,
  reviewAssessment,
  sortForList,
  validateReview,
  voidAssessment,
} from "../services/assessmentService.js";
import { getCaseById } from "../services/caseService.js";
import { getRecommendableResources, getResourceById } from "../services/resourceService.js";
import { filterResources } from "../services/resourceSearch.js";
import { getCurrentUser } from "../utils/auth.js";
import { can, canReviewAssessment } from "../services/accessControl.js";
import { deepClone } from "../utils/clone.js";
import { goBack } from "../utils/navigation.js";
import { formatDateTime, formatRegion, formatSchedule } from "../utils/resourceFormat.js";

const route = useRoute();
const router = useRouter();
// 導向沒有權限的頁面的連結與按鈕一律不顯示
const canOpen = useCanOpen();
// 角色權限（原型階段）：健康管理員只能唯讀查看已開案的評估；判讀人員沒有個案頁權限（連結由 canOpen 判斷）
const currentUser = getCurrentUser();
const canReview = canReviewAssessment(currentUser);
const canList = can(currentUser, "assessment.list");

const back = () => goBack(router, canList ? "/admin/assessments" : homePathFor(currentUser));

const assessment = ref(null);

// ── 判讀草稿 ──
// questionNotes 每題為 { note }，Q4 另有 nothingToDo（追問結果為「沒什麼事可做」）
const initialDraft = (a) => {
  const review = deepClone(a.review);
  return {
    ...review,
    // 判讀人員姓名與類別由登入帳號帶入（例：示範帳號郭範例為醫師）
    readerName: review.readerName || currentUser?.name || "",
    readerType: review.readerType || currentUser?.readerType || "",
    consent: review.consent === true,
    redReasons: [...review.redReasons],
    extraAssessments: [...review.extraAssessments],
    confirmedTags: [...review.confirmedTags],
  };
};

const draft = reactive({});
const q4NothingToDo = ref(false);
const openedNotes = ref([]);
const extraTag = ref("");
const errors = ref({});
const submitError = ref("");
const decisionSection = ref(null);
const result = ref(null);
const editing = ref(false);
const voidFormOpen = ref(false);
const voidReason = ref("");
const voidError = ref("");

const advice = computed(() =>
  adviseAssessment(
    { answers: assessment.value?.answers ?? {}, review: draft },
    { q4NothingToDo: q4NothingToDo.value }
  )
);

// ── 作廢：填原因 → 確認對話框（二次確認）→ voidAssessment ──
const voidCheck = computed(() => canVoid(assessment.value));

function closeVoidForm() {
  voidFormOpen.value = false;
  voidReason.value = "";
  voidError.value = "";
}

const confirmVoid = () => {
  voidError.value = voidReason.value ? "" : "請填寫作廢原因";
  if (voidError.value) return;
  const ok = confirm(
    `確定要作廢 ${assessment.value.code}（${assessment.value.person.name || "未填姓名"}）嗎？\n\n作廢後無法再判讀，也不會出現在待辦與預設列表中；資料仍會保留。`
  );
  if (!ok) return;
  const res = voidAssessment(assessment.value.id, {
    reason: voidReason.value,
    actor: getCurrentUser()?.name ?? "",
  });
  if (!res.ok) {
    voidError.value = Object.values(res.errors).join("；");
    return;
  }
  closeVoidForm();
  editing.value = false;
  assessment.value = res.assessment;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// 載入評估紀錄；從「下一筆未判讀」切換時路由元件會沿用，所以依網址參數重新載入
const load = (id) => {
  assessment.value = getAssessmentById(id);
  errors.value = {};
  submitError.value = "";
  openedNotes.value = [];
  closeVoidForm();
  if (!assessment.value) return;

  for (const key of Object.keys(draft)) delete draft[key];
  Object.assign(draft, initialDraft(assessment.value));
  q4NothingToDo.value = !!assessment.value.review.questionNotes?.q4?.nothingToDo;

  // 已判讀過的紀錄先顯示結果，按「修改判讀」才開放編輯
  const reviewed = assessment.value.status !== "filled";
  result.value = reviewed
    ? {
        assessment: assessment.value,
        case: assessment.value.caseId ? getCaseById(assessment.value.caseId) : null,
        caseDeferred: isPendingCaseOpening(assessment.value),
      }
    : null;
  editing.value = !reviewed && canReview;

  // 初次判讀：預先勾選 Q11 來源的建議標籤（民眾自己指認的需求）
  if (!reviewed && !draft.confirmedTags.length) {
    draft.confirmedTags = advice.value.suggestedTags.filter((s) => !s.requiresConfirmation).map((s) => s.tag);
  }
  window.scrollTo({ top: 0 });
};

watch(() => route.params.id, load, { immediate: true });

const fillModeLabel = computed(
  () => FILL_MODE_OPTIONS.find((o) => o.code === assessment.value?.fillMode)?.label ?? ""
);

// ── 各題 ──
const answerOf = (key) => assessment.value.answers[key] || "unanswered";
const answerLabel = (key) => ({ yes: "是", no: "否", skip: "不回答" })[answerOf(key)] ?? "未作答";
const needsFollowUp = (key) => ["no", "skip"].includes(answerOf(key));
const showGuide = (key) =>
  needsFollowUp(key) || !!questionNote(key).note || openedNotes.value.includes(key);

// Q11：需要逐項追問的項目（不含「想找人聊聊」與「目前沒有其他需要」）
const q11NeedItems = computed(() =>
  (assessment.value?.answers.q11 || []).filter((c) => c !== "q11_talk" && c !== "q11_none")
);
const q11HasTalk = computed(() => !!assessment.value?.answers.q11.includes("q11_talk"));
// 已有對話指引「注意」的題目（Q7、Q10），隱藏內容重複的系統提示，只保留「選擇不回答」的提示
const questionPrompts = (key) => {
  const prompts = advice.value.prompts.questions[key] || [];
  return QUESTION_FOLLOW_UPS[key]?.caution ? prompts.filter((p) => p === SKIP_PROMPT) : prompts;
};

const questionNote = (key) => draft.questionNotes?.[key] || { note: "" };
const setQuestionNote = (key, note) => {
  draft.questionNotes = { ...draft.questionNotes, [key]: { ...questionNote(key), note } };
};
watch(q4NothingToDo, (value) => {
  draft.questionNotes = { ...draft.questionNotes, q4: { ...questionNote("q4"), nothingToDo: value } };
});

const q11Note = (code) => draft.q11Notes?.[code] || { note: "", urgent: false };
const setQ11Note = (code, patch) => {
  draft.q11Notes = { ...draft.q11Notes, [code]: { ...q11Note(code), ...patch } };
};

const sourceLabel = (source) => (source.startsWith("q11_") ? `Q11 ${getQ11Label(source)}` : source.toUpperCase());

// ── 標籤 ──
const suggestedTagCodes = computed(() => advice.value.suggestedTags.map((s) => s.tag));
const extraConfirmedTags = computed(() => draft.confirmedTags.filter((t) => !suggestedTagCodes.value.includes(t)));
const addableTags = computed(() =>
  NEED_TAGS.filter((t) => t.code !== "other" && !draft.confirmedTags.includes(t.code))
);
watch(extraTag, (code) => {
  if (!code) return;
  draft.confirmedTags = [...draft.confirmedTags, code];
  extraTag.value = "";
});

const escortPrompt = computed(() => advice.value.prompts.general.find((p) => p.includes("改判橘燈")) ?? "");
const lightScript = computed(() => getLightScript(draft.light, draft.orangeType));

// ── 黃燈程序 ──
// 候選資源：探索頁看得到的資源（符合推薦規則）；有確認標籤時預設只列符合標籤的，已勾選的一律保留在清單中
const exploreResources = getRecommendableResources("explore");
const showAllProvided = ref(false);
const providedCandidates = computed(() => {
  const tags = draft.confirmedTags || [];
  if (showAllProvided.value || !tags.length) return exploreResources;
  const matched = filterResources(exploreResources, { tags });
  const selected = exploreResources.filter(
    (r) => draft.providedResources?.includes(r.id) && !matched.includes(r)
  );
  return [...matched, ...selected];
});

// 在新分頁開啟探索頁並帶入確認的需求標籤，判讀頁的填寫內容不會中斷
// 不加 noopener：測試階段資料存在 sessionStorage，瀏覽器只會把資料複製給由本頁開啟（保留 opener）的新分頁
const openExplore = () => {
  const tags = draft.confirmedTags || [];
  const { href } = router.resolve({ path: "/explore", query: tags.length ? { tags: tags.join(",") } : {} });
  window.open(href, "_blank");
};

// 判讀結果顯示提供的資源；資源後來被刪除時仍顯示紀錄
const providedResourceItems = computed(() =>
  (result.value?.assessment.review.providedResources || []).map((id) => {
    const r = getResourceById(id);
    return r
      ? { id, exists: true, name: r.name, phone: r.publicContact.phone, contact: r.publicContact.name }
      : { id, exists: false, name: "（資源已不存在）", phone: "", contact: "" };
  })
);

// ── 緊急狀況：直接判紅燈並捲到燈號區 ──
const markEmergency = async () => {
  draft.light = "red";
  await nextTick();
  decisionSection.value?.scrollIntoView({ behavior: "smooth", block: "start" });
};

// ── 送出 ──
const isFilled = (v) => String(v ?? "").trim() !== "";

// 只保留有內容的談話紀錄；清掉與燈號無關的欄位
const buildReview = () => {
  const questionNotes = Object.fromEntries(
    Object.entries(draft.questionNotes || {}).filter(([, v]) => isFilled(v?.note) || v?.nothingToDo)
  );
  const q11Notes = Object.fromEntries(
    Object.entries(draft.q11Notes || {}).filter(
      ([code, v]) => assessment.value.answers.q11.includes(code) && (isFilled(v?.note) || v?.urgent)
    )
  );
  const light = draft.light;
  const usesTags = light === "orange" || light === "yellow";
  return {
    ...draft,
    questionNotes,
    q11Notes,
    q12Note: assessment.value.answers.q12 ? draft.q12Note : "",
    orangeType: light === "orange" ? draft.orangeType : "",
    consent: light === "orange" && draft.orangeType !== "reserved" ? draft.consent : null,
    declineReason: light === "orange" && draft.orangeType === "reserved" ? draft.declineReason : "",
    redReasons: light === "red" ? draft.redReasons : [],
    redReferredTo: light === "red" ? draft.redReferredTo : "",
    escortOffered: light === "yellow" ? draft.escortOffered : false,
    providedResources: light === "yellow" ? [...(draft.providedResources || [])] : [],
    suggestedTags: advice.value.suggestedTags,
    confirmedTags: usesTags ? draft.confirmedTags : [],
    reviewedAt: null,
  };
};

const showErrors = async () => {
  await nextTick();
  document.querySelector(".field-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
};

const submit = async () => {
  submitError.value = "";
  // 判讀人員姓名由頁面先檢查，沒填就不送出（資料層的 validateReview 只檢查燈號相關欄位）
  const pageErrors = isFilled(draft.readerName) ? {} : { readerName: "請填寫判讀人員姓名" };
  const review = buildReview();
  const reviewErrors = validateReview(review);
  errors.value = { ...pageErrors, ...reviewErrors };
  if (Object.keys(errors.value).length) {
    await showErrors();
    return;
  }

  const res = reviewAssessment(assessment.value.id, review);
  if (!res.ok) {
    errors.value = res.errors;
    submitError.value = res.errors.case || "";
    await showErrors();
    return;
  }
  assessment.value = res.assessment;
  result.value = res;
  editing.value = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const startEdit = () => {
  Object.assign(draft, initialDraft(assessment.value));
  q4NothingToDo.value = !!assessment.value.review.questionNotes?.q4?.nothingToDo;
  errors.value = {};
  editing.value = true;
};

const cancelEdit = () => {
  editing.value = false;
};

// ── 下一筆未判讀 ──
const nextPendingId = computed(() => {
  if (!result.value) return null;
  return sortForList(getAllAssessments()).find((a) => a.status === "filled" && a.id !== assessment.value.id)?.id ?? null;
});
const goNextPending = () => router.replace(`/admin/assessments/${nextPendingId.value}`);
</script>

<style scoped>
.review-page {
  background: #fcfaf8;
  min-height: 100vh;
  padding-bottom: 60px;
  color: #3e2723;
}

/* Top Bar */
.top-bar {
  background: #5d4037;
  color: white;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-left,
.header-right {
  flex: 1;
}
.header-center {
  flex: 2;
  text-align: center;
}
.header-center h2 {
  font-size: 18px;
  margin: 0;
  font-weight: 700;
}
.back-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.main {
  max-width: 1000px;
  padding-top: 20px;
}
.card {
  background: #fff;
  border: 1px solid #f0e6e0;
  border-radius: 16px;
  padding: 22px 24px;
  margin-bottom: 18px;
  box-shadow: 0 4px 12px rgba(93, 64, 55, 0.05);
}

/* 基本資料 */
.person-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}
.code {
  font-family: "Courier New", monospace;
  font-size: 13px;
  font-weight: 700;
  background: #f5f0ed;
  border-radius: 4px;
  padding: 1px 8px;
}
.status-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  background: #f5f0ed;
}
.status-badge.filled {
  background: #fff3e0;
  color: #e65100;
}
.status-badge.closed {
  background: #ecfdf5;
  color: #166534;
}
.person-name {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 6px;
}
.person-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 0;
  font-size: 14px;
  color: #8d6e63;
}
.fill-note {
  margin: 8px 0 0;
  font-size: 14px;
  background: #fdf8f4;
  padding: 8px 12px;
  border-radius: 8px;
}

/* 結果 */
.result-card {
  border-color: #b7dfb9;
  background: #f6fbf6;
}
.result-card h2 {
  font-size: 18px;
  font-weight: 800;
  color: #1b5e20;
  margin: 0 0 10px;
}
.result-list {
  margin: 0 0 14px;
  padding-left: 20px;
  line-height: 1.8;
}
.provided-result {
  margin: 4px 0 0;
  padding-left: 18px;
}
.provided-result small {
  color: #6d4c41;
}
.muted.inline {
  display: inline;
}
.yellow-program {
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #fffdf5;
  border: 1px solid #ffe082;
}
.yellow-program .step-gap {
  margin-top: 18px;
}
.optional {
  font-weight: 400;
  color: #a1887f;
}
.provided-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #6d4c41;
  margin: 8px 0;
}
.provided-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}
.provided-option {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  border: 1px solid #e0d5cb;
  border-radius: 10px;
  padding: 8px 10px;
  background: #fff;
  cursor: pointer;
}
.provided-option.selected {
  border-color: #5d4037;
  background: #f5ede6;
}
.provided-option strong,
.provided-option small {
  display: block;
}
.provided-option small {
  font-size: 12px;
  color: #8d6e63;
}
.hint.strong-ok {
  color: #1b5e20;
  font-weight: 700;
}
.case-code {
  margin-left: 4px;
  font-family: "Courier New", monospace;
}
.readonly-note {
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #f5f0ed;
  color: #5d4037;
  font-size: 14px;
}
.case-link {
  font-weight: 800;
  color: #1b5e20;
  margin: 0 4px;
}
.hint.inline {
  display: inline;
  margin-left: 4px;
}
.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

/* 作廢 */
.voided-card {
  background: #f7f7f7;
  border-color: #e0e0e0;
}
.voided-card h2 {
  font-size: 18px;
  font-weight: 800;
  color: #616161;
  margin: 0 0 10px;
}
.void-info {
  margin: 0 0 8px;
  display: grid;
  gap: 4px;
  font-size: 14px;
}
.void-info div {
  display: flex;
  gap: 10px;
}
.void-info dt {
  flex-shrink: 0;
  width: 64px;
  color: #8d6e63;
  font-weight: 600;
}
.void-info dd {
  margin: 0;
}
.void-card {
  margin-top: 36px;
  border-color: #f5c2c0;
  background: #fffafa;
}
.section-title.small {
  font-size: 15px;
  color: #b71c1c;
  margin-bottom: 6px;
}
.void-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}
.danger-outline-btn {
  margin-top: 10px;
  background: #fff;
  color: #c62828;
  border: 1px solid #ef9a9a;
  border-radius: 10px;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 600;
}
.danger-btn {
  background: #c62828;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 11px 22px;
  font-size: 15px;
  font-weight: 700;
}

/* 共用 */
.section-title {
  font-size: 18px;
  font-weight: 800;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.step-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #5d4037;
  color: #fff;
  font-size: 14px;
}
.field-label {
  display: block;
  font-weight: 700;
  font-size: 14px;
  margin: 12px 0 6px;
}
.field-label.small {
  font-size: 13px;
  margin-top: 8px;
}
.field-label.inline {
  display: inline;
  margin: 0;
}
.required {
  color: #d32f2f;
}
input[type="text"],
textarea,
select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0d5cb;
  border-radius: 10px;
  background: #fdfbf9;
  font-size: 15px;
}
input[type="text"]:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #c2956e;
  box-shadow: 0 0 0 3px rgba(194, 149, 110, 0.15);
}
input[type="checkbox"],
input[type="radio"] {
  accent-color: #5d4037;
  width: 18px;
  height: 18px;
  vertical-align: -3px;
}
.invalid {
  border-color: #d32f2f !important;
}
.field-error {
  color: #d32f2f;
  font-size: 13px;
  margin: 6px 0 0;
}
.hint {
  font-size: 13px;
  color: #8d6e63;
  margin: 6px 0 0;
}
.hint.strong {
  color: #8a4b08;
  background: #fff8e1;
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 600;
}
.muted {
  color: #a1887f;
  font-size: 14px;
  margin: 0;
}
.reminder {
  margin: 14px 0 0;
  font-size: 13px;
  color: #b71c1c;
  background: #fdecea;
  border-radius: 8px;
  padding: 8px 12px;
}

/* 步驟區塊：左填答、右提示 */
.step-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.emergency-btn {
  flex-shrink: 0;
  background: #fff;
  border: 2px solid #d32f2f;
  color: #c62828;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 700;
}
.emergency-btn:hover {
  background: #fdecea;
}
.step-body,
.question-row {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 18px;
}
.prompts-col {
  background: #fdf8f4;
  border-left: 3px solid #c2956e;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 14px;
  align-self: start;
}
.prompts-title {
  font-weight: 700;
  font-size: 13px;
  color: #8d6e63;
  margin: 0 0 6px;
}
.prompts-title.system {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #e0d5cb;
}
/* 對話指引：建議說法以引號樣式呈現 */
.guide-say {
  margin: 0 0 6px;
  padding: 6px 10px;
  background: #fff;
  border-radius: 6px;
  color: #3e2723;
  line-height: 1.6;
}
.guide-say::before {
  content: "「";
  color: #b98158;
}
.guide-say::after {
  content: "」";
  color: #b98158;
}
.guide-say.inline {
  display: inline;
  padding: 0;
  background: none;
}
.guide-sub {
  margin: 10px 0 4px;
  font-size: 12px;
  font-weight: 700;
  color: #8d6e63;
}
.guide-flag {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: #b71c1c;
}
.guide-action {
  margin: 0;
  font-weight: 700;
  color: #bf360c;
}
.guide-asks {
  margin: 0 0 6px;
  padding-left: 18px;
  line-height: 1.7;
  color: #3e2723;
}
.guide-caution {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #8a4b08;
  background: #fff8e1;
  border-radius: 6px;
  padding: 6px 10px;
}
.guide-note {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #6d4c41;
}
.script-box {
  margin-top: 14px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #fdf8f4;
  border-left: 4px solid #c2956e;
  font-size: 14px;
}
.script-box.red {
  border-left-color: #d32f2f;
}
.script-box.orange {
  border-left-color: #ef6c00;
}
.script-box.yellow {
  border-left-color: #f9a825;
}
.script-box.green {
  border-left-color: #2e7d32;
}
.prompt-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.6;
}
.meaning {
  margin: 0 0 6px;
  font-weight: 700;
  color: #5d4037;
}
.question-text {
  font-size: 14px;
  color: #8d6e63;
  margin: 0 0 8px;
}
.q12-answer {
  margin: 0 0 6px;
  padding: 12px 16px;
  background: #fffaf2;
  border-left: 4px solid #c2956e;
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-line;
}

/* Q11 */
.q11-item {
  border: 1px solid #efe7dc;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.q11-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.urgent-check {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: #c62828;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Q1–Q10 */
.step-summary {
  font-size: 13px;
  color: #8d6e63;
  margin: -6px 0 12px;
}
.question-row {
  padding: 12px 0;
  border-top: 1px dashed #efe7dc;
}
.question-row.yes .question-line {
  color: #8d6e63;
}
.question-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 6px;
}
.q-key {
  font-family: "Courier New", monospace;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}
.q-text {
  flex: 1;
  font-size: 15px;
}
.answer-badge {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 999px;
  background: #edf7ee;
  color: #1b5e20;
}
.answer-badge.no {
  background: #fff3e0;
  color: #bf360c;
}
.answer-badge.skip,
.answer-badge.unanswered {
  background: #eceff1;
  color: #455a64;
}
.q4-direction {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 13px;
  margin-bottom: 6px;
}
.extra-assessments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  align-items: center;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #efe7dc;
  font-size: 14px;
}

/* 判定燈號 */
.suggestion-box {
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #f5f0ed;
  font-size: 14px;
}
.suggestion-box.red {
  background: #fdecea;
}
.suggestion-box.orange {
  background: #fff3e0;
}
.suggestion-box.yellow {
  background: #fff8e1;
}
.suggestion-box.green {
  background: #edf7ee;
}
.suggestion-title {
  margin: 0 0 4px;
  font-size: 15px;
}
.suggestion-box ul {
  margin: 0;
  padding-left: 18px;
}
.suggestion-note {
  margin: 6px 0 0;
  font-size: 12px;
  color: #8d6e63;
}
.light-options {
  border: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.light-options legend {
  grid-column: 1 / -1;
}
.light-option {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 2px solid #e0d5cb;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  background: #fff;
}
.light-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.light-option:focus-within {
  box-shadow: 0 0 0 3px rgba(194, 149, 110, 0.35);
}
.light-icon {
  font-size: 24px;
}
.light-option strong {
  display: block;
  font-size: 16px;
}
.light-option small {
  color: #8d6e63;
  font-size: 12px;
}
.light-option.selected.red {
  border-color: #d32f2f;
  background: #fdecea;
}
.light-option.selected.orange {
  border-color: #ef6c00;
  background: #fff3e0;
}
.light-option.selected.yellow {
  border-color: #f9a825;
  background: #fff8e1;
}
.light-option.selected.green {
  border-color: #2e7d32;
  background: #edf7ee;
}
.light-fields {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #fdfbf9;
  border: 1px solid #efe7dc;
}
.check-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 6px 14px;
  font-size: 14px;
}
.type-options {
  display: flex;
  gap: 10px;
}
.type-option {
  flex: 1;
  text-align: center;
  border: 2px solid #e0d5cb;
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;
  font-weight: 700;
}
.type-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.type-option:focus-within {
  box-shadow: 0 0 0 3px rgba(194, 149, 110, 0.35);
}
.type-option.selected {
  border-color: #ef6c00;
  background: #fff3e0;
}
.consent-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-weight: 700;
  font-size: 15px;
}

/* 需求標籤 */
.tags-confirm {
  margin-top: 18px;
}
.tag-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  margin-top: 8px;
}
.tag-option {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  border: 1px solid #e0d5cb;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
}
.tag-option.selected {
  border-color: #5d4037;
  background: #f5ede6;
}
.tag-option strong {
  display: block;
  font-size: 14px;
}
.tag-option small {
  font-size: 12px;
  color: #8d6e63;
}
.tag-option em {
  font-style: normal;
  color: #bf360c;
  font-weight: 700;
  margin-left: 4px;
}
.add-tag {
  margin-top: 10px;
  max-width: 260px;
}

/* 按鈕 */
.submit-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
.primary-btn {
  background: #2e7d32;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 12px 28px;
  font-size: 16px;
  font-weight: 700;
}
.outline-btn {
  background: #fff;
  color: #5d4037;
  border: 1px solid #d6ccc2;
  border-radius: 10px;
  padding: 11px 20px;
  font-size: 15px;
  font-weight: 600;
}
.text-btn {
  background: none;
  border: none;
  color: #b98158;
  font-weight: 600;
  text-decoration: underline;
  padding: 4px;
}
.text-btn.small {
  font-size: 13px;
  text-decoration: none;
}
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #8d6e63;
}

@media (max-width: 768px) {
  .step-body,
  .question-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .light-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .step-head {
    flex-wrap: wrap;
  }
}

/* 登入者與登出（UserMenu）靠右 */
.top-bar .header-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}
</style>

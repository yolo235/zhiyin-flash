<script setup lang="ts">
import { computed, ref } from 'vue'
import { demo } from '../store'
import { GUIDES } from '../data/copy'
import { INTERVENTION, REVIEW_CONCLUSION, REVIEW_ITEMS } from '../data/student'
import GuideNote from '../components/GuideNote.vue'
import { useCountUp } from '../lib/motion'

/**
 * 复盘记录 —— **左时间线 + 右详情（主从）**。
 *
 * 【2026-10-12 重做：从"一篇文章"改成"一屏主从"】
 * 上一版把它排成一节一节往下读的文章（统计条 → 你做到了什么 → 归因 → 时间线 →
 * 两种说法 → 收起参数）。blameless 的**顺序**是对的，但**读法**错了。
 * 客户的原话：「还是不好，太空了，而且过于偏向上下滚动看信息」。
 * 数得出来：同一批信息摊成 6 节之后，"看一条记录"和"看它的归因"分别落在
 * 滚动条的上下两头 —— 而这**正是复盘里唯一的那个动作**。
 * （NN/g：首屏 57%、前两屏 74% 的注意力；需要对照的两件事不能隔着滚动条。）
 *
 * 这一版换掉的是版面，保留上一版的两条口径：
 *   1. 顺序仍然是"先看做到了什么，再看归因"（.sec 的先后没变）；
 *   2. 归因仍然只归到任务 / 方法 / 方向 —— **不归到人**。
 *
 * 换成了什么：
 *   · 时间线与归因不再各占一节，而是**左 400px 列表 + 右 1fr 详情**，同屏；
 *   · 列表一行一条、行高 --row-h（跟密度皮肤一起变），整行是一个 <button>；
 *   · 默认停在"没做成"的那一条 —— 那才是这一周要看的那条，不是第一条。
 *
 * 键盘（ARIA APG · tabs，**manual activation**）：
 *   roving tabindex（只有当前项 tabindex="0"），↑↓/Home/End 移动焦点，
 *   Enter/Space 选中。选"manual"而不是"automatic"是因为右栏是一整块详情：
 *   用方向键扫过去时不该把每一屏内容都重画一遍，只有真的选定才换。
 */

const scenario = computed(() => demo.use.scenario.value)

/** 归因只有三个去处。**没有"我不行"这一项** —— 这是这一页的红线。 */
const ATTRIBUTIONS = ['任务太大', '方法不对', '方向要重估'] as const

const ATTRIBUTION_NOTES: Record<string, string> = {
  任务太大: '一次要 40 分钟以上 —— 拆小就能做',
  方法不对: '做法本身不奏效 —— 换一种试',
  方向要重估: '交回给判断方向的人',
}

const resultLabel: Record<string, string> = {
  done: '做完了',
  partial: '做了一半',
  missed: '没做成',
}

/** 每一条"结果"各自的一句读法 —— 三种结果都要有，不能只有没做成的才有话说 */
const resultNote: Record<string, string> = {
  done: '做完了就记下来，不追加评价 —— 完成记录只看真实行为。',
  partial: '做了一半：剩下的那一半归到事上（任务或方法），不归到人。',
  missed: '没做成：这一条就是这一周要看的，它的归因在下面三选一。',
}

/** "你做到了什么"直接取自 REVIEW_ITEMS，不新造内容 */
const didDone = computed(() => REVIEW_ITEMS.filter((r) => r.result === 'done'))

/** 没做成的那件（归因的对象）。没有就是没有 —— 页面不假装有。 */
const missed = computed(() => REVIEW_ITEMS.find((r) => r.result === 'missed') ?? null)

const rate = computed(() => Math.round((didDone.value.length / REVIEW_ITEMS.length) * 100))

/** 百分比滚动：这一周"动了多少手"是这一屏最该被看见的一个数 */
const { shown: rateShown } = useCountUp(rate)

/* ---------------------------------------------------------------------------
 * 主从：选中的那一行 → 右栏详情
 * ------------------------------------------------------------------------ */

/** 默认选中"没做成的那一条" */
const selectedId = ref(missed.value?.id ?? REVIEW_ITEMS[0].id)
const selected = computed(
  () => REVIEW_ITEMS.find((r) => r.id === selectedId.value) ?? REVIEW_ITEMS[0],
)

/** roving tabindex：焦点在哪一行（与"选中"分开，见文件头的 manual activation） */
const focusIndex = ref(Math.max(0, REVIEW_ITEMS.findIndex((r) => r.id === selectedId.value)))
const listEl = ref<HTMLElement | null>(null)

/** 选中那条在时间线里的序号（第几条 / 共几条）—— 让右栏知道自己站在哪儿 */
const selectedNo = computed(() => REVIEW_ITEMS.indexOf(selected.value) + 1)

function focusRow(i: number) {
  const n = REVIEW_ITEMS.length
  const next = ((i % n) + n) % n
  focusIndex.value = next
  const el = listEl.value?.children[next]
  if (el instanceof HTMLElement) el.focus()
}

function onRowKeydown(e: KeyboardEvent, i: number) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') focusRow(i + 1)
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') focusRow(i - 1)
  else if (e.key === 'Home') focusRow(0)
  else if (e.key === 'End') focusRow(REVIEW_ITEMS.length - 1)
  else return
  e.preventDefault()
}

function selectRow(i: number) {
  const row = REVIEW_ITEMS[i]
  if (!row) return
  selectedId.value = row.id
  focusIndex.value = i
}

/**
 * 归因三选一：初值就是记录里选定的那一条。
 * 让它真的可点 —— 三个按钮摆着点不动，正是 base.css 里点名批评过的
 * "能点但点了没反应"。改了之后结论照旧按记录显示，并说明下一轮会按新的重算。
 */
const picked = ref<string | null>(missed.value?.attribution ?? null)
const overridden = computed(
  () => missed.value != null && picked.value !== missed.value.attribution,
)
</script>

<template>
  <div class="page">
    <header class="page__head">
      <div class="hstack hstack-3 between wrap">
        <div>
          <h1 class="page__title">复盘记录</h1>
          <p class="page__sub">
            {{ scenario.grade }}这一轮要看的重点：{{ scenario.reviewFocus }}。
            归因归到任务、方法或方向，不归到人。
          </p>
        </div>
        <RouterLink class="btn" to="/plan">回到计划</RouterLink>
      </div>
    </header>

    <!-- 入口：放在页头正下方第一位 -->
    <GuideNote
      gkey="review"
      :text="GUIDES.review"
      :steps="[
        '先看「这一周你动过多少手」—— 做成的先摆出来',
        '左边点一条，右边是它的结果与归因',
        '没做成的那件，在右边选一个归因：任务 · 方法 · 方向（不归到人）',
      ]"
      :contents="['你做到了什么', '这一周的时间线', '归因', '两种说法', '收起参数']"
      to="/home"
      to-label="回任务与计划"
    />

    <article class="article">
      <!-- 紧凑统计条：这一周的四个数，摆在首屏最上面 -->
      <section class="sec">
        <div class="tally">
          <div class="tally__item">
            <span class="tally__n">{{ Math.round(rateShown) }}%</span><span class="tally__k">动过手</span>
          </div>
          <div class="tally__item">
            <span class="tally__n">{{ didDone.length }}</span><span class="tally__k">做完了</span>
          </div>
          <div class="tally__item">
            <span class="tally__n">{{ REVIEW_ITEMS.length - didDone.length }}</span
            ><span class="tally__k">没做完</span>
          </div>
          <div class="tally__item">
            <span class="tally__n">{{ ATTRIBUTIONS.length }}</span><span class="tally__k">个归因去处</span>
          </div>
        </div>
      </section>

      <!-- ① 先看做到的。复盘不是问责 —— 这一节原来整页都没有，现在也不许删。
              摆成一条横排：三件事用不了三行，纵向堆起来就是"太空"的来源之一。 -->
      <section class="sec">
        <h2 class="sec__title">这一周你动过 {{ Math.round(rateShown) }}% 的手</h2>
        <p class="sec__note">先看做完的，再看没做的。复盘是为了下一周好过，不是为了追责。</p>
        <ul class="rv__did sec__body">
          <li v-for="r in didDone" :key="r.id" class="rv__didrow">
            <span class="rv__dot rv__dot--done" aria-hidden="true" />
            <span class="rv__didwhat">{{ r.what }}</span>
            <span class="t-note t-num-nowrap">{{ r.when }}</span>
          </li>
        </ul>
      </section>

      <!-- ② 主从：左时间线 + 右详情。归因三选一在右栏详情里 ——
              时间线与归因同屏，这是这一版唯一的硬指标。 -->
      <section class="sec">
        <h2 class="sec__title">这一周发生了什么</h2>
        <p class="sec__note">
          只记事实与时间。左边一行一条、整行可点，选中哪条右边就是哪条的详情 ——
          默认停在没做成的那条。
        </p>

        <div class="rv sec__body">
          <!-- 左栏：时间线列表（roving tabindex） -->
          <div class="rv__list">
            <p id="rv-list-label" class="rv__listhead">
              <span>这一周 · {{ REVIEW_ITEMS.length }} 条</span>
              <span>按时间倒序</span>
            </p>
            <div
              ref="listEl"
              class="rv__items"
              role="tablist"
              aria-orientation="vertical"
              aria-labelledby="rv-list-label"
            >
              <button
                v-for="(r, i) in REVIEW_ITEMS"
                :id="`rv-tab-${r.id}`"
                :key="r.id"
                type="button"
                role="tab"
                class="rv__row"
                :class="{ 'rv__row--on': r.id === selectedId }"
                :aria-selected="r.id === selectedId"
                aria-controls="rv-panel"
                :tabindex="i === focusIndex ? 0 : -1"
                @click="selectRow(i)"
                @keydown="onRowKeydown($event, i)"
              >
                <span class="rv__dot" :class="`rv__dot--${r.result}`" aria-hidden="true" />
                <span class="rv__what">{{ r.what }}</span>
                <span class="rv__when t-note t-num-nowrap">{{ r.when }}</span>
              </button>
            </div>
            <p class="rv__foot">
              完成 / 没完成看左边那个点：灰点是做完了，红点是没做成或只做了一半。
              只记事实与时间，不记评价。
            </p>
          </div>

          <!-- 右栏：选中那条的详情 + 归因三选一 -->
          <div class="rv__detail">
            <div
              id="rv-panel"
              class="rv__panel"
              role="tabpanel"
              :aria-labelledby="`rv-tab-${selected.id}`"
            >
              <div class="rv__phead">
                <span
                  class="chip"
                  :class="selected.result === 'done' ? 'chip--done' : 'chip--attention'"
                >
                  {{ resultLabel[selected.result] }}
                </span>
                <span class="t-note t-num-nowrap">{{ selected.when }}</span>
                <span class="t-note t-num">第 {{ selectedNo }} / {{ REVIEW_ITEMS.length }} 条</span>
              </div>
              <h3 class="rv__ptitle">{{ selected.what }}</h3>
              <p class="rv__pline">
                <template v-if="selected.attribution">
                  这条当时归到 <span class="chip chip--outline">{{ selected.attribution }}</span>
                </template>
                <template v-else>这条没有归因 —— 只有没做成的才需要归因。</template>
              </p>
              <p class="rv__pnote">{{ resultNote[selected.result] }}</p>
            </div>

            <div v-if="missed" class="rv__assign">
              <p class="rv__assignhead">
                没做成的那件「{{ missed.what }}」归到哪儿 —— 三选一，界面不让你归到"我不行"
              </p>
              <p class="rv__blameless">
                归因归到任务、方法、方向，不归到人 —— 归到事上，下一步才有得改；归到人，下一步只剩自责。
              </p>

              <div class="rv__attrs" role="group" aria-label="把没做成的那件归到哪儿">
                <button
                  v-for="a in ATTRIBUTIONS"
                  :key="a"
                  type="button"
                  class="rv__attr"
                  :class="{ 'rv__attr--on': picked === a }"
                  :aria-pressed="picked === a"
                  @click="picked = a"
                >
                  <span class="rv__attrname">{{ a }}</span>
                  <span class="rv__attrnote">{{ ATTRIBUTION_NOTES[a] }}</span>
                </button>
              </div>

              <p class="rv__concl">{{ REVIEW_CONCLUSION }}</p>
              <p v-if="overridden" class="rv__recalc">
                上面这句结论是按记录里的归因（{{ missed.attribution }}）写的；你改成了「{{ picked }}」，
                下一轮按新的这个重算 —— 改归因不用解释。
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- ③ 话术对照：成对两行，中间一条竖线。不做左右两个盒子。 -->
      <section class="sec">
        <h2 class="sec__title">同一件事，两种说法</h2>
        <p class="sec__note">停滞归到任务、方法或方向；不追究，也不假装没发生。</p>
        <div class="rv__say sec__body">
          <div class="rv__saycol rv__saycol--no">
            <span class="rv__saytag">不这么说</span>
            <p>你已经三天没完成任务了，请注意自律。</p>
          </div>
          <div class="rv__saycol">
            <span class="rv__saytag">这么说</span>
            <p>看你好几天没动，来问一句 —— 上次那条确实太大了，先做 5 分钟？</p>
          </div>
        </div>
      </section>

      <!-- ④ 干预参数：不是每次都要看，收起来（原生 details，键盘可达） -->
      <section class="sec">
        <details class="fold">
          <summary class="fold__sum">
            {{ INTERVENTION.host }} —— 能主动开口的只有这一个，受 {{ INTERVENTION.rules.length }} 条参数约束
          </summary>
          <div class="fold__body">
            <ul class="rv__rules">
              <li v-for="r in INTERVENTION.rules" :key="r">{{ r }}</li>
            </ul>
            <button class="btn btn--sm" style="margin-top: var(--sp-4)" @click="demo.openIntervention()">
              看一次主动干预长什么样
            </button>
          </div>
        </details>
      </section>
    </article>


  </div>
</template>

<style scoped>
/* ===========================================================================
 * 主从：左 400px 时间线 + 右 1fr 详情
 * ---------------------------------------------------------------------------
 * 上一版把时间线与归因各排成一节，两者之间隔着滚动 —— 而"看一条记录再看它的归因"
 * 是这一页唯一的动作。这一版把它们摆进同一屏的两栏：左边点名，右边展开。
 * 400px 是"一条中文记录 + 日期"不用折行的宽度，剩下的横向全部给详情。
 * ======================================================================== */
.rv {
  display: grid;
  grid-template-columns: 400px minmax(0, 1fr);
  gap: var(--sp-5);
  align-items: start;
}

/* ---- 左栏：时间线列表 ---------------------------------------------------- */

.rv__list {
  min-width: 0;
}

.rv__listhead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-3);
  padding-bottom: var(--sp-2);
  border-bottom: var(--bw-1) solid var(--c-border);
  font-size: var(--fs-12);
  font-weight: var(--fw-medium);
  color: var(--c-text-3);
}

.rv__items {
  display: flex;
  flex-direction: column;
  margin-top: var(--sp-2);
}

/* 一行一条。行高走 --row-h：密度皮肤（极简 40 / 柔和 48 / 紧凑 32）只动高度，
   不动字号 —— 中文正文就是 14px，不给密度让路。 */
.rv__row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  min-height: var(--row-h);
  padding: 0 var(--sp-3);
  border-radius: var(--r-sm);
  text-align: left;
  color: var(--c-text);
  transition:
    background var(--mo-fast) var(--mo-ease),
    color var(--mo-fast) var(--mo-ease);
}

.rv__row:hover {
  background: var(--c-surface-2);
}

/* 选中：浅主色底 + 主色字。这一对（c-primary 压 c-primary-weak）是 check-contrast
   里登记过的必过项，所以四套皮肤下都站得住。 */
.rv__row--on,
.rv__row--on:hover {
  background: var(--c-primary-weak);
  color: var(--c-primary);
  font-weight: var(--fw-medium);
}

.rv__row--on .rv__when {
  color: var(--c-primary);
}

/* 圆点只表达"有没有动过手"：灰 = 做完了（完成不给颜色奖励），红 = 没做成 / 一半 */
.rv__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: var(--r-pill);
  background: var(--c-text-4);
}

.rv__dot--done {
  background: var(--c-done);
}

.rv__dot--partial {
  background: var(--c-attention);
}

.rv__dot--missed {
  background: var(--c-attention-strong);
}

.rv__what {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-14);
}

.rv__when {
  flex: none;
}

.rv__foot {
  margin-top: var(--sp-3);
  font-size: var(--fs-12);
  color: var(--c-text-3);
  line-height: var(--lh-snug);
}

/* ---- 右栏：选中那条的详情 ------------------------------------------------ */

.rv__detail {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  min-width: 0;
}

.rv__panel {
  min-width: 0;
}

.rv__phead {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2) var(--sp-3);
}

.rv__ptitle {
  margin-top: var(--sp-2);
  font-size: var(--fs-20);
  font-weight: var(--fw-semibold);
  letter-spacing: -0.012em;
  line-height: var(--lh-snug);
}

.rv__pline {
  margin-top: var(--sp-3);
  font-size: var(--fs-14);
  color: var(--c-text-2);
  line-height: var(--lh-snug);
}

.rv__pnote {
  margin-top: var(--sp-2);
  font-size: var(--fs-12);
  color: var(--c-text-3);
  line-height: var(--lh-snug);
  max-width: 40em;
}

/* ---- 右栏下部：归因三选一 ------------------------------------------------
   它说的**不是**上面选中那条，是"没做成的那件"，所以用一条发丝线分开、
   并且把那条的原文（missed.what）写在标题里 —— 不用读者自己回头找。 */

.rv__assign {
  padding-top: var(--sp-4);
  border-top: var(--bw-1) solid var(--c-border);
}

.rv__assignhead {
  font-size: var(--fs-14);
  font-weight: var(--fw-medium);
  line-height: var(--lh-snug);
}

.rv__blameless {
  margin-top: var(--sp-2);
  font-size: var(--fs-12);
  color: var(--c-text-3);
  line-height: var(--lh-snug);
  max-width: 44em;
}

.rv__attrs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-3);
  margin-top: var(--sp-3);
}

.rv__attr {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--sp-3);
  text-align: left;
  border: var(--bw-1) solid var(--c-border);
  border-radius: var(--r-md);
  transition: border-color var(--mo-fast) var(--mo-ease);
}

.rv__attr:hover {
  border-color: var(--c-border-strong);
}

.rv__attr--on {
  border-color: var(--c-primary);
  background: var(--c-primary-weak);
}

.rv__attrname {
  font-size: var(--fs-14);
  font-weight: var(--fw-medium);
}

.rv__attrnote {
  font-size: var(--fs-12);
  color: var(--c-text-3);
  line-height: 1.5;
}

.rv__concl {
  margin-top: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-md);
  background: var(--c-surface-2);
  font-size: var(--fs-14);
  line-height: var(--lh-normal);
  color: var(--c-text);
  max-width: 40em;
}

.rv__recalc {
  margin-top: var(--sp-2);
  font-size: var(--fs-12);
  color: var(--c-text-2);
  line-height: var(--lh-snug);
  max-width: 40em;
}

/* ---- "你做到了什么"：一条横排 ------------------------------------------- */

.rv__did {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3) var(--sp-6);
}

.rv__didrow {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.rv__didwhat {
  font-size: var(--fs-14);
}

/* ---- 话术对照 ------------------------------------------------------------ */

.rv__say {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
}

.rv__saycol {
  padding: 0 var(--sp-6);
  font-size: var(--fs-14);
  line-height: var(--lh-snug);
}

.rv__saycol:first-child {
  padding-left: 0;
}

.rv__saycol:last-child {
  padding-right: 0;
}

.rv__saycol--no {
  color: var(--c-text-3);
  border-right: var(--bw-1) solid var(--c-border);
}

.rv__saytag {
  display: block;
  margin-bottom: var(--sp-2);
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

/* ---- 干预参数 ------------------------------------------------------------ */

.rv__rules li {
  position: relative;
  padding: var(--sp-3) 0 var(--sp-3) var(--sp-4);
  font-size: var(--fs-12);
  color: var(--c-text-2);
}

.rv__rules li:first-child {
  padding-top: 0;
}

.rv__rules li:last-child {
  padding-bottom: 0;
}

.rv__rules li::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 16px;
  width: 4px;
  height: 4px;
  border-radius: var(--r-pill);
  background: var(--c-border-strong);
}

/* ---- 窄屏：右栏折到列表下面，归因与话术各自退回单列 ---------------------- */

@media (max-width: 1080px) {
  .rv {
    grid-template-columns: minmax(0, 1fr);
  }

  .rv__attrs {
    grid-template-columns: minmax(0, 1fr);
  }

  .rv__say {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--sp-5);
  }

  .rv__saycol {
    padding: 0;
  }

  .rv__saycol--no {
    border-right: none;
    border-bottom: var(--bw-1) solid var(--c-border);
    padding-bottom: var(--sp-5);
  }
}
</style>

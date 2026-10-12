<script setup lang="ts">
import { computed, ref } from 'vue'
import GuideNote from '../components/GuideNote.vue'
import { demo } from '../store'
import { GUIDES } from '../data/copy'
import { CALENDAR_MARKS } from '../data/student'

/**
 * 计划与行动。
 *
 * 注意：这个文件是**从构建产物重建**的（2026-10-11）。
 * 我在此之前用 Set-Content 往这个文件里改类名，而它正被 Vite 开发服务器占用：
 * Set-Content 会先截断再写，写入失败就留下了一个空文件。它未纳入 git，没有版本可回退，
 * 于是按 dist/assets/PlanView-*.js 与 PlanView-*.css 的分块逐字重建，
 * 并用 public/shots/plan.png 核对渲染结果。
 *
 * 【2026-10-12 · 第二版：月历当主视图】
 * 客户的反馈是「太空了，而且过于偏向上下滚动看信息」（依据 NN/g：首屏占 57% 注意力、
 * "网页普遍太稀"）。上一版是五行纵向堆叠 —— 统计条 → 里程碑 → 本周任务 → 两本账 →
 * 关键节点月历 → 做不动的时候，要看"这周做什么"和"这一年的进度"得滚两三屏。
 *
 * 这一版只改版面，不改信息（每一条信息都还在）：
 *   1. 顶部统计条保留；
 *   2. 月历升为主视图：左栏 520px 的月历 + 右栏"那天的事"。月历占满左栏宽度，
 *      6×7 格、格高 72px，一屏放得下；点某一天，右栏换成那天的节点；
 *   3. 里程碑与本周任务**并排**（各半栏）—— 红线：需要跨段对比的内容不用 tab 藏。
 *      （GOV.UK 口径：一份页面上要对着看的东西必须同时在屏上。）
 *   4. 两本账收成横向 tab（原先是三块纵向堆叠）；
 *   5. "做不动的时候"收进 <details>，它在页面最下方、不是每次都看。
 * 目标：首屏同时看到 月历 + 里程碑 + 本周任务。
 */

const scenario = computed(() => demo.use.scenario.value)
const now = computed(() => demo.use.now.value)
const waiting = computed(() => demo.use.waiting.value)
const done = computed(() => demo.use.done.value)

/** 本周要做的：现在做的 + 等回音的，两者对用户是同一张清单 */
const week = computed(() => [...now.value, ...waiting.value])

/**
 * 三本账：按"谁放进来的"拆开。
 * 这是这个产品的一条边界 —— 系统建议的、从计划拆下来的、用户自己写的，不能混成一堆。
 */
const books = computed(() => [
  {
    key: '计划拆下来的',
    items: [...now.value, ...waiting.value, ...done.value].filter((t) => t.origin === '计划拆下来的'),
  },
  {
    key: '建议的',
    items: [...now.value, ...waiting.value].filter((t) => t.origin === '建议的'),
  },
  {
    key: '自己写的',
    items: [...now.value, ...waiting.value, ...done.value].filter((t) => t.origin === '自己写的'),
  },
])

/**
 * 关键节点日历。月份写死为 2026 年 10 月 —— 演示环境的数据就是这个月，
 * 不是"当前月份"，所以不能拿 new Date() 去算，否则演示会在别的日子穿帮。
 */
const YEAR = 2026
const MONTH = 10
const TODAY = 8
/** 这个月有几天：方向键走到月底要停住，所以它是一条边界，不只用在生成格子上 */
const DAYS_IN_MONTH = new Date(YEAR, MONTH, 0).getDate()

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

/** 1 号是星期几（周一 = 0）。月历的前导空格与"某天是周几"用的是同一个偏移，
    所以只算一处 —— 之前这里是两处各算一遍，一处错了就会写出"10 月 15 日 · 周一"
    这种和月历对不上的星期。 */
const LEAD = (new Date(YEAR, MONTH - 1, 1).getDay() + 6) % 7

const cells = computed(() => {
  // 周一到周日：LEAD 个前导空格之后才是 1 号，格子与星期由同一个偏移推出
  const days = DAYS_IN_MONTH
  const out: { day: number | null; marks: typeof CALENDAR_MARKS }[] = []
  for (let i = 0; i < LEAD; i += 1) out.push({ day: null, marks: [] })
  for (let d = 1; d <= days; d += 1) out.push({ day: d, marks: CALENDAR_MARKS.filter((m) => m.day === d) })
  return out
})

/** 某一天是星期几：月历第一格是 1 号，往下数就是了 */
function weekday(day: number) {
  return WEEKDAYS[(LEAD + day - 1) % 7]
}

function markClass(kind: string) {
  return kind === 'deadline'
    ? 'cal__mark--accent'
    : kind === 'review'
      ? 'cal__mark--muted'
      : ''
}

/** 节点类型给中文：颜色是辅助，字才是主承担（"状态不靠颜色单独承担"） */
function kindLabel(kind: string) {
  return kind === 'deadline' ? '截止' : kind === 'review' ? '复盘' : '要做'
}

/* ---- 月历交互：点一天 → 右栏换成那天的事；默认选中今天 ---- */
const selected = ref(TODAY)
const detailMarks = computed(() => CALENDAR_MARKS.filter((m) => m.day === selected.value))
const detailDate = computed(() => `${MONTH} 月 ${selected.value} 日 · 周${weekday(selected.value)}`)
const marksAhead = computed(() => CALENDAR_MARKS.filter((m) => m.day > TODAY).length)

/* 本月节点一天一条列在右栏下边，一点就到 —— 不用在月历那 31 个格子里找 4 个点 */
const dayMarks = computed(() => CALENDAR_MARKS)

/**
 * 方向键走格子。月历是一张 7 列的网格，键盘应当能"走"它。
 * 空格（月初前导）只是占位，不可聚焦，所以落点一律要在 1..DAYS_IN_MONTH 之内。
 */
function moveDay(day: number, delta: number) {
  const next = day + delta
  if (next >= 1 && next <= DAYS_IN_MONTH) selected.value = next
}

/* ---- 两本账：横向 tab ---- */
const tabIndex = ref(0)
const activeBook = computed(() => books.value[tabIndex.value])
const tablist = ref<HTMLElement | null>(null)

function selectTab(i: number, focus = false) {
  const n = books.value.length
  tabIndex.value = (i + n) % n
  if (focus) {
    const el = tablist.value?.querySelector<HTMLElement>(`[data-tab="${tabIndex.value}"]`)
    el?.focus()
  }
}

/** ←→ 切换，Home / End 跳到首尾（WAI-ARIA tabs 的键盘口径） */
function onTabKey(e: KeyboardEvent, i: number) {
  const map: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: books.value.length - 1 }
  const next = map[e.key]
  if (next === undefined) return
  e.preventDefault()
  selectTab(next, true)
}
</script>

<template>
  <div class="page">
    <header class="page__head">
      <div class="hstack hstack-3 between wrap">
        <div>
          <h1 class="page__title">计划与行动</h1>
          <p class="page__sub">
            {{ scenario.grade }}这一年的里程碑、这个月的关键节点、这周要做的事，都在这一屏里。任务都拆到能勾掉的大小 —— 做不动可以点"改小"，那不是失败，是设计好的。
          </p>
        </div>
        <RouterLink class="btn btn--primary" to="/home">回到任务与计划</RouterLink>
      </div>
    </header>

    <div class="ledger">
      <!-- 紧凑统计条：这一页的几个数，摆在最上面 -->
      <section class="ledger__row">
        <p class="ledger__label">这一页</p>
        <div class="ledger__body">
          <div class="tally">
            <div class="tally__item">
              <span class="tally__n">{{ scenario.milestones.length }}</span><span class="tally__k">个里程碑</span>
            </div>
            <div class="tally__item">
              <span class="tally__n">{{ week.length }}</span><span class="tally__k">件本周要做</span>
            </div>
            <div class="tally__item">
              <span class="tally__n">{{ done.length }}</span><span class="tally__k">件已完成</span>
            </div>
            <div class="tally__item">
              <span class="tally__n">{{ CALENDAR_MARKS.length }}</span><span class="tally__k">个关键节点</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 主视图：左边一整月的月历，右边选中的那一天 -->
      <section class="plan-lead">
        <div class="pledger">
          <div class="cal">
            <p class="cal__year t-num">{{ YEAR }} 年 {{ MONTH }} 月</p>
            <div class="cal__grid">
              <span v-for="w in WEEKDAYS" :key="w" class="cal__wd">周{{ w }}</span>
              <template v-for="(c, i) in cells" :key="i">
                <span v-if="c.day === null" class="cal__pad" aria-hidden="true" />
                <button
                  v-else
                  type="button"
                  class="cal__cell"
                  :class="{ 'cal__cell--today': c.day === TODAY, 'cal__cell--on': c.day === selected }"
                  :aria-pressed="c.day === selected"
                  :aria-label="`${MONTH} 月 ${c.day} 日 周${weekday(c.day)}${c.marks.length ? '，' + c.marks.length + ' 个节点' : ''}`"
                  @click="selected = c.day"
                  @keydown.right.prevent="moveDay(c.day, 1)"
                  @keydown.left.prevent="moveDay(c.day, -1)"
                  @keydown.down.prevent="moveDay(c.day, 7)"
                  @keydown.up.prevent="moveDay(c.day, -7)"
                >
                  <span class="cal__day t-num">{{ c.day }}</span>
                  <span class="cal__dots" aria-hidden="true">
                    <span
                      v-for="mk in c.marks"
                      :key="mk.label"
                      class="cal__mark"
                      :class="markClass(mk.kind)"
                    />
                  </span>
                </button>
              </template>
            </div>
          </div>

          <aside class="lday">
            <div class="lday__head">
              <div>
                <p class="lday__date t-num">{{ detailDate }}</p>
                <p class="lday__sub">
                  <span v-if="selected === TODAY" class="chip chip--primary">今天</span>
                  <span v-else-if="detailMarks.length" class="chip chip--outline">
                    {{ detailMarks.length }} 个节点
                  </span>
                  <span v-else class="t-note">没有节点</span>
                </p>
              </div>
              <button v-if="selected !== TODAY" type="button" class="btn btn--sm" @click="selected = TODAY">
                回到今天
              </button>
            </div>

            <ul v-if="detailMarks.length" class="lday__list">
              <li v-for="mk in detailMarks" :key="mk.label" class="lday__item">
                <span class="lday__dot" :class="markClass(mk.kind)" aria-hidden="true" />
                <span class="lday__text">
                  <span class="t-strong">{{ mk.label }}</span>
                  <span class="t-note lday__kind">{{ kindLabel(mk.kind) }} · 由规划师写入</span>
                </span>
              </li>
            </ul>
            <p v-else class="lday__none">
              这天没有安排。<span class="t-dim">空着的日子也是计划的一部分 —— 不用把每一天都填满。</span>
            </p>

            <!-- 本月节点：一天一条，不折行。点一行就跳到那天，
                 也让右栏的高度自己长到与月历齐平（不留一截死白）。 -->
            <div class="lday__month">
              <p class="lday__monthhead">
                本月关键节点 · {{ CALENDAR_MARKS.length }}
                <span class="t-note">还有 {{ marksAhead }} 个在今天之后</span>
              </p>
              <ul>
                <li v-for="mk in dayMarks" :key="mk.label">
                  <button
                    type="button"
                    class="qbtn"
                    :class="{ 'qbtn--on': mk.day === selected }"
                    :aria-pressed="mk.day === selected"
                    @click="selected = mk.day"
                  >
                    <span class="qbtn__d t-num">{{ mk.day }} 日</span>
                    <span class="qbtn__l">{{ mk.label }}</span>
                    <span class="qbtn__k">{{ kindLabel(mk.kind) }}</span>
                  </button>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <!-- 里程碑与本周任务并排：一个看"这一年走到哪"，一个看"这周做什么" -->
      <section class="ledger__row">
        <p class="ledger__label">这一年 / 这周</p>
        <div class="ledger__body ledger__body--pair">
          <div class="mblock">
            <div class="mblock__head">
              <p class="ledger__title">阶段里程碑 · {{ scenario.milestones.length }}</p>
              <span class="t-note">由"帮你排计划的人"写入</span>
            </div>
            <div class="ms">
              <div v-for="m in scenario.milestones" :key="m.id" class="milestone">
                <div class="hstack hstack-3 between">
                  <div>
                    <p class="milestone__title">{{ m.title }}</p>
                    <p class="milestone__window">{{ m.window }}</p>
                  </div>
                  <span class="milestone__pct t-num">{{ Math.round(m.progress * 100) }}%</span>
                </div>
                <div class="meter" style="margin-top: var(--sp-3)">
                  <div class="meter__fill" :style="{ '--meter': m.progress }" />
                </div>
                <p class="milestone__note">{{ m.note }}</p>
              </div>
            </div>
          </div>

          <div class="wblock">
            <div class="mblock__head">
              <p class="ledger__title">本周要做的 · {{ week.length }}</p>
              <span class="t-note">什么 + 多久 + 为什么是现在</span>
            </div>
            <table class="table week">
              <thead>
                <tr>
                  <th>做什么</th>
                  <th class="t-num-nowrap">多久</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in week" :key="t.id">
                  <td>
                    <span class="t-strong">{{ t.title }}</span>
                    <span v-if="t.due" class="chip chip--attention" style="margin-left: 8px">
                      {{ t.due }}
                    </span>
                    <span class="why t-dim">{{ t.why }}</span>
                  </td>
                  <td class="t-num t-num-nowrap">{{ t.minutes ? `${t.minutes} 分钟` : '不用动' }}</td>
                  <td>
                    <button class="btn btn--sm" @click="demo.completeTask(t.id)">勾掉</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="done.length" class="t-note" style="margin-top: var(--sp-3)">
              已完成 {{ done.length }} 件 —— 完成记录只由行为日志驱动，勾了才算。
            </p>
          </div>
        </div>
      </section>

      <!-- 两本账：横向 tab，不再纵向堆三块 -->
      <section class="ledger__row">
        <p class="ledger__label">待办与计划 · {{ books.length }} 本</p>
        <div class="ledger__body">
          <p class="ledger__hint">谁放进来的，分得清 —— 切换账本看全部条目</p>
          <div ref="tablist" class="tabs" role="tablist" aria-label="按来源分的账本">
            <button
              v-for="(l, i) in books"
              :id="`book-tab-${i}`"
              :key="l.key"
              type="button"
              class="tab"
              role="tab"
              :data-tab="i"
              :aria-selected="tabIndex === i"
              :tabindex="tabIndex === i ? 0 : -1"
              :aria-controls="`book-panel-${i}`"
              @click="selectTab(i)"
              @keydown="onTabKey($event, i)"
            >
              {{ l.key }}
              <span class="tab__n t-num">{{ l.items.length }}</span>
            </button>
          </div>
          <div
            :id="`book-panel-${tabIndex}`"
            class="book"
            role="tabpanel"
            :aria-labelledby="`book-tab-${tabIndex}`"
            tabindex="0"
          >
            <ul class="book__list">
              <li v-for="it in activeBook.items" :key="it.id" class="book__item">
                <span class="book__name">{{ it.title }}</span>
                <span class="book__meta t-num">{{ it.bucket === 'done' ? '已完成' : it.bucket === 'now' ? '本周' : '等回音' }}</span>
              </li>
              <li v-if="!activeBook.items.length" class="book__item t-dim">这一本还是空的</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 做不动的时候：收进 <details>，它在页面最下方、不是每次都看 -->
      <section class="ledger__row">
        <p class="ledger__label">做不动的时候</p>
        <div class="ledger__body">
          <details class="fold">
            <summary class="fold__sum">三条出路都写在界面上，不用用户自己想</summary>
            <div class="fold__body">
              <ul class="outs">
                <li>当场把任务拆到 5 分钟</li>
                <li>承认问题在方法上，换一种做法</li>
                <li>承认方向要重估，交回给你判断方向的人</li>
              </ul>
              <p class="t-note" style="margin-top: var(--sp-3)">回退是设计好的，不是故障。</p>
            </div>
          </details>
        </div>
      </section>

      <GuideNote gkey="plan" :text="GUIDES.plan" to="/review" to-label="去复盘记录" />
    </div>
  </div>
</template>

<style scoped>
/* ===========================================================================
 * 页头与账页的起始节奏
 * ---------------------------------------------------------------------------
 * 全局的 `.page__head` 下距是 --sp-5、`.ledger` 又自带 --sp-6 上距，
 * 两段叠起来在这一页的顶部空出 44px。这一页的首屏要装下月历 + 里程碑 + 本周任务，
 * 所以在这里把它收到 --sp-2 + --sp-4（省 12px），页标题与副标题的层级不受影响。
 * ======================================================================== */
.page__head {
  padding-bottom: var(--sp-2);
}

.ledger {
  margin-top: var(--sp-4);
}

/* ===========================================================================
 * 主视图 · 月历 + 那天的事
 * ---------------------------------------------------------------------------
 * 月历升为主视图的理由是密度：一个月 30 天里有 4 个节点，横向摊开后
 * "这个月还剩几个、都在什么时候"一眼看得出，比一列数字往下排省两屏滚动。
 * 左栏 520px 让它有确定宽度（不随窗口忽宽忽窄），右栏吃掉其余。
 * ======================================================================== */
.plan-lead {
  padding: var(--sp-4) 0;
  border-top: var(--bw-1) solid var(--c-border);
}

.pledger {
  display: grid;
  grid-template-columns: 520px minmax(0, 1fr);
  gap: var(--sp-6);
  align-items: start;
}

/* ---- 月历 ---- */
.cal__year {
  margin-bottom: var(--sp-3);
  font-size: var(--fs-14);
  font-weight: var(--fw-semibold);
  color: var(--c-text-2);
}

.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  /* 6 行固定 72px：月历的格子必须一样高，空格也要占位 ——
     用 aspect-ratio 会让"有节点的格子"被内容撑高，整块月历跟着起伏。
     72px 是这一档的下限：再矮日期与两个圆点就贴到一起了。 */
  grid-auto-rows: 72px;
  gap: 4px;
}

.cal__wd {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: var(--sp-2);
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

.cal__pad {
  visibility: hidden;
}

.cal__cell {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: var(--sp-2);
  border-radius: var(--r-sm);
  border: var(--bw-1) solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text-2);
  text-align: left;
  transition:
    background-color var(--dur-1) ease,
    border-color var(--dur-1) ease,
    color var(--dur-1) ease;
}

.cal__cell:hover {
  background: var(--c-surface-2);
  border-color: var(--c-border-strong);
  color: var(--c-text);
}

.cal__day {
  font-size: var(--fs-14);
  line-height: 1.2;
}

/* 有节点的日子：日期加粗，眼睛先落在有事的格子上 */
.cal__cell:has(.cal__mark) .cal__day {
  color: var(--c-text);
  font-weight: var(--fw-semibold);
}

/* 今天：描边（不填充）—— 填充留给"选中的那天"，两种状态才分得开 */
.cal__cell--today {
  border-color: var(--c-primary);
  border-width: var(--bw-2);
}

/* 选中：内描边而不是外阴影，格子之间 4px 的间隙才不会被吃掉 */
.cal__cell--on {
  background: var(--c-primary-weak);
  box-shadow: inset 0 0 0 var(--bw-2) var(--c-primary);
  color: var(--c-text);
}

.cal__dots {
  position: absolute;
  left: var(--sp-2);
  bottom: var(--sp-2);
  display: flex;
  gap: 3px;
}

.cal__mark {
  width: 6px;
  height: 6px;
  border-radius: var(--r-pill);
  background: var(--c-primary);
}

.cal__mark--accent {
  background: var(--c-attention);
}

.cal__mark--muted {
  background: var(--c-done);
}

/* ---- 那天的事 ---- */
.lday {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-surface-2);
}

.lday__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
}

.lday__date {
  font-size: var(--fs-20);
  font-weight: var(--fw-semibold);
  letter-spacing: -0.012em;
  line-height: var(--lh-tight);
}

.lday__sub {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-top: var(--sp-2);
}

.lday__list {
  border-top: var(--bw-1) solid var(--c-border);
}

.lday__item {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  padding: var(--sp-3) 0;
  border-bottom: var(--bw-1) solid var(--c-border);
}

.lday__item:last-child {
  border-bottom: none;
}

.lday__dot {
  flex: none;
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: var(--r-pill);
  background: var(--c-primary);
}

.lday__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: var(--fs-14);
}

.lday__kind {
  white-space: nowrap;
}

.lday__none {
  font-size: var(--fs-14);
  color: var(--c-text-2);
  line-height: var(--lh-normal);
  max-width: 32em;
}

/* 本月节点：列在"那天的事"下面，一天一条。
   它同时承担一件版面的事：右栏在没有节点的日子里不会只剩半屏死白
   （客户的原话是"太空了"），栏高自己长到与月历齐平。 */
.lday__month {
  margin-top: auto;
  padding-top: var(--sp-3);
  border-top: var(--bw-1) solid var(--c-border);
}

.lday__monthhead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-3);
  padding-bottom: var(--sp-2);
  font-size: var(--fs-14);
  font-weight: var(--fw-medium);
  color: var(--c-text-2);
}

.lday__month li {
  padding: var(--sp-1) 0;
}

.qbtn {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-sm);
  border: var(--bw-1) solid transparent;
  background: var(--c-surface);
  color: var(--c-text-2);
  font-size: var(--fs-14);
  text-align: left;
  transition:
    border-color var(--dur-1) ease,
    background-color var(--dur-1) ease,
    color var(--dur-1) ease;
}

.qbtn:hover {
  border-color: var(--c-border-strong);
  color: var(--c-text);
}

.qbtn--on {
  border-color: var(--c-primary);
  background: var(--c-primary-weak);
  color: var(--c-primary);
}

/* 日期与类型不参与伸缩：伸缩只发生在中间那条节点名上（折行该发生在长句上） */
.qbtn__d {
  flex: none;
  font-weight: var(--fw-semibold);
  color: var(--c-text);
}

.qbtn__l {
  flex: 1;
  min-width: 0;
}

.qbtn__k {
  flex: none;
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

.qbtn--on .qbtn__d,
.qbtn--on .qbtn__k {
  color: var(--c-primary);
}

/* ===========================================================================
 * 里程碑 ｜ 本周任务（并排）
 * ---------------------------------------------------------------------------
 * 红线：这两块**必须对着看** —— 左边是"这一年走到哪"，右边是"这周做什么"，
 * 读者要拿这一周的动作去对那一年的进度。GOV.UK 的判据是
 * "需要跨段对比的内容不要用 tab 藏起来"，所以它们是并排的两个半栏，不是两个标签页。
 * ======================================================================== */
.mblock__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-3);
  padding-bottom: var(--sp-3);
  border-bottom: var(--bw-1) solid var(--c-border);
}

.ms > .milestone {
  padding: var(--sp-2) 0;
  border-bottom: var(--bw-1) solid var(--c-border);
}

.ms > .milestone:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.milestone__title {
  font-size: var(--fs-14);
  font-weight: var(--fw-semibold);
}

.milestone__window {
  margin-top: 2px;
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

.milestone__pct {
  font-size: var(--fs-20);
  font-weight: var(--fw-semibold);
  color: var(--c-primary);
}

.milestone__note {
  margin-top: var(--sp-2);
  font-size: var(--fs-14);
  color: var(--c-text-3);
  line-height: var(--lh-snug);
}

/* 本周任务：半栏里的表要收一收 —— 表头与状态列不参与伸缩，标题吃掉余量 */
.week {
  table-layout: fixed;
}

.week th:first-child,
.week td:first-child {
  width: auto;
}

.week th:nth-child(2),
.week td:nth-child(2) {
  width: 84px;
}

.week th:nth-child(3),
.week td:nth-child(3) {
  width: 68px;
}

/* 并排之后每张表都只有 5 行，是"看一眼"的东西：行高收到 34px，
   一屏能同时看清里程碑的进度和这周要做的事（密度只动行高，不动字号）。 */
.week td {
  padding-top: 7px;
  padding-bottom: 7px;
}

.week .btn {
  height: 24px;
}

/* 「多久」这一列的值很短（"15 分钟"／"不用动"），被折成"15 分／钟"只是难读。
   短值一律不折行 —— 折行该发生在长句上，不该发生在度量上。 */
.week .t-num {
  white-space: nowrap;
}

/* 「为什么是现在」从独立一列收进"做什么"那一格的第二行：
   半栏里的表只有 3 栏，横排会把每个词都挤断；而这一句本来就属于那件事。 */
.why {
  display: block;
  margin-top: 4px;
  font-size: var(--fs-12);
  line-height: var(--lh-snug);
}

/* ===========================================================================
 * 两本账 · 横向 tab
 * ======================================================================== */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  border-bottom: var(--bw-1) solid var(--c-border);
  padding-bottom: var(--sp-1);
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  height: var(--btn-h-md);
  padding: 0 var(--sp-4);
  border-radius: var(--r-md) var(--r-md) 0 0;
  font-size: var(--fs-14);
  font-weight: var(--fw-medium);
  color: var(--c-text-2);
  border-bottom: var(--bw-2) solid transparent;
  transition: color var(--dur-1) ease;
}

.tab:hover {
  color: var(--c-text);
}

.tab[aria-selected='true'] {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
}

.tab__n {
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

.tab[aria-selected='true'] .tab__n {
  color: var(--c-primary);
}

.book {
  margin-top: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-surface-2);
}

.book__item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-3) 0;
  border-bottom: var(--bw-1) dashed var(--c-border);
  font-size: var(--fs-14);
  color: var(--c-text-2);
}

.book__item:last-child {
  border-bottom: none;
}

.book__name {
  min-width: 0;
}

.book__meta {
  flex: none;
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

/* ===========================================================================
 * 做不动的时候
 * ======================================================================== */
.outs {
  margin-top: var(--sp-3);
}

.outs li {
  position: relative;
  padding: var(--sp-2) 0 var(--sp-2) var(--sp-4);
  font-size: var(--fs-14);
  color: var(--c-text-2);
  border-bottom: var(--bw-1) solid var(--c-border);
}

.outs li:last-child {
  border-bottom: none;
}

.outs li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--c-primary);
}

/* 窄屏：月历与"那天的事"折成上下，里程碑与本周任务也折成一列。
   断点取 1180 而不是 1080：132px 的标签格 + 520px 的月历 + 右栏，
   再窄下去右栏只剩不到 300px，"那天的事"会一个字一行。 */
@media (max-width: 1180px) {
  .pledger {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 1080px) {
  .cal__grid {
    grid-auto-rows: 56px;
  }

  .week {
    table-layout: auto;
  }
}
</style>

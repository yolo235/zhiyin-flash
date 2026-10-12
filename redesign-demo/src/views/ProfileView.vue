<script setup lang="ts">
import { computed, nextTick, ref, watchEffect } from 'vue'
import { demo } from '../store'
import { GUIDES, partialCopy } from '../data/copy'
import { COLLECT_ITEMS, PROFILE_FIELDS } from '../data/student'
import GuideNote from '../components/GuideNote.vue'
import ConfidenceBadge from '../components/ConfidenceBadge.vue'
import type { ProfileField } from '../data/types'

/**
 * 学生档案 —— **主从工作台**（2026-10-12 第二次重做）。
 *
 * 客户对上一版的意见只有两句：「还是太空了」「过于偏向上下滚动看信息了」。
 * 依据（NN/g）：首屏 57% / 前两屏 74% 的注意力，第三屏之后基本没人看；
 * 而且"现在的网页普遍太稀，屏面不该攒着不用"（Utilize Available Screen Space）。
 * 所以这一版的目标不是"更好看"，是**同样的信息占更少的屏、用满横向**。
 *
 * 上一版是 `<article>` 里一串纵向 `.sec`（统计条 → 属性条 → 证据流两节 → 还差 N 条
 * → 采集动线 → 核验学籍），一条一行地垒了整整三屏多。这一版换版面语法：
 *
 *   ① 顶部一条带：**左 = 环形进度 + 三个计数，右 = 学校系统的事实**（并排，不上下叠）
 *   ② 主体：**主从两栏** —— 左 344px 是三层来源的条目索引（一行一条、整行可点），
 *      右 1fr 是选中那一条的详情（来源 / 什么时候记的 / 把握度 / 那句"记错了直接说"）
 *   ③ 缺口与采集动线**并排成两栏**，落在主从的右栏里 —— 于是整页从三屏多收到约一屏
 *   ④ 核验学籍留在最下面
 *
 * 三条不能动的东西（客户口径）：
 *   · **来源 + 把握度**是这个产品的信任口径，一个都不许丢 —— 详情栏里逐条给全；
 *   · 数据与文案一字不改：缺口 = 画像池长度 − 已经了解，仍由 store 的 profileProgress 独家给出；
 *   · 属性条这一层"学校系统里的事实"照旧单独铺开（它不是证据流，别混进左列表之外就丢了）。
 *
 * 键盘接口（ARIA APG 要求）：左列表是**一个** roving 焦点 —— 整张表只有当前项
 * `tabindex="0"`，其余 `-1`；↑↓ 跨组连续移动，Home / End 到首尾；
 * Enter / Space **不在这里拦** —— `<button>` 自己就会把这两个键变成 click，
 * 再拦一次会把同一次按键做成两次选择。
 */

const progress = computed(() => demo.use.profileProgress.value)
const scenario = computed(() => demo.use.scenario.value)

/**
 * 年级这一条跟着切换器走。
 * 不跟的话，切到大一，"年级"那一栏还写着大三 —— 一条自相矛盾的画像，
 * 正好毁掉这一页要证明的东西（每条都经得起盘问）。
 */
function fieldValue(f: ProfileField) {
  return f.key === 'grade' ? `${scenario.value.grade}（在读）` : f.value
}

/** 三层来源。顺序就是左列表里三组的顺序（你自己说的 → 学校系统 → 行为记录）。 */
const layers = [
  { key: 'talk', title: '你自己说的', note: '从对话里来 —— 你说了什么，就记什么', sources: ['对话'] },
  {
    key: 'school',
    title: '学校系统里的客观档案',
    note: '学信网与教务系统里有的事实 —— 不是我们猜的',
    sources: ['学信网', '教务系统', '学校'],
  },
  {
    key: 'behavior',
    title: '你的行为记录',
    note: '你实际做了什么。完成记录只由这一层驱动',
    sources: ['行为记录'],
  },
]

const known = computed(() => PROFILE_FIELDS.slice(0, progress.value.known))
const missing = computed(() => PROFILE_FIELDS.slice(progress.value.known))

function inLayer(f: ProfileField, sources: string[]) {
  return sources.includes(f.source)
}

const fetchable = computed(() => COLLECT_ITEMS.filter((c) => c.fetchable))
const blocked = computed(() => COLLECT_ITEMS.filter((c) => !c.fetchable))

/**
 * 属性条＝学校系统里的事实（客观、稳定、不需要用户再填）。
 * 它同时也在左列表的「学校系统」一组里 —— 那里是**索引**（一条一行、可点），
 * 这里是**横向铺开的属性条**，两处是同一批数据的两种读法，不是两套数据。
 */
const schoolLayer = layers.find((l) => l.key === 'school')!
const schoolFacts = computed(() => known.value.filter((f) => inLayer(f, schoolLayer.sources)))

/**
 * 左列表的**扁平**条目表：三组共用一个 roving 焦点，所以必须先摊平
 * （↑↓ 要能一路跨过组边界走下去，而"整张表只有一处 tabindex=0"也只允许一张表）。
 * 顺序 = 三层来源的顺序，默认选中的就是第一条。
 */
const rows = computed(() =>
  layers.flatMap((layer) =>
    known.value.filter((f) => inLayer(f, layer.sources)).map((field) => ({ field, layer })),
  ),
)

function fieldsOf(layerKey: string) {
  return rows.value.filter((r) => r.layer.key === layerKey).map((r) => r.field)
}

const activeKey = ref<string | null>(rows.value[0]?.field.key ?? null)
const activeRow = computed(() => rows.value.find((r) => r.field.key === activeKey.value) ?? null)

/** 切年级会换掉整批条目 —— 选中的那条如果没了，回到第一条，绝不留一个空右栏。 */
watchEffect(() => {
  if (!rows.value.some((r) => r.field.key === activeKey.value)) {
    activeKey.value = rows.value[0]?.field.key ?? null
  }
})

const masterEl = ref<HTMLElement | null>(null)

function select(key: string) {
  activeKey.value = key
}

/** 移动选中 = 把焦点也带过去（roving tabindex 里"当前项"就是那一处 tabindex=0）。 */
function focusIndex(index: number) {
  const list = rows.value
  if (!list.length) return
  const i = Math.min(list.length - 1, Math.max(0, index))
  const key = list[i].field.key
  activeKey.value = key
  void nextTick(() => {
    masterEl.value?.querySelector<HTMLButtonElement>(`[data-wb-key="${key}"]`)?.focus()
  })
}

function onItemKeydown(e: KeyboardEvent) {
  const list = rows.value
  const i = list.findIndex((r) => r.field.key === activeKey.value)
  if (e.key === 'ArrowDown') focusIndex(i + 1)
  else if (e.key === 'ArrowUp') focusIndex(i - 1)
  else if (e.key === 'Home') focusIndex(0)
  else if (e.key === 'End') focusIndex(list.length - 1)
  else return
  e.preventDefault()
}

/**
 * 环形进度：`12/15`。半径与周长都在这里算，模板只负责画 ——
 * 弧长用 stroke-dashoffset，不动宽度、不做动画（这一处不需要动效）。
 */
const ring = computed(() => {
  const r = 20
  const circumference = 2 * Math.PI * r
  const filled = progress.value.total ? progress.value.known / progress.value.total : 0
  return { dash: circumference.toFixed(2), offset: (circumference * (1 - filled)).toFixed(2) }
})
</script>

<template>
  <div class="page article wb-page">
    <header class="page__head">
      <h1 class="page__title">学生档案</h1>
      <p class="page__sub">
        {{ partialCopy(progress.known, progress.gap) }}。每一条都标了来源与把握程度 —— 点开看依据。
      </p>
    </header>

    <article class="wb">
      <!-- ① 顶部一条带：左 = 进度环 + 三个计数，右 = 学校系统里的事实。
           两块并排而不是上下叠 —— 客户要的是"用满横向、少滚动"。
           环取代了原来那条按条数分段的进度显示，数字仍然是 store 给的同一个值。 -->
      <div class="wb__top">
        <section class="wb__stats">
          <div class="wb__progress">
            <span
              class="ring"
              role="img"
              :aria-label="`已经了解 ${progress.known} 条，共 ${progress.total} 条`"
            >
              <svg class="ring__svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                <circle class="ring__track" cx="24" cy="24" r="20" />
                <circle
                  class="ring__fill"
                  cx="24"
                  cy="24"
                  r="20"
                  :stroke-dasharray="ring.dash"
                  :stroke-dashoffset="ring.offset"
                />
              </svg>
              <span class="ring__text t-num">{{ progress.known }}/{{ progress.total }}</span>
            </span>
            <span class="wb__progress-k">已经了解</span>
          </div>

          <div class="tally">
            <div class="tally__item">
              <span class="tally__n">{{ missing.length }}</span><span class="tally__k">还差几条</span>
            </div>
            <div class="tally__item">
              <span class="tally__n">{{ fetchable.length }}</span><span class="tally__k">现在就能取</span>
            </div>
            <div class="tally__item">
              <span class="tally__n">{{ blocked.length }}</span><span class="tally__k">取不到的</span>
            </div>
          </div>
        </section>

        <!-- 属性条：学校系统里的客观事实。是 <dl>，不是两列表格；横向铺成三列，不再竖着垒。 -->
        <section v-if="schoolFacts.length" class="wb__facts">
          <h2 class="wb__h">这几条是学校系统里的事实，不用你重复填</h2>
          <p class="wb__note">来自学信网与教务系统 —— 不是我们猜的，也不是你填的。</p>
          <dl class="facts">
            <div v-for="f in schoolFacts" :key="f.key" class="facts__row">
              <dt class="facts__key">{{ f.label }}</dt>
              <dd class="facts__val">
                {{ fieldValue(f) }}<span class="t-note"> · {{ f.source }}</span>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <!-- ② 主从：左边是三层来源的条目索引，右边是选中那一条的详情 + 缺口与采集动线。
           左栏 344px，整行可点；右栏 1fr，永远有内容（默认选中第一条）。 -->
      <div class="wb__split">
        <div class="wb__master">
          <p class="sr-only" id="wb-kbd">
            条目列表：用上下方向键换一条，Home 到第一条、End 到最后一条。
          </p>
          <div
            ref="masterEl"
            role="group"
            aria-label="对你的了解，按三层来源分组"
            aria-describedby="wb-kbd"
            @keydown="onItemKeydown"
          >
            <div v-for="l in layers" :key="l.key" class="wb__group">
              <h3 class="wb__group-t" :id="`wb-grp-${l.key}`">{{ l.title }}</h3>
              <p class="wb__group-n">{{ l.note }}</p>
              <ul class="wb__list" :aria-labelledby="`wb-grp-${l.key}`">
                <li v-for="f in fieldsOf(l.key)" :key="f.key">
                  <button
                    type="button"
                    class="wb__item"
                    :class="{ 'wb__item--on': f.key === activeKey }"
                    :data-wb-key="f.key"
                    :aria-current="f.key === activeKey ? 'true' : undefined"
                    :tabindex="f.key === activeKey ? 0 : -1"
                    @click="select(f.key)"
                  >
                    <span class="wb__item-lab">{{ f.label }}</span>
                    <span class="wb__item-val">{{ fieldValue(f) }}</span>
                  </button>
                </li>
                <li v-if="!fieldsOf(l.key).length" class="wb__group-empty">这一层还没有记录。</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="wb__side">
          <!-- 详情：来源、什么时候记的、把握度，以及那句"记错了直接说一句就能改"。
               信任口径在这里必须逐条给全，一个字都不减。 -->
          <div class="wb__detail">
            <template v-if="activeRow">
              <p class="wb__d-src">{{ activeRow.layer.title }}</p>
              <h3 class="wb__d-label">{{ activeRow.field.label }}</h3>
              <p class="wb__d-value">{{ fieldValue(activeRow.field) }}</p>

              <dl class="wb__d-dl">
                <div class="wb__d-row">
                  <dt>从哪来</dt>
                  <dd>{{ activeRow.field.source }}</dd>
                </div>
                <div class="wb__d-row">
                  <dt>什么时候记的</dt>
                  <dd>{{ activeRow.field.noted }}</dd>
                </div>
                <div class="wb__d-row">
                  <dt>有多大把握</dt>
                  <dd>
                    <ConfidenceBadge :value="activeRow.field.confidence" />
                    <span class="t-note">
                      （{{ activeRow.field.confidence.bars }}/3 —— 把握不到就直说，不写成结论）
                    </span>
                  </dd>
                </div>
              </dl>

              <p class="wb__d-foot">
                这条要是记错了，直接说一句就能改 —— 改了会影响报告和计划里跟着它的那几处。
              </p>
            </template>
            <p v-else class="wb__d-empty">这一层还没有记录。</p>
          </div>

          <!-- ③ 缺口与采集动线并排两栏：短信息不再各占一整行（"太纵向"的主要来源）。 -->
          <div class="wb__cols2" :class="{ 'wb__cols2--single': !missing.length }">
            <section v-if="missing.length" class="wb__sec">
              <h2 class="wb__h">还差 {{ missing.length }} 条，补完方向就定得下来</h2>
              <p class="wb__note">缺口和已知在同一张清单上 —— 不藏起来，也不写成结论。</p>
              <ul class="wb__miss">
                <li v-for="f in missing" :key="f.key" class="wb__miss-row">
                  <div class="wb__miss-main">
                    <p class="wb__miss-t">{{ f.label }}</p>
                    <p class="wb__miss-s">从「{{ f.source }}」就能补上</p>
                  </div>
                  <RouterLink class="btn btn--sm" to="/chat">现在就问</RouterLink>
                </li>
              </ul>
            </section>

            <section class="wb__sec">
              <h2 class="wb__h">还有 {{ fetchable.length }} 条现在就能取</h2>
              <p class="wb__note">取不到的也会直接说 —— 不装作没有。</p>
              <ul class="wb__fetch">
                <li v-for="c in fetchable" :key="c.label" class="wb__fetch-row">
                  <p class="wb__fetch-t">{{ c.label }}</p>
                  <p class="wb__fetch-s">{{ c.from }}</p>
                  <span class="chip chip--done">能取</span>
                </li>
              </ul>

              <div v-if="blocked.length" class="blocked">
                <p class="t-label">取不到的，会直接说</p>
                <div v-for="c in blocked" :key="c.label" class="blocked__item">
                  <p class="blocked__title">{{ c.label }}</p>
                  <p class="blocked__why">{{ c.blockedBy }}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <!-- ④ 核验学籍：三步横排，不再竖着占三条。 -->
      <section class="wb__verify">
        <h2 class="wb__h">核验学籍，是为了少问你几次</h2>
        <p class="wb__note">全程不要账号密码 —— 只要一个在线验证码。</p>
        <ol class="verify">
          <li class="verify__step">
            <span class="steps__index">1</span>
            <span>去学信网拿一个<strong>在线验证码</strong></span>
          </li>
          <li class="verify__step">
            <span class="steps__index">2</span>
            <span>把验证码填进来 —— <strong>全程不要账号密码</strong></span>
          </li>
          <li class="verify__step">
            <span class="steps__index">3</span>
            <span>核验完，看"跟着改的地方"有哪几处</span>
          </li>
        </ol>
        <div class="callout callout--plain wb__callout">
          <span>
            课表不在学信网 —— 空档是从教务系统的课表<strong>算出来的事实</strong>，
            模型只能改措辞，不能改时间。
          </span>
        </div>
      </section>
    </article>

    <GuideNote gkey="profile" :text="GUIDES.profile" to="/chat" to-label="去聊两句" />
  </div>
</template>

<style scoped>
/**
 * 版面口径（这一版新增的全部样式都在这里，一个类名都没有和全局样式表撞车）：
 *
 *   · `.wb-page` 只是把这一页的版心从全局的 1200px 放到 1600px ——
 *     客户的原话是"太空了"，而 1600 屏上 1200px 的版心两边各空 200px。
 *     它是一个**新类名**，不是去重定义全局的 `.page`（那正是 check-classes 拦的事）。
 *   · 垂直节奏只有两档：带与带之间 --sp-5，带内条目 --sp-2 / --sp-3。
 *     上下各 32px 的"松档"在这一页不再出现 —— 它一屏只装得下两三条信息。
 */

.wb-page {
  /* 版心由全局 --w-content（2026-10-12 起 1520px）统一给：
     单页放宽会让五页宽窄不一，正是"每页自己发明一次排法"。 */
  max-width: none;
}

/* 带与带之间：一条发丝线 + 20px，换了一件事才画线（GOV.UK 口径：分隔线是 opt-in）。 */
.wb > * + * {
  margin-top: var(--sp-5);
  padding-top: var(--sp-5);
  border-top: var(--bw-1) solid var(--c-border);
}

/* ===========================================================================
 * ① 顶部一条带：进度与计数 | 学校系统的事实
 * ======================================================================== */

/* 列宽与列间距**和下面的主从两栏一模一样**（344px + 24px）——
   这样顶部这条带的右块与详情卡、缺口、采集动线共用同一条左脊柱，
   一页只有一个左起点，不会出现 436 与 392 两条线并排站着。 */
.wb__top {
  display: grid;
  grid-template-columns: 344px minmax(0, 1fr);
  gap: var(--sp-5) var(--sp-6);
  align-items: start;
}

.wb__stats {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  min-width: 0;
}

.wb__progress {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.wb__progress-k {
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

/* 环形进度：底环 --c-border、进度弧 --c-primary；无动画（这里不需要动效）。
   "12/15" 压在环心里 —— 环本身对读屏是一个 role="img" 的整块，数字念一次就够。 */
.ring {
  position: relative;
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  flex: none;
}

.ring__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring__track,
.ring__fill {
  fill: none;
  stroke-width: 4;
}

.ring__track {
  stroke: var(--c-border);
}

.ring__fill {
  stroke: var(--c-primary);
  stroke-linecap: round;
}

.ring__text {
  font-size: var(--fs-14);
  font-weight: var(--fw-semibold);
  color: var(--c-text);
}

/* 属性条：横向三列。竖着垒六条要占满一屏，横过来只占两行。 */
.facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-4) var(--sp-5);
  margin-top: var(--sp-4);
}

.facts__row {
  min-width: 0;
}

.facts__key {
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

.facts__val {
  margin-top: 2px;
  font-size: var(--fs-14);
  line-height: var(--lh-snug);
}

/* ===========================================================================
 * ② 主从两栏：左 344px 索引，右 1fr 详情（详情下面挂着缺口与采集动线）
 * ======================================================================== */

.wb__split {
  display: grid;
  grid-template-columns: 344px minmax(0, 1fr);
  gap: var(--sp-5) var(--sp-6);
  align-items: start;
}

.wb__master,
.wb__side {
  min-width: 0;
}

.wb__side {
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
}

.wb__group + .wb__group {
  margin-top: var(--sp-4);
}

.wb__group-t {
  font-size: var(--fs-14);
  font-weight: var(--fw-semibold);
}

.wb__group-n {
  margin-top: 2px;
  font-size: var(--fs-12);
  color: var(--c-text-3);
  line-height: var(--lh-snug);
}

/* 一条一行：标签窄、值宽。行高走 --row-h（极简 40 / 柔和 48 / 紧凑 32），
   密度由皮肤调，字号一档不动。 */
.wb__item {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: baseline;
  gap: var(--sp-3);
  width: 100%;
  min-height: var(--row-h);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-sm);
  text-align: left;
  transition:
    background-color var(--dur-1) ease,
    color var(--dur-1) ease;
}

/* 悬停只在真有指针时发生 —— 触屏点一下会先触发一次假 hover */
@media (hover: hover) and (pointer: fine) {
  .wb__item:hover {
    background: var(--c-surface-2);
  }
}

/* 选中：主色浅底 + 标签转主色。不用竖条、不用加粗边框 ——
   选中是"状态"，不是"给这一条加装饰"。 */
.wb__item--on {
  background: var(--c-primary-weak);
}

.wb__item--on .wb__item-lab {
  color: var(--c-primary);
}

.wb__item-lab {
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

.wb__item-val {
  font-size: var(--fs-14);
  color: var(--c-text);
  line-height: var(--lh-snug);
  min-width: 0;
}

.wb__group-empty {
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

/* ---- 详情 ---- */
.wb__detail {
  padding: var(--sp-5);
  background: var(--c-surface);
  border: var(--bw-1) solid var(--c-border);
  border-radius: var(--r-lg);
}

.wb__d-src {
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

.wb__d-label {
  margin-top: var(--sp-1);
  font-size: var(--fs-20);
  font-weight: var(--fw-semibold);
  line-height: var(--lh-snug);
}

.wb__d-value {
  margin-top: var(--sp-2);
  max-width: 44em;
  font-size: var(--fs-14);
  color: var(--c-text);
  line-height: var(--lh-normal);
}

/* 来源 / 时间 / 把握度：横着三格。右栏有 1100px 宽，竖着排这三条就是白占高度。 */
.wb__d-dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-4) var(--sp-5);
  margin-top: var(--sp-5);
  padding-top: var(--sp-4);
  border-top: var(--bw-1) solid var(--c-border);
}

.wb__d-row {
  min-width: 0;
}

.wb__d-row dt {
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

.wb__d-row dd {
  margin: 2px 0 0;
  font-size: var(--fs-14);
  color: var(--c-text);
  line-height: var(--lh-snug);
}

.wb__d-foot {
  margin-top: var(--sp-4);
  max-width: 46em;
  font-size: var(--fs-12);
  color: var(--c-text-3);
  line-height: var(--lh-normal);
}

.wb__d-empty {
  font-size: var(--fs-14);
  color: var(--c-text-3);
}

/* ===========================================================================
 * ③ 缺口 | 采集动线 —— 并排两栏
 * ======================================================================== */

.wb__cols2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-5) var(--sp-6);
  align-items: start;
}

.wb__cols2--single {
  grid-template-columns: minmax(0, 1fr);
}

.wb__sec {
  min-width: 0;
}

.wb__h {
  font-size: var(--fs-20);
  font-weight: var(--fw-semibold);
  letter-spacing: -0.012em;
  line-height: var(--lh-snug);
  max-width: 28em;
}

.wb__note {
  margin-top: var(--sp-2);
  font-size: var(--fs-12);
  color: var(--c-text-3);
  max-width: 34em;
}

.wb__miss {
  margin-top: var(--sp-4);
}

.wb__miss-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: var(--row-h);
  padding: var(--sp-2) 0;
}

.wb__miss-main {
  flex: 1;
  min-width: 0;
}

.wb__miss-t {
  font-size: var(--fs-14);
  font-weight: var(--fw-medium);
}

.wb__miss-s {
  margin-top: 2px;
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

/* 八条能取的排成两列 —— 一列八行是"太纵向"的那一半。 */
.wb__fetch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--sp-5);
  margin-top: var(--sp-4);
}

.wb__fetch-row {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  min-height: var(--row-h);
  padding: var(--sp-1) 0;
}

.wb__fetch-t {
  font-size: var(--fs-14);
  font-weight: var(--fw-medium);
  min-width: 0;
}

.wb__fetch-s {
  flex: 1;
  font-size: var(--fs-12);
  color: var(--c-text-3);
  white-space: nowrap;
}

.blocked {
  margin-top: var(--sp-5);
}

/* 取不到的：用浅底，不用彩色竖条（竖条是"用装饰表达层级"） */
.blocked__item {
  margin-top: var(--sp-2);
  padding: var(--sp-3);
  border-radius: var(--r-md);
  background: var(--c-attention-weak);
}

.blocked__title {
  font-size: var(--fs-14);
  font-weight: var(--fw-medium);
}

.blocked__why {
  margin-top: 2px;
  font-size: var(--fs-12);
  color: var(--c-text-2);
  line-height: var(--lh-snug);
}

/* ===========================================================================
 * ④ 核验学籍：三步横排
 * ======================================================================== */

.verify {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-5);
  margin-top: var(--sp-4);
}

.verify__step {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  font-size: var(--fs-14);
  color: var(--c-text-2);
  line-height: var(--lh-snug);
}

.wb__callout {
  margin-top: var(--sp-4);
}

/* ===========================================================================
 * 窄屏回退（断点与 base.css 的 .rail / .ledger__row 一致）
 * ---------------------------------------------------------------------------
 * 344px 的索引栏在窄屏里会把详情挤到读不了 —— 折成一列比挤着强。
 * 那一列并排的分块同理：两栏挤在一起比一列更难看。
 * ======================================================================== */

@media (max-width: 1080px) {
  .wb__top,
  .wb__split {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--sp-5);
  }

  .facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .wb__cols2,
  .wb__d-dl,
  .facts,
  .wb__fetch,
  .verify {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

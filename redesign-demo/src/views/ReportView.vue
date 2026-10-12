<script setup lang="ts">
import { computed, ref } from 'vue'
import { demo } from '../store'
import { FALLBACK_COPY, GUIDES } from '../data/copy'
import {
  DIRECTION_PLANS,
  REPORT_SECTIONS,
  REPORT_SUMMARY,
  REPORT_VERSIONS,
  SELF_RADAR,
  THRESHOLD_COMPARE,
} from '../data/student'
import GuideNote from '../components/GuideNote.vue'
import ConfidenceBadge from '../components/ConfidenceBadge.vue'
import RadarChart from '../components/charts/RadarChart.vue'
import MeterRow from '../components/charts/MeterRow.vue'
import QuadrantChart from '../components/charts/QuadrantChart.vue'
import TrendLine from '../components/charts/TrendLine.vue'

/**
 * 你的报告。
 *
 * 三条不能破的口径：
 *   1. 三个分区用用户语言，不用维度名（7.4）
 *   2. L1 只给"结论一句 + 有多大把握 + 一句门槛解释"；分值、走势、来源全在 L2（7.4）
 *   3. citations 必填 —— 不带依据的产出过不了契约（第 6 幕）
 *
 * 【2026-10-12 · 分段控件改造】
 * 客户原话是"太空了 + 过于偏向上下滚动看信息"。依据 NN/g：首屏拿到 57%、
 * 前两屏拿到 74% 的注意力，"screen space shouldn't be hoarded, it should be spent"。
 * 所以这一版做三件事，一件都不动数据口径：
 *   ① 首屏一条横带 = 统计条 + 结论 + "46 分，离门槛差 4 分"的极简 bullet（横向用完版心）；
 *   ② 三个分区改成**横向分段控件**（GOV.UK Tabs 的可用判据：内容能清晰分节、
 *      且**用户不需要跨段对比** —— 我们这三段确实不对比），点哪段只渲染哪段的维度，
 *      三条维度本身**并排**成一排，不再纵向堆三屏；
 *   ③ 门槛从"三条竖着的进度条"改成**一张 4 列的表**（数字列右对齐 + 表尾发丝线），
 *      中文可见列 ≤ 4，同行可比。
 *
 * 没有丢的东西：每条维度仍然"结论一句 + 门槛一句 + 依据（L2，点开可查）"，
 * 依据一个字都没藏。改造只动排版，不动内容。
 */

const sections = REPORT_SECTIONS
const versions = REPORT_VERSIONS
const currentVersion = computed(
  () => versions.find((v) => v.id === demo.state.reportVersion) ?? versions[0],
)

/** L2 展开：哪一条被点开了。L2 里"分值 / 走势 / 来源"三样都在，点开才出现 */
const openDim = ref<string | null>(null)

/** 分段控件：当前显示哪一段（默认第一段：你是什么样的人） */
const activeTab = ref(sections[0]?.key ?? '')

/** 切换分段：换段等于换了一屏内容，之前展开的那条 L2 要收起来，免得张冠李戴 */
function switchTab(key: string) {
  if (activeTab.value === key) return
  activeTab.value = key
  openDim.value = null
}

/** ← → 在分段之间走：GOV.UK / WAI-ARIA Tabs 的键盘口径 */
function moveTab(from: number, delta: number) {
  const n = sections.length
  if (!n) return
  const next = sections[(from + delta + n) % n]
  activeTab.value = next.key
  openDim.value = null
  requestAnimationFrame(() => {
    document.getElementById(`rtab-${next.key}`)?.focus()
  })
}

const activeSection = computed(
  () => sections.find((s) => s.key === activeTab.value) ?? sections[0],
)

/**
 * 门槛对照：表尾那个"差多少"由 mine / requirement 现算 ——
 * 差多少不该是第二处手写的数字（写死就会与上面两个数字对不上）。
 */
const gaps = computed(() =>
  THRESHOLD_COMPARE.map((t) => {
    const diff = t.requirement - t.mine
    return {
      ...t,
      /** 还差几分；≤0 表示已过门槛 */
      diff,
      passed: diff <= 0,
      gapText: diff > 0 ? `差 ${diff} 分` : `已过 ${-diff} 分`,
    }
  }),
)

/**
 * 首屏那条 bullet 读的是**这一版结论落点上的那一条**，不是"差值最大的一条"：
 * 差值最大的是项目经历（差 40），但那一条报告里从来没说要现在补；
 * 报告的原话是"唯一被反复卡住的是呈现 —— 46 分，离两条主攻方向的门槛差 4 分"。
 *
 * 怎么认出它、又不写死一个数字：
 *   1. 先认"结论段自己点名过的那一条"—— 分区里有一条维度，它的分值等于门槛表这一行的分值，
 *      而且**那条的门槛解释里引用了这个分值**（呈现能力的门槛句写着"你的呈现能力是 46 分"）；
 *   2. 认不出来（换版本 / 换数据）就退到"差得最少的那一条"：
 *      要补的是最快补上的那个门槛，这也正是结论段的说理；
 *   3. 都过线了就取差值最小的一条 —— 数字来自门槛表本身，不另写一处。
 */
function namedByConclusion(mine: number): boolean {
  for (const s of sections) {
    for (const d of s.dimensions) {
      if (d.score === mine && (d.threshold ?? '').includes(String(mine))) return true
    }
  }
  return false
}

const critical = computed(() => {
  const list = gaps.value
  if (!list.length) return null
  const named = list.find((t) => namedByConclusion(t.mine))
  if (named && !named.passed) return named
  const short = list.filter((t) => !t.passed)
  const pool = short.length ? short : list
  return pool.reduce((a, b) => (b.diff < a.diff ? b : a), pool[0])
})

/** 除了那一条，还有几条没过线 —— 一句话说清"整体差在哪" */
const shortCount = computed(() => gaps.value.filter((t) => !t.passed).length)

const quadItems = computed(() =>
  DIRECTION_PLANS.map((d, i) => ({
    id: d.id,
    label: d.title,
    role: d.role,
    // 横轴 = 机会大小，纵轴 = 够得着的程度
    x: [72, 84, 40][i] ?? 50,
    y: [58, 44, 76][i] ?? 50,
  })),
)

const trendPoints = computed(() =>
  versions
    .slice()
    .reverse()
    .map((v) => ({ label: v.label.replace('（当前）', ''), value: v.fit })),
)

/** 打印 / 存成 PDF：导出功能开关关掉时按钮不出现，不灰着放一个点不动的按钮 */
function printReport() {
  window.print()
}

/** 变更说明：改选之后"还有几处跟着改"（第 7 幕） */
const selected = computed(() => demo.use.selectedDirection.value)
const previous = computed(() => demo.use.previousDirection.value)
</script>

<template>
  <div class="page">
    <header class="page__head">
      <div class="hstack hstack-3 between wrap">
        <div>
          <h1 class="page__title">评估报告</h1>
          <p class="page__sub">
            每条结论都写清楚它是怎么来的。分值、走势、来源默认收起来 —— 点开才出现。
          </p>
        </div>
        <div class="hstack hstack-2">
          <label class="version">
            <span class="t-label">版本</span>
            <select
              class="version__select"
              :value="demo.state.reportVersion"
              @change="demo.setReportVersion(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="v in versions" :key="v.id" :value="v.id">{{ v.label }}</option>
            </select>
          </label>
          <button class="btn" @click="printReport">打印 / 存成 PDF</button>
        </div>
      </div>
    </header>

    <GuideNote gkey="report" :text="GUIDES.report" to="/path" to-label="看要做的取舍" />

    <article class="article">
      <!--
        ① 首屏横带：左边是"这一版报告的三个数"，右边是**结论本身**。
        原来统计条独占一行、结论再独占一行，1600px 的屏上两行各留半屏白 ——
        客户说的"太空"有一半来自这里。现在两块并排，横向吃满版心。
      -->
      <section class="sec hero">
        <div class="hero__numbers">
          <div class="tally">
            <div class="tally__item">
              <span class="tally__n">{{ currentVersion.fit / 100 }}</span><span class="tally__k">匹配度</span>
            </div>
            <div class="tally__item">
              <span class="tally__n">{{ sections.length }}</span><span class="tally__k">个分区</span>
            </div>
            <div class="tally__item">
              <span class="tally__n">{{ THRESHOLD_COMPARE.length }}</span><span class="tally__k">条硬门槛</span>
            </div>
            <div class="tally__item">
              <span class="tally__n">{{ DIRECTION_PLANS.length }}</span><span class="tally__k">条方向</span>
            </div>
          </div>
          <p class="t-note hero__stamp">
            {{ currentVersion.label }} · {{ currentVersion.at }} —— 读的是那一版资产，不会每次重新生成。
          </p>
          <p class="t-note">这一版补上了：{{ currentVersion.change }}</p>
        </div>

        <div class="hero__conclusion">
          <h2 class="sec__title">这一版的结论</h2>
          <!--
            分值 vs 门槛：一根横条 + 一道门槛刻度 + 差值文字。
            它替掉了原来"要滚到第四屏才看得到"的那句话 ——
            "46 分，离门槛差 4 分"正是这一版报告的落点，得在首屏。
          -->
          <div v-if="critical" class="gate">
            <span class="gate__name">{{ critical.label }}</span>
            <div
              class="gate__track"
              role="img"
              :aria-label="`${critical.label} ${critical.mine} 分，门槛 ${critical.requirement} 分，${critical.gapText}`"
            >
              <div class="gate__fill" :style="{ width: `${critical.mine}%` }" />
              <span class="gate__mark" :style="{ left: `${critical.requirement}%` }" />
            </div>
            <span class="gate__gap" :class="{ 'gate__gap--short': !critical.passed }">
              {{ critical.gapText }}到门槛 {{ critical.requirement }}
            </span>
            <p class="gate__legend">
              你 {{ critical.mine }} 分 · 门槛 {{ critical.requirement }} 分 ——
              差 {{ Math.max(0, critical.diff) }} 分，是补起来最快的一个。
            </p>
          </div>

          <blockquote class="quote sec__body">{{ REPORT_SUMMARY }}</blockquote>
        </div>

        <!--
          ③ 离门槛差几分：**4 列**（门槛 / 你的分值 / 要求 / 差距），数字列右对齐。
          它原来在第四屏、三条各占一行的进度条 —— 客户说"太偏向上下滚动"。
          这里并进首屏第三栏：左栏是三个数、中栏是结论、右栏是这张表 ——
          一屏之内"结论 + 它的依据"齐了。中文可见列只有 4 列，一行一条，同行可比。
        -->
        <div class="hero__threshold">
          <h2 class="sec__title">离门槛差几分</h2>
          <p class="hero__hint">
            {{ THRESHOLD_COMPARE.length }} 条硬门槛里有 {{ shortCount }} 条还没过；
            最近的一条差 {{ critical ? Math.max(0, critical.diff) : 0 }} 分，最远的一条差
            {{ gaps.length ? Math.max(...gaps.map((g) => Math.max(0, g.diff))) : 0 }} 分 —— 先说近的。
          </p>
          <table class="table">
            <caption class="sr-only">三条硬门槛：你的分值与要求的对照</caption>
            <thead>
              <tr>
                <th scope="col">门槛</th>
                <th scope="col" class="num">你的分值</th>
                <th scope="col" class="num">要求</th>
                <th scope="col" class="num">差距</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="t in gaps" :key="t.label">
                <tr>
                  <th scope="row" class="threshold__name">{{ t.label }}</th>
                  <td class="num">{{ t.mine }}</td>
                  <td class="num">{{ t.requirement }}</td>
                  <td class="num threshold__gap" :class="{ 'threshold__gap--short': !t.passed }">
                    {{ t.gapText }}
                  </td>
                </tr>
                <tr class="threshold__note">
                  <td colspan="4">{{ t.note }}</td>
                </tr>
              </template>
            </tbody>
          </table>
          <p class="t-note threshold__foot">
            门槛解释不写"建议提升"这种话 —— 写"差 4 分，是补起来最快的一个"，用户才知道先做哪件。
          </p>
        </div>
      </section>

      <!--
        ② 三个分区：横向分段控件。
        三段标题横排，点哪段只渲染那一段 —— 不再纵向堆三段、每条维度也不再占一整行。
        依据 GOV.UK Tabs 的可用判据：内容能清晰分节、**用户不需要跨段对比** → 可用。
      -->
      <section class="sec">
        <h2 class="sec__title">{{ sections.map((s) => s.title).join(' / ') }}</h2>
        <p class="sec__note">
          分区标题是用户语言，不是维度名。每条结论都能点开看分值、走势与依据。
        </p>

        <div class="sec__body">
          <div class="tabs" role="tablist" aria-label="报告的三个分区">
            <button
              v-for="(s, i) in sections"
              :id="`rtab-${s.key}`"
              :key="s.key"
              class="tabs__tab"
              :class="{ 'tabs__tab--on': activeTab === s.key }"
              type="button"
              role="tab"
              :aria-selected="activeTab === s.key"
              :aria-controls="`rpanel-${s.key}`"
              :tabindex="activeTab === s.key ? 0 : -1"
              @click="switchTab(s.key)"
              @keydown.left.prevent="moveTab(i, -1)"
              @keydown.right.prevent="moveTab(i, 1)"
            >
              <span class="tabs__title">{{ s.title }}</span>
              <span class="tabs__count">{{ s.dimensions.length }} 条</span>
            </button>
          </div>

          <div
            v-if="activeSection"
            :id="`rpanel-${activeSection.key}`"
            class="tabs__panel"
            role="tabpanel"
            :aria-labelledby="`rtab-${activeSection.key}`"
            tabindex="0"
          >
            <!-- 三条维度并排成一排：同一段之内本来就不需要上下对照 -->
            <div class="dim__grid">
              <div v-for="d in activeSection.dimensions" :key="d.key" class="dim">
                <div class="dim__head">
                  <span class="dim__label">{{ d.label }}</span>
                  <ConfidenceBadge :value="d.confidence" />
                </div>

                <!-- L1：结论一句 -->
                <p class="dim__conclusion">{{ d.conclusion }}</p>

                <!-- L1：门槛解释 —— 这份报告最值钱的一句话 -->
                <p v-if="d.threshold" class="dim__threshold">{{ d.threshold }}</p>

                <button
                  class="dim__more"
                  :aria-expanded="openDim === d.key"
                  @click="openDim = openDim === d.key ? null : d.key"
                >
                  {{ openDim === d.key ? '收起分值、走势与来源' : '看分值、走势与来源' }}
                </button>

                <!-- L2：依据一个字都不藏 —— 点开可查是这份报告的契约 -->
                <div v-if="openDim === d.key" class="dim__l2">
                  <div v-if="d.score != null" class="dim__meter">
                    <MeterRow
                      :label="d.label"
                      :score="d.score"
                      :requirement="d.label === '呈现能力' ? 50 : undefined"
                    />
                  </div>
                  <div class="dim__evidence">
                    <p class="t-label">依据（点开任何一条结论，都能看到它依据的是什么）</p>
                    <ul class="evidence">
                      <li v-for="e in d.evidence" :key="e">{{ e }}</li>
                    </ul>
                    <p class="t-note" style="margin-top: var(--sp-2)">
                      用法与理论引用：{{ '生涯建构理论 · 岗位门槛比对' }} —— 点开可查。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!--
        ④ 你是什么样的人：图与注解并排（两边都窄，图不再挤在 4 栏里）。
        它在分段控件之后，因为"你是什么样的人"这一段的结论已经在上面那段里给过了；
        这里给的是它的图形证据（六维雷达）与版本走势。
      -->
      <section class="sec">
        <h2 class="sec__title">你是什么样的人</h2>
        <p class="sec__note">六条，分值是 L2，默认不显示数字以外的判断。</p>
        <div class="split2 sec__body">
          <div>
            <RadarChart :axes="SELF_RADAR" :size="300" :baseline="50" />
            <p class="sec__note" style="margin-top: var(--sp-3)">
              虚线是两条主攻方向的要求线（50 分）。落在虚线里面的，就是拖后腿的那一项。
            </p>
            <p class="sec__note">
              数据来源：学生档案的 {{ SELF_RADAR.length }} 项自评，对照两条主攻方向的要求线。
            </p>
          </div>
          <div>
            <h3 class="sub">第 1 版 → 这一版</h3>
            <p class="t-note" style="margin-top: var(--sp-2)">
              匹配度从 0.61 提到 {{ (currentVersion.fit / 100).toFixed(2) }}，
              靠的是补上画像与学籍核验，不是重新生成一遍。
            </p>
            <TrendLine :points="trendPoints" :highlight-index="trendPoints.length - 1" />
            <p class="sec__note" style="margin-top: var(--sp-2)">
              数据来源：报告第 1–3 版的匹配度快照（每次核验后重算）。
            </p>
            <ul class="versions">
              <li v-for="v in versions" :key="v.id" class="versions__item">
                <span class="versions__label">{{ v.label }}</span>
                <span class="t-note">{{ v.change }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- ⑤ 取舍：图与三条并排 -->
      <section class="sec">
        <h2 class="sec__title">三条方向的取舍</h2>
        <p class="sec__note">系统只比差别，不替你选 —— 产出契约里根本没有"选择"字段。</p>
        <div class="two-col sec__body">
          <QuadrantChart
            :items="quadItems"
            :selected-id="demo.state.selectedDirectionId"
            @pick="demo.chooseDirection"
          />
          <div class="stack stack-3">
            <article
              v-for="d in DIRECTION_PLANS"
              :key="d.id"
              class="plan"
              :class="{ 'plan--on': demo.state.selectedDirectionId === d.id }"
            >
              <div class="hstack hstack-2 between">
                <span class="chip" :class="d.role === '主攻' ? 'chip--primary' : 'chip--outline'">
                  {{ d.role }}
                </span>
                <ConfidenceBadge :value="d.fit" />
              </div>
              <h3 class="plan__title">{{ d.title }}</h3>
              <ul class="plan__evidence">
                <li v-for="e in d.evidence" :key="e">{{ e }}</li>
              </ul>
              <p class="plan__risk">风险：{{ d.risk }}</p>
              <button
                class="btn btn--sm"
                :class="demo.state.selectedDirectionId === d.id ? '' : 'btn--primary'"
                :disabled="demo.state.selectedDirectionId === d.id"
                @click="demo.chooseDirection(d.id)"
              >
                {{ demo.state.selectedDirectionId === d.id ? '已选为' + d.role : '选它作为' + d.role }}
              </button>
            </article>
            <p class="t-note">
              产出契约里根本没有"选择"字段 —— 选不选、选哪个，始终在你手上。
            </p>
          </div>
        </div>
      </section>

      <!-- ⑥ 影响面：标题本身就是结论（几处 / 还没选） -->
      <section class="sec">
        <h2 class="sec__title">
          {{ selected ? `改选会牵动 ${selected.ripple} 处，其余原样` : '还没选方向' }}
        </h2>
        <p class="sec__note">
          {{ selected ? '"先放着"也是一个选项 —— 推迟也是决定。' : '报告不会预填内容：没生成的部分会写清原因，而不是摆一个空盒子。' }}
        </p>

        <div class="sec__body">
          <template v-if="selected">
            <p v-if="previous" class="change">
              从「{{ previous.title }}」改选为「{{ selected.title }}」。只重算了受影响的片段，其余原样。
            </p>
            <p v-else class="change">已选定「{{ selected.title }}」。改选零成本 —— 随时可以换。</p>
            <ul class="ripple">
              <li v-for="r in selected.ripplePoints" :key="r">{{ r }}</li>
            </ul>
          </template>
          <p v-else class="callout callout--attention">{{ FALLBACK_COPY.mock }}</p>
        </div>
      </section>
    </article>
  </div>
</template>

<style scoped>
/* ===========================================================================
 * 首屏横带：统计条 | 结论 | 门槛表 —— 三栏并排，横向吃满版心。
 * 依据 NN/g：首屏拿到 57% 的注意力，屏面不该攒着不用（"don't hoard screen space"）。
 * 三栏的顺序就是读的顺序：这一版有哪几个数 → 结论是什么 → 门槛差在哪。
 * ======================================================================== */

.hero {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 5fr) minmax(0, 4fr);
  gap: var(--sp-6);
  align-items: start;
}

.hero__numbers {
  min-width: 0;
}

/* 窄栏里四个数摊成 2×2 —— 一排四个会折行，折出来的第二行只落一个"条方向" */
.hero__numbers .tally {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-3) var(--sp-4);
}

.hero__stamp {
  margin-top: var(--sp-4);
}

.hero__stamp + .t-note {
  margin-top: var(--sp-1);
}

.hero__hint {
  margin-top: var(--sp-3);
  font-size: var(--fs-12);
  color: var(--c-text-2);
  line-height: var(--lh-snug);
}

.hero__conclusion {
  min-width: 0;
}

/* ── 分值 vs 门槛：一根横条 + 一道门槛刻度 + 差值文字（首屏那条 bullet） ── */

.gate {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) minmax(104px, auto);
  gap: var(--sp-2) var(--sp-3);
  align-items: center;
  /* 它是 .sec__title 后面的第一件东西，间距由 .sec__title 的下距给 */
  margin-top: var(--sp-4);
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-md);
  background: var(--c-surface-2);
}

.gate__name {
  font-size: var(--fs-14);
  font-weight: var(--fw-medium);
  color: var(--c-text);
  white-space: nowrap;
}

.gate__track {
  position: relative;
  height: 10px;
  border-radius: var(--r-pill);
  background: var(--c-surface-3);
}

.gate__fill {
  height: 100%;
  border-radius: var(--r-pill);
  background: var(--c-primary);
}

.gate__mark {
  position: absolute;
  top: -4px;
  width: var(--bw-2);
  height: 18px;
  border-radius: 1px;
  background: var(--c-text);
}

.gate__gap {
  font-size: var(--fs-14);
  font-weight: var(--fw-medium);
  color: var(--c-text-2);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* 没过门槛的那一档才用注意色 —— 过了的不给颜色奖励 */
.gate__gap--short {
  color: var(--c-attention-strong);
}

.gate__legend {
  grid-column: 2 / -1;
  font-size: var(--fs-12);
  color: var(--c-text-3);
  line-height: var(--lh-snug);
}

/* ── 门槛表（首屏第三栏）：4 列，数字列右对齐 ── */

.hero__threshold {
  min-width: 0;
}

/* 小标题（表题 / 画像两块的头）—— 用 14 一档，不再多开一层字号 */
.sub {
  font-size: var(--fs-14);
  font-weight: var(--fw-semibold);
}

/* ── 结论：引文语法 —— 一条细竖线 + 更大的字。**一页只用一次** ── */

.quote {
  margin: 0;
  padding-left: var(--sp-5);
  border-left: var(--bw-1) solid var(--c-border-strong);
  font-size: var(--fs-20);
  line-height: var(--lh-snug);
  letter-spacing: -0.008em;
  /* 一栏窄、一栏宽都能用：不给绝对值，让它跟着栏走 */
  max-width: 100%;
}

/* ===========================================================================
 * 分段控件（三个分区）
 * ---------------------------------------------------------------------------
 * GOV.UK Tabs：内容能清晰分节、且用户不需要跨段对比时用它。
 * 三段是"你是什么样的人 / 外面是什么情况 / 你要做哪些取舍" —— 读的时候是依次看，
 * 不是并排比，所以分段比"纵向堆三段"少两屏滚动。
 * ======================================================================== */

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--sp-6);
  border-bottom: var(--bw-1) solid var(--c-border);
}

.tabs__tab {
  display: inline-flex;
  align-items: baseline;
  gap: var(--sp-2);
  padding: var(--sp-3) 0;
  /* 选中态用一道 2px 下划线，不用色块：色块会把标题压成按钮，标题是内容 */
  border-bottom: var(--bw-2) solid transparent;
  margin-bottom: -1px;
  color: var(--c-text-3);
  font-size: var(--fs-14);
  font-weight: var(--fw-medium);
  transition: color var(--dur-1) ease, border-color var(--dur-1) ease;
}

.tabs__tab:hover {
  color: var(--c-text);
}

.tabs__tab--on {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
}

.tabs__title {
  font-size: var(--fs-14);
}

.tabs__count {
  font-size: var(--fs-12);
  color: var(--c-text-3);
  font-variant-numeric: tabular-nums;
}

.tabs__tab--on .tabs__count {
  color: var(--c-primary);
}

.tabs__panel {
  margin-top: var(--sp-5);
}

/* 三条维度并排：同一段里本来就不需要上下对照，横着排一屏就看完。
   grid-auto-rows: 1fr 让三块等高 —— 于是"看分值、走势与来源"落在同一条线上
   （一条摊开 L2 变高时，另两条的按钮不会被顶到半空）。 */
.dim__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  gap: var(--sp-5);
  align-items: stretch;
}

/* 维度块之间的竖发丝线：靠 gap 里的左边框给，不加盒子 */
.dim__grid > .dim + .dim {
  padding-left: var(--sp-5);
  border-left: var(--bw-1) solid var(--c-border);
}

.dim {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.dim__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}

.dim__label {
  font-size: var(--fs-12);
  color: var(--c-text-3);
  letter-spacing: 0.02em;
}

.dim__conclusion {
  margin-top: var(--sp-2);
  font-size: var(--fs-14);
  font-weight: var(--fw-medium);
  line-height: var(--lh-snug);
}

.dim__threshold {
  margin-top: var(--sp-3);
  padding: var(--sp-3);
  border-radius: var(--r-md);
  background: var(--c-attention-weak);
  border-left: 3px solid var(--c-attention);
  font-size: var(--fs-14);
  color: var(--c-text);
  line-height: var(--lh-normal);
}

.dim__more {
  /* 推到底：三条维度的"看分值、走势与来源"落在同一条线上 */
  margin-top: auto;
  padding-top: var(--sp-3);
  text-align: left;
  font-size: var(--fs-12);
  color: var(--c-primary);
}

.dim__more:hover {
  text-decoration: underline;
}

.dim__l2 {
  margin-top: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--r-md);
  background: var(--c-surface-2);
  border: var(--bw-1) solid var(--c-border);
}

.dim__meter {
  max-width: 360px;
}

.dim__evidence {
  margin-top: var(--sp-4);
  padding-top: var(--sp-3);
  border-top: var(--bw-1) solid var(--c-border);
}

.evidence {
  margin-top: var(--sp-2);
}

.evidence li {
  position: relative;
  padding-left: var(--sp-4);
  font-size: var(--fs-12);
  color: var(--c-text-2);
  line-height: 1.65;
}

.evidence li::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 9px;
  width: 4px;
  height: 4px;
  border-radius: var(--r-pill);
  background: var(--c-primary);
}

/* ===========================================================================
 * 门槛表：4 列，数字列右对齐（表本体在首屏左栏，样式在上面 .hero__threshold 一带）。
 * 表尾那道发丝线是 Matter 的做法 —— 末行与"合计/说明"分开，读的人知道表到哪结束。
 * ======================================================================== */

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.threshold__name {
  text-align: left;
  font-weight: var(--fw-medium);
  color: var(--c-text);
  font-size: var(--fs-14);
}

.threshold__gap {
  font-weight: var(--fw-medium);
}

.threshold__gap--short {
  color: var(--c-attention-strong);
}

/* 门槛解释（原来写在"建议提升"旁边的那些话）：当表里的一行附注，不另占一块 */
.threshold__note td {
  padding-top: 0;
  padding-bottom: var(--sp-3);
  font-size: var(--fs-12);
  color: var(--c-text-3);
  border-bottom: none;
}

.threshold__foot {
  margin-top: var(--sp-4);
  padding-top: var(--sp-3);
  border-top: var(--bw-1) solid var(--c-border);
}

/* ── 画像：图与注解并排（两边都窄，雷达图不再被挤在 4 栏里） ── */

.split2 {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--sp-7);
  align-items: start;
}

/* ── 四象限与方案 ── */

.two-col {
  display: grid;
  grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
  gap: var(--sp-5);
  align-items: start;
}

.plan {
  padding: var(--sp-3);
  border: var(--bw-1) solid var(--c-border);
  border-radius: var(--r-md);
}

.plan--on {
  border-color: var(--c-primary);
  background: var(--c-primary-weak);
}

.plan__title {
  margin-top: var(--sp-2);
  font-size: var(--fs-14);
  font-weight: var(--fw-semibold);
}

.plan__evidence {
  margin-top: var(--sp-2);
}

.plan__evidence li {
  position: relative;
  padding-left: var(--sp-3);
  font-size: var(--fs-12);
  color: var(--c-text-2);
  line-height: 1.6;
}

.plan__evidence li::before {
  content: '·';
  position: absolute;
  left: 2px;
}

.plan__risk {
  margin-top: var(--sp-2);
  font-size: var(--fs-12);
  color: var(--c-attention);
}

.plan .btn {
  margin-top: var(--sp-3);
}

/* ── 版本列表 ── */

.versions {
  margin-top: var(--sp-4);
  padding-top: var(--sp-3);
  border-top: var(--bw-1) solid var(--c-border);
}

.versions__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--sp-2) 0;
  border-bottom: var(--bw-1) solid var(--c-border);
}

.versions__item:last-child {
  border-bottom: none;
}

.versions__label {
  font-size: var(--fs-12);
  font-weight: var(--fw-medium);
}

/* ── 版本下拉 ── */

.version {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.version__select {
  height: var(--btn-h-md);
  padding: 0 var(--sp-3);
  border: var(--bw-1) solid var(--c-border-strong);
  border-radius: var(--r-md);
  background: var(--c-surface);
  font-size: var(--fs-14);
}

/* ── 影响面 ── */

.change {
  margin-top: var(--sp-3);
  font-size: var(--fs-14);
  color: var(--c-text-2);
  line-height: var(--lh-snug);
}

.ripple {
  margin-top: var(--sp-3);
}

.ripple li {
  position: relative;
  padding: var(--sp-2) 0 var(--sp-2) var(--sp-4);
  font-size: var(--fs-12);
  color: var(--c-text-2);
  border-bottom: var(--bw-1) dashed var(--c-border);
}

.ripple li:last-child {
  border-bottom: none;
}

.ripple li::before {
  content: '↻';
  position: absolute;
  left: 0;
  color: var(--c-primary);
}

/* 窄下来：三段并排会挤到读不了，退回两列、再退回一列 */
@media (max-width: 1400px) {
  .dim__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dim__grid > .dim:nth-child(odd) {
    padding-left: 0;
    border-left: none;
  }

  /* 门槛表有 4 列，窄栏里会折到读不了 —— 让它占满一整行 */
  .hero {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .hero__threshold {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1080px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--sp-6);
  }

  .hero__threshold {
    grid-column: 1;
  }

  .split2,
  .two-col {
    grid-template-columns: minmax(0, 1fr);
  }

  .dim__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .dim__grid > .dim + .dim {
    padding-left: 0;
    border-left: none;
    padding-top: var(--sp-5);
    border-top: var(--bw-1) solid var(--c-border);
  }

  .gate {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .gate__gap {
    grid-column: 2;
  }

  .gate__legend {
    grid-column: 1 / -1;
  }
}
</style>

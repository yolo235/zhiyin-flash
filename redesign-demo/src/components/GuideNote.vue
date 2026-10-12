<script setup lang="ts">
import { computed } from 'vue'
import { demo } from '../store'

/**
 * 这一页怎么看 —— 每页的**入口**，位置固定在页头正下方第一位。
 *
 * 【2026-10-12 重做】客户的原话：
 *   「感觉乱，我希望用户一点开就能知道如何使用，清晰的知道有什么信息，
 *     现在的界面上下左右都有信息，用户不知道如何使用。」
 *
 * 所以它现在承担三件事，对应客户说的三个缺口：
 *   1. 一点开就知道怎么用   → 一句"这一页是什么" + 三步"怎么看"，第一步就是入口
 *   2. 清晰知道有什么信息   → 三步的用词全部取自这一页真有的分区名，不新造词
 *   3. 上下左右都有信息、没顺序 → 三步是**编号的**，它给出的就是阅读顺序
 *
 * 上一版的毛病：它被放在页面**最下面**（只有报告页在顶部），而且长得像脚注。
 * "怎么用"是最后一屏才看到的东西 —— 那就等于没有。
 *
 * 评审硬要求仍然成立：用户收起后不再打扰（记住收起了哪几处），可以一次恢复。
 */
const props = defineProps<{
  /** 唯一 key：同一页可以有两条引导 */
  gkey: string
  /** 这一页是什么、下一步去哪（语气档一：说人话） */
  text: string
  /** 三步"怎么看"。每一步都必须是这一页上真有的东西：分区名、块名、动作名。 */
  steps?: string[]
  /**
   * 「这一页有」：把这一页的块名**按出现顺序**列一遍。
   * 与 steps 的区别：steps 是"怎么做"（动作），contents 是"有什么"（清单）——
   * 客户的原话是"清晰的知道有什么信息"，光有步骤还是不知道一共有几块。
   */
  contents?: string[]
  /** 下一步去哪（可选） */
  to?: string
  toLabel?: string
}>()

const closed = computed(() => demo.state.guidesClosed[props.gkey] === true)
</script>

<template>
  <Transition name="guide">
    <section v-if="!closed" class="howto" aria-label="这一页怎么看">
      <div class="howto__main">
        <p class="howto__title">这一页怎么看</p>
        <p class="howto__text">{{ props.text }}</p>
        <ol v-if="props.steps?.length" class="howto__steps">
          <li v-for="(s, i) in props.steps" :key="i" class="howto__step">
            <span class="howto__n" aria-hidden="true">{{ i + 1 }}</span>
            <span>{{ s }}</span>
          </li>
        </ol>

        <!-- 「这一页有什么」—— 清单，不是动作。用户看完这一行就知道往下还有几块 -->
        <p v-if="props.contents?.length" class="howto__index">
          <span class="howto__index-k">这一页有</span>
          <span v-for="(c, i) in props.contents" :key="i" class="howto__index-i">{{ c }}</span>
        </p>
      </div>

      <div class="howto__side">
        <RouterLink v-if="props.to" class="howto__to" :to="props.to">
          {{ props.toLabel ?? '去下一步' }} →
        </RouterLink>
        <button class="howto__close" aria-label="收起这条引导" @click="demo.closeGuide(props.gkey)">
          ✕
        </button>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.howto {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-4);
  margin-bottom: var(--sp-6);
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-md);
  background: var(--c-surface-2);
  border: var(--bw-1) solid var(--c-border);
}

.howto__main {
  flex: 1;
  min-width: 0;
}

.howto__title {
  font-size: var(--fs-12);
  font-weight: var(--fw-semibold);
  color: var(--c-text-3);
  letter-spacing: 0.02em;
}

.howto__text {
  margin-top: 2px;
  font-size: var(--fs-14);
  color: var(--c-text);
  line-height: var(--lh-snug);
  max-width: 46em;
}

/* 三步横排：一屏一行放下，读起来就是"①→②→③" */
.howto__steps {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2) var(--sp-6);
  margin-top: var(--sp-3);
}

.howto__step {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  font-size: var(--fs-14);
  color: var(--c-text-2);
}

.howto__n {
  width: 16px;
  height: 16px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: var(--r-pill);
  background: var(--c-primary-weak);
  color: var(--c-primary);
  font-size: var(--fs-12);
  font-weight: var(--fw-semibold);
}

/* 「这一页有」：块名一行排开，中间用发丝竖线分而不是圆点（圆点已被步骤占用） */
.howto__index {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--sp-3);
  margin-top: var(--sp-2);
  font-size: var(--fs-12);
  color: var(--c-text-3);
}

.howto__index-k {
  color: var(--c-text-3);
}

.howto__index-i + .howto__index-i::before {
  content: '';
  display: inline-block;
  width: var(--bw-1);
  height: 10px;
  margin-right: var(--sp-3);
  background: var(--c-border-strong);
  vertical-align: -1px;
}

.howto__index-i {
  color: var(--c-text-2);
}

.howto__side {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.howto__to {
  font-size: var(--fs-12);
  font-weight: var(--fw-medium);
  white-space: nowrap;
}

.howto__close {
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: var(--r-sm);
  color: var(--c-text-3);
  font-size: var(--fs-12);
  line-height: 1;
}

.howto__close:hover {
  background: var(--c-surface-3);
  color: var(--c-text);
}

.guide-enter-active,
.guide-leave-active {
  transition: opacity var(--mo-base) var(--mo-ease);
}

.guide-enter-from,
.guide-leave-to {
  opacity: 0;
}

@media (max-width: 760px) {
  .howto {
    flex-direction: column;
  }

  .howto__side {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileField } from '../data/types'
import UiIcon from './UiIcon.vue'
const props=defineProps<{fields: readonly ProfileField[]; missing:number}>()
const sources=computed(()=>[...new Set(props.fields.map(f=>f.source))].map(source=>({source,count:props.fields.filter(f=>f.source===source).length})))
</script>
<template><section class="studio-sources" aria-label="档案信息来源"><div class="studio-sources__head"><div><h2>每条信息，都有来处</h2><p>已有记录与待补充项分开查看。</p></div><UiIcon name="profile" :size="28"/></div><div class="studio-source-links"><div class="studio-source-links__inputs"><span v-for="s in sources" :key="s.source"><UiIcon :name="s.source==='对话'?'chat':s.source==='本人填写'?'notes':'report'" :size="17"/><strong>{{ s.source }}</strong><small>{{ s.count }} 项</small></span><span v-if="!sources.length" class="ws-muted">尚未取得个人资料</span></div><div class="studio-source-links__join" aria-hidden="true"><svg viewBox="0 0 76 130"><path d="M1 24H24Q38 24 38 46V65H76M1 65H76M1 106H24Q38 106 38 84V65" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="38" cy="65" r="6" fill="currentColor"/></svg></div><dl class="studio-source-links__result"><div><dt>已记录信息</dt><dd>{{ fields.length }} <small>项</small></dd></div><div><dt>待补充</dt><dd>{{ missing }} <small>项</small></dd></div></dl></div><p class="studio-visual-caption">数量表示档案记录，不是能力评分。展开下方条目可核对原始依据。</p></section></template>

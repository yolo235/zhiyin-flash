<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { demo } from '../store'
import { COLLECT_ITEMS, PROFILE_FIELDS, STUDENT } from '../data/student'
import type { ProfileField } from '../data/types'
import PageHeading from '../components/PageHeading.vue'
import UiIcon from '../components/UiIcon.vue'
import InfoSheet from '../components/InfoSheet.vue'

import EmptyState from '../components/EmptyState.vue'
import ProfileInsights from '../components/ProfileInsights.vue'
import ProfileSources from '../components/ProfileSources.vue'
import { backendDemo } from '../lib/backend-demo'
import { backendClient } from '../api/backend-client'
import type { ProfileFieldView } from '../api/backend-types'
const loading = ref(false), serviceError = ref('')
const live = computed(() => backendDemo.state.liveWorkspace?.profile_panel)
const originalLive = computed(() => backendDemo.state.profileOriginals)
const sourceNames: Record<string, ProfileField['source']> = {resume:'简历材料',conversation:'对话',assessment:'综合分析',behavior_inference:'行为记录',mentor:'导师记录',record:'学校',user_edit:'本人填写'}
function human(value: unknown): string { if (value == null) return '尚待补充'; if (Array.isArray(value)) return value.map(human).join('、'); if(typeof value==='object')return Object.values(value).map(human).join('；');return String(value) }
async function loadWorkspace(){ if(loading.value)return; loading.value=true;serviceError.value='';try{const data=await backendClient.workspace();if(!data?.profile_panel)throw new Error('Incomplete profile');backendDemo.setWorkspace(data)}catch{serviceError.value='最新档案暂时没有取得，请重试。现有内容仍保留。'}finally{loading.value=false} }
const insights = ref<InstanceType<typeof ProfileInsights> | null>(null)
const progress = computed(() => live.value ? {known:live.value.fields?.length??0,total:(live.value.fields?.length??0)+(live.value.gaps?.length??0),gap:live.value.gaps?.length??0} : demo.use.profileProgress.value)
const known = computed<ProfileField[]>(() => live.value ? (live.value.fields??[]).map(f=>({key:f.key,label:f.label??f.key,value:human(f.value),source:sourceNames[f.source]??'学校',noted:new Date(f.updated_at).toLocaleString('zh-CN'),confidence:{label:f.confidence===undefined?'待确认':f.confidence>=.8?'比较确定':f.confidence>=.5?'还要核对':'待确认',level:f.confidence!==undefined&&f.confidence>=.8?'high':'mid',bars:f.confidence===undefined?0:Math.round(f.confidence*3)}})) : PROFILE_FIELDS.slice(0, progress.value.known))
const missing = computed(() => live.value ? (live.value.gaps??[]).map(g=>({key:g.key,label:g.label??g.key})) : PROFILE_FIELDS.slice(progress.value.known))
const filter = ref('all')
const selectedField = ref('interest')
const activeField = computed(() => visible.value.find(f => f.key === selectedField.value) ?? visible.value[0])
function selectField(field: ProfileField) { selectedField.value = field.key }
const selectedOriginal = computed(() => activeField.value ? human(originalLive.value[activeField.value.key]?.value ?? activeField.value.value) : '')
const selectedEvidence = computed(() => activeField.value ? (originalLive.value[activeField.value.key]?.evidence ?? live.value?.fields?.find(f => f.key === activeField.value!.key)?.evidence ?? []) : [])
const selectedOriginalAt = computed(() => {
  const field = activeField.value
  const at = field && originalLive.value[field.key]?.updated_at
  return at ? new Date(at).toLocaleString('zh-CN') : field?.noted ?? ''
})
const selectedOriginalConfidence = computed(() => {
  const field = activeField.value
  const original = field && originalLive.value[field.key]
  if (!original) return field?.confidence.label ?? '待确认'
  return original.confidence === undefined ? '待确认' : original.confidence >= .8 ? '比较确定' : original.confidence >= .5 ? '还要核对' : '待确认'
})
const filters = [
  { key: 'all', label: '全部信息', sources: [] },
  { key: 'school', label: '学校档案', sources: ['学信网', '教务系统', '学校'] },
  { key: 'talk', label: '咨询记录', sources: ['对话'] },
  { key: 'material', label: '材料与分析', sources: ['简历材料','综合分析','导师记录'] },
  { key: 'behavior', label: '行为记录', sources: ['行为记录'] },
  { key: 'user', label: '本人填写', sources: ['本人填写'] },
]
const visible = computed(() => {
  const f = filters.find((item) => item.key === filter.value)!
  return filter.value === 'all' ? known.value : known.value.filter((item) => f.sources.includes(fieldSource(item)))
})
watch(visible, fields => { if (!fields.some(f => f.key === selectedField.value)) selectedField.value = fields[0]?.key ?? '' }, { flush: 'sync' })
const correction = ref<ProfileField | null>(null)
const value = ref('')
const correctionError = ref('')
function fieldValue(f: ProfileField) {
  if(live.value)return f.value
  return demo.state.profileEdits[f.key] ?? (f.key === 'grade' ? demo.use.scenario.value.grade + '（在读）' : f.value)
}
function edit(f: ProfileField) {
  correction.value = f; value.value = fieldValue(f); correctionError.value = ''
}
async function save() {
  if (!value.value.trim()) { correctionError.value = '请填写更正后的信息。'; return }
  if (value.value.trim().length > 40) { correctionError.value = '更正内容最多 40 个字。'; return }
  if (correction.value && live.value) {
    const field=correction.value;const previous=backendDemo.state.liveWorkspace?.profile_panel?.fields?.find(f=>f.key===field.key)
    serviceError.value='';try{const updated=await backendClient.correct(field.key,value.value.trim());if(previous&&!originalLive.value[field.key])backendDemo.rememberProfileOriginal(field.key);const workspace=JSON.parse(JSON.stringify(backendDemo.state.liveWorkspace));workspace.profile_panel.fields=workspace.profile_panel.fields.map((f:ProfileFieldView)=>f.key===updated.key?updated:f);backendDemo.setWorkspace(workspace)}catch{correctionError.value='更正没有保存成功，输入仍保留，请重试。';return}
  }
  if (correction.value) demo.updateProfileField(correction.value.key, value.value)
  correction.value = null
}
function originalSource(f: ProfileField) { return sourceNames[originalLive.value[f.key]?.source ?? ''] ?? f.source }
function edited(f: ProfileField) { return live.value ? f.source==='本人填写' : !!demo.state.profileEdits[f.key] }
function fieldSource(f: ProfileField) { return !live.value&&demo.state.profileEdits[f.key] ? '本人填写' : f.source }
const topics = [
  { title: '兴趣与能力', keys: ['interest', 'style', 'weakness'] },
  { title: '学习与经历', keys: ['major', 'grade', 'rank', 'award', 'internship'] },
  { title: '条件与期待', keys: ['family', 'city', 'jobtype', 'salary'] },
  { title: '行动与时间', keys: ['pipeline', 'time', 'schedule'] },
]
const allTopics = computed(() => [...topics, { title:'其他已记录信息', keys:known.value.filter(f=>!topics.some(t=>t.keys.includes(f.key))).map(f=>f.key).concat(missing.value.filter(f=>!topics.some(t=>t.keys.includes(f.key))).map(f=>f.key)) }])
const groups = computed(() => allTopics.value.map(t => ({ ...t, fields: visible.value.filter(f => t.keys.includes(f.key)), missing: missing.value.filter(f => t.keys.includes(f.key)) })).filter(t => t.fields.length || (filter.value === 'all' && t.missing.length)))
</script>
<template>
  <div class="ws-page profile-page">
    <PageHeading title="个人画像" description="按主题整理你的信息，判断和来源都可以核对。"><button class="btn" :disabled="loading" @click="loadWorkspace">{{ loading ? '正在读取…' : '读取最新档案' }}</button><RouterLink class="btn btn--primary" to="/chat">{{ progress.gap ? '补充信息' : '更新信息' }}<UiIcon name="arrow" :size="16" /></RouterLink></PageHeading>
    <p v-if="serviceError" class="ws-field-error" role="alert">{{ serviceError }}</p><section class="source-identity profile-summary"><div><h2>{{ live ? known.find(f=>f.key==='name')?.value || '个人档案' : demo.state.account === 'fresh' ? '新用户' : STUDENT.name }}</h2><p>{{ live ? [known.find(f=>f.key==='school')?.value,known.find(f=>f.key==='grade')?.value].filter(Boolean).join(' · ') || '学校与年级待补充' : demo.state.account === 'fresh' ? '学校与年级待补充' : (demo.state.profileEdits.school ?? STUDENT.school) + ' · ' + (demo.state.profileEdits.grade ?? demo.use.scenario.value.grade) }}</p></div><p class="profile-summary__status">已有 {{ progress.known }} / {{ progress.total }} 条信息<span v-if="progress.gap"> · {{ progress.gap }} 条待补充</span></p></section>
    <div class="source-workbench"><aside class="source-evidence" aria-label="当前记录的来源"><h2>记录来自哪里</h2><p class="source-intro">选择一条记录，核对它的原始依据。</p><label v-if="visible.length" class="source-field-select">查看记录<select v-model="selectedField"><option v-for="f in visible" :key="f.key" :value="f.key">{{ f.label }}</option></select></label><Transition name="source-record" mode="out-in"><div v-if="activeField" :key="activeField.key" class="source-evidence__current"><p class="source-evidence__label">{{ activeField.label }} · {{ originalSource(activeField) }}</p><div class="source-evidence__value">{{ selectedOriginal }}</div><p class="source-evidence__meta">{{ selectedOriginalAt }} · {{ selectedOriginalConfidence }}</p><details class="source-evidence__details"><summary>展开来源说明<UiIcon name="chevron" :size="16"/></summary><ul v-if="selectedEvidence.length"><li v-for="e in selectedEvidence" :key="e">{{ e }}</li></ul><p v-else>{{ live ? '此项没有额外的原始说明，保留已取得的来源与记录。' : '这是预置档案的原始记录；更正另行保留，不覆盖来源。' }}</p><p v-if="edited(activeField)">本人更正：{{ fieldValue(activeField) }}</p></details><div class="source-evidence__trace" aria-hidden="true"><svg viewBox="0 0 110 18"><path d="M2 9H101m-7-5 7 5-7 5" fill="none" stroke="currentColor" stroke-width="1.6" pathLength="1"/></svg><span>来源 → {{ activeField.label }}</span></div><div class="source-evidence__actions"><button @click="edit(activeField)">更正这条记录<UiIcon name="arrow" :size="16"/></button><RouterLink to="/chat">回到咨询</RouterLink></div></div><div v-else class="source-filter-empty"><p>{{ known.length ? '当前来源下没有已记录信息。可以切换来源，查看其他已有记录。' : '还没有已记录信息，可以从一次咨询开始。' }}</p><button v-if="filter!=='all'" class="btn" @click="filter='all'">查看全部信息</button><RouterLink v-else class="ws-text-link" to="/chat">开始咨询</RouterLink></div></Transition></aside><section class="source-records"><div class="profile-toolbar"><h2>主题档案</h2><label>信息来源<select v-model="filter" aria-label="信息来源"><option v-for="f in filters" :key="f.key" :value="f.key">{{ f.label }}</option></select></label></div>
    <div class="profile-topics" v-if="groups.length"><section v-for="g in groups" :key="g.title" class="profile-topic"><h3><UiIcon :name="g.title.includes('学校')?'academic':g.title.includes('行动')?'action':'profile'" :size="21"/>{{ g.title }}</h3><div class="ws-evidence"><details v-for="f in g.fields" :key="f.key" class="ws-evidence__row" :class="{'source-record--selected':activeField?.key===f.key}"><summary @click="selectField(f)"><span class="ws-evidence__label">{{ f.label }}</span><span class="ws-evidence__value">{{ fieldValue(f) }}</span><UiIcon name="chevron" :size="18" /></summary><div class="ws-evidence__explain"><p>当前来源：{{ fieldSource(f) }} · {{ edited(f) ? '本人确认' : f.confidence.label }}</p><p>原始依据：{{ originalSource(f) }} · {{ originalLive[f.key]?.updated_at ?? f.noted }}</p><ul v-if="live" class="ws-mini-list"><li v-for="e in (originalLive[f.key]?.evidence ?? live.fields?.find(item=>item.key===f.key)?.evidence ?? [])" :key="e">{{ e }}</li></ul><p v-if="edited(f)">本人更正于 {{ live ? f.noted : demo.state.profileEditTimes[f.key] }}</p><button class="ws-text-button" @click="insights?.inspect(f.key,f.label)">深入了解这项信息</button><button class="ws-text-button" @click="edit(f)">更正信息<UiIcon name="arrow" :size="14" /></button></div></details></div><ul v-if="filter === 'all' && g.missing.length" class="profile-gaps"><li v-for="f in g.missing" :key="f.key"><span>{{ f.label }}<small>待补充</small></span><button class="ws-text-button" @click="insights?.inspect(f.key,f.label,true)">看看需要补充什么</button><RouterLink class="ws-text-link" :to="'/chat?gap=' + f.key">补充{{ f.label }}<UiIcon name="arrow" :size="14" /></RouterLink></li></ul></section></div>
    <EmptyState v-else :title="known.length ? '暂无此类记录' : '暂无个人信息'" description="可以从一次咨询开始，也可以导入已有的学校资料。"><RouterLink class="btn" to="/chat">开始咨询</RouterLink></EmptyState></section><aside class="source-next"><h2>{{ missing.length?'还缺这些信息':'继续核对与行动' }}</h2><ul v-if="missing.length"><li v-for="f in missing" :key="f.key"><h3>{{ f.label }}</h3><p>尚待补充</p><RouterLink :to="'/chat?gap='+f.key">补充{{ f.label }}<UiIcon name="arrow" :size="15"/></RouterLink></li></ul><p v-else>已有信息仍可更正。确认之后，继续核对报告与方向。</p><RouterLink class="source-next__report" to="/report">查看整体诊断<UiIcon name="arrow" :size="16"/></RouterLink></aside></div>
    <details class="studio-source-disclosure"><summary>核对资料来源<span>{{ known.length }} 条已有信息 · {{ progress.gap }} 条待补充</span><UiIcon name="chevron" :size="16"/></summary><ProfileSources :fields="known.map(f=>({...f,source:fieldSource(f)}))" :missing="progress.gap"/></details><details class="source-analysis-disclosure"><summary>整体分析与补充建议<UiIcon name="chevron" :size="16"/></summary><ProfileInsights ref="insights"/></details>
    <details class="ws-context"><summary>资料来源与核验说明<UiIcon name="chevron" :size="16" /></summary><div class="ws-context__body"><section><h3>可获取的信息</h3><ul class="ws-mini-list"><li v-for="c in COLLECT_ITEMS" :key="c.label"><strong>{{ c.label }}</strong><p>{{ c.fetchable ? '来自' + c.from : c.blockedBy }}</p></li></ul></section><section><h3>学校资料</h3><p>学籍核验只需在线验证码，不需要账号密码。课表来自教务资料，空课时段不直接代表可用时间。</p><RouterLink class="ws-text-link" to="/academic">管理学籍与资料<UiIcon name="arrow" :size="16" /></RouterLink></section></div></details>
    <p class="ws-demo-note">{{ live ? '字段与缺口来自本次读取的档案；更正按服务回包保存。' : '预置人物与来源仅作演示；更正保留在本次演示会话。' }}</p>
    <InfoSheet :open="correction !== null" :title="'更正' + (correction?.label ?? '信息')" @close="correction = null"><form @submit.prevent="save"><div class="studio-edit-context"><h3>当前记录</h3><p>{{ correction ? fieldValue(correction) : '' }}</p><small>{{ correction ? fieldSource(correction) : '' }} · 原始依据保留</small></div><label class="ws-field">更正内容<textarea v-model="value" maxlength="40" /></label><p v-if="correctionError" class="ws-field-error" role="alert">{{ correctionError }}</p><div class="ws-inline-actions"><button class="btn btn--primary" type="submit">保存更正</button><button class="btn" type="button" @click="correction = null">取消</button></div></form></InfoSheet>
  </div>
</template>

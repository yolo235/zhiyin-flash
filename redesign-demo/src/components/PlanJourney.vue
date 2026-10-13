<script setup lang="ts">
import { computed } from 'vue'
import { demo } from '../store'
import { backendDemo } from '../lib/backend-demo'
import { DEMO_PHASE_TASK_IDS } from '../data/phase-tasks'
import UiIcon from './UiIcon.vue'
const stages=computed(()=>backendDemo.state.liveAction?.has_plan ? (backendDemo.state.liveAction.phases??[]).map((p,i)=>({id:'live-'+i,title:p.name,done:p.tasks?.filter(t=>t.done).length??0,total:p.tasks?.length??0})) : backendDemo.state.planAvailable ? demo.use.scenario.value.milestones.map(m=>{const tasks=demo.state.tasks.filter(t=>DEMO_PHASE_TASK_IDS[m.id]?.includes(t.id));return {id:m.id,title:m.title,done:tasks.filter(t=>t.bucket==='done').length,total:tasks.length}}) : [])
const current=computed(()=>stages.value.findIndex(s=>s.total===0||s.done<s.total))
</script>
<template><section v-if="stages.length" class="studio-journey"><div class="ws-section-head"><h2>阶段进度</h2><RouterLink class="ws-text-link" to="/plan">查看阶段任务<UiIcon name="arrow" :size="16"/></RouterLink></div><ol><li v-for="(s,i) in stages" :key="s.id" :class="{'is-complete':s.total>0&&s.done===s.total,'is-current':i===current}" :aria-current="i===current?'step':undefined"><span class="studio-journey__node"><UiIcon v-if="s.total>0&&s.done===s.total" name="check" :size="17"/><span v-else>{{ i+1 }}</span></span><div><h3>{{ s.title }}</h3><p>{{ s.total?s.done+' / '+s.total+' 件已完成':'任务待安排' }}</p></div></li></ol></section></template>

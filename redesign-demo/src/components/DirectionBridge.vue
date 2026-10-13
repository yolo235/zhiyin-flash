<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ plans: readonly {id:string; name:string; role:string; risk:string; selected?:boolean}[]; source:string; caption:string }>()
const height=computed(()=>Math.max(1,props.plans.length)*70)
function path(i:number){const y=i*70+35,mid=height.value/2;return `M0 ${mid} H18 Q38 ${mid} 50 ${y} H98`}
</script>
<template><figure class="direction-bridge"><div class="direction-bridge__source"><span class="direction-bridge__origin"/><strong>{{ source }}</strong><small>对照已有方向</small></div><svg class="direction-bridge__lines" :viewBox="`0 0 100 ${height}`" preserveAspectRatio="none" aria-hidden="true"><path v-for="(p,i) in plans" :key="p.id" :d="path(i)" :class="{'is-selected':p.selected}"/><circle v-for="(p,i) in plans" :key="'point-'+p.id" cx="75" :cy="i*70+35" r="4"/></svg><ol class="direction-bridge__branches"><li v-for="p in plans" :key="p.id" :class="{'is-selected':p.selected}"><RouterLink to="/directions"><span>{{ ({main:'主攻',primary:'主攻',parallel:'平行',backup:'保底',fallback:'保底'} as Record<string,string>)[p.role] ?? p.role }}<b v-if="p.selected">当前选择</b></span><strong>{{ p.name }}</strong><small>{{ p.risk || '风险信息待补充' }}</small></RouterLink></li></ol><figcaption>{{ caption }}</figcaption></figure></template>

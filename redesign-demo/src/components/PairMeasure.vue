<script setup lang="ts">
import { computed } from 'vue'
const props=defineProps<{have:number; need:number; maximum?:number; label?:string}>()
const maximum=computed(()=>props.maximum??Math.max(props.have,props.need,1))
const valid=computed(()=>Number.isFinite(props.have)&&Number.isFinite(props.need)&&props.have>=0&&props.need>=0&&maximum.value>0)
function position(n:number){return Math.max(0,Math.min(100,n/maximum.value*100))}
</script>
<template><div class="pair-measure" :aria-label="`${label??'数值对照'}：现状${have}，要求${need}`"><div class="pair-measure__labels"><span>现状 <strong>{{ have }}</strong></span><span>要求 <strong>{{ need }}</strong></span></div><div v-if="valid" class="pair-measure__scale" aria-hidden="true"><span class="pair-measure__fill" :style="{width:position(have)+'%'}"/><i class="pair-measure__have" :style="{left:position(have)+'%'}"/><i class="pair-measure__need" :style="{left:position(need)+'%'}"/></div><div v-if="valid" class="pair-measure__axis"><span>0</span><span>{{ maximum }}</span></div></div></template>

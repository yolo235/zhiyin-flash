<script setup lang="ts">
import UiIcon from './UiIcon.vue'
withDefaults(defineProps<{ title: string; description: string; kind?: 'chat' | 'notes' | 'intel' }>(), { kind: 'notes' })
</script>
<template><div class="exp-empty"><div class="studio-empty-object" :class="'studio-empty-object--'+kind" aria-hidden="true"><UiIcon :name="kind==='chat'?'chat':kind==='intel'?'search':'notes'" :size="32"/><span/><span/></div><h2>{{ title }}</h2><p>{{ description }}</p><div v-if="$slots.default" class="exp-empty__actions"><slot /></div></div></template>

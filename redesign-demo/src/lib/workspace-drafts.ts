import { reactive } from 'vue'

// Page navigation keeps unsubmitted drafts within the same account's memory.
// No service request or persistence is implied by this cache.
const notes = reactive<Record<string, { todo: string; goal: string }>>({})
export function noteDrafts(account: string) {
  if (!notes[account]) notes[account] = { todo: '', goal: '' }
  return notes[account]!
}

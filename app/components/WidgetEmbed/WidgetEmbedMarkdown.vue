<script setup lang="ts">
import DOMPurify from 'dompurify'
defineProps<{ text: string; variant?: 'chat' | 'article' }>()
const id = useId()
const sanitize = (html: string) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ['target'], FORBID_TAGS: ['style', 'form', 'input', 'button'] })
</script>

<template>
  <ClientOnly>
    <ThemedMdPreview :editor-id="id" :model-value="text" :sanitize="sanitize" :class="variant === 'article' ? 'widget-article-markdown' : 'widget-markdown'" />
    <template #fallback><span class="whitespace-pre-wrap">{{ text }}</span></template>
  </ClientOnly>
</template>

<style scoped>
.widget-markdown { background: transparent; color: inherit; font-size: inherit; font-family: inherit; }
.widget-markdown :deep(.md-editor-preview-wrapper) { padding: 0; color: inherit; }
.widget-markdown :deep(.md-editor-preview) { color: inherit; font-size: inherit; word-break: break-word; }
.widget-markdown :deep(.md-editor-preview p) { line-height: inherit; }
.widget-markdown :deep(.md-editor-preview ul) { list-style-type: disc; }
.widget-markdown :deep(.md-editor-preview ol) { list-style-type: decimal; }
.widget-markdown :deep(.md-editor-preview :is(ul, ol)) {
  margin-block: 0.4em;
  padding-inline-start: 1.4em;
}
.widget-markdown :deep(.md-editor-preview li) { margin-block: 0.2em; }
.widget-markdown :deep(.md-editor-preview li > :is(p, ul, ol)) { margin-block: 0.2em; }
.widget-markdown :deep(.md-editor-preview > :first-child) { margin-top: 0; }
.widget-markdown :deep(.md-editor-preview > :last-child) { margin-bottom: 0; }
.widget-markdown :deep(pre) { max-width: 100%; overflow-x: auto; }
</style>

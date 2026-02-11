<template>
  <img-viewer
    ref="viewerRef"
    :mode="mode"
    :readonly="readonly"
    :auto-play="autoPlay"
    :interval="interval"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import '@jacktea/img-viewer';
import type { ImageSource, ViewMode, ImgViewerElement } from '@jacktea/img-viewer';

interface Props {
  /** 图片来源列表 */
  sources?: ImageSource[];
  /** 预览模式 */
  mode?: ViewMode;
  /** 只读 */
  readonly?: boolean;
  /** 自动播放 */
  autoPlay?: boolean;
  /** 自动播放间隔 (ms) */
  interval?: number;
}

const props = withDefaults(defineProps<Props>(), {
  sources: undefined,
  mode: 'single',
  readonly: false,
  autoPlay: false,
  interval: 3000,
});

const emit = defineEmits<{
  'image-load': [detail: { index: number }];
  'image-error': [detail: { index: number; error: Error }];
  'image-change': [detail: { index: number }];
  'mode-change': [detail: { mode: ViewMode }];
}>();

const viewerRef = ref<ImgViewerElement>();

// 当 sources 变化时重新加载
watch(
  () => props.sources,
  (sources) => {
    if (sources && sources.length > 0 && viewerRef.value) {
      viewerRef.value.open(sources);
    }
  },
  { deep: true }
);

onMounted(() => {
  const el = viewerRef.value;
  if (!el) return;

  // 代理事件
  el.addEventListener('image-load', ((e: CustomEvent) => emit('image-load', e.detail)) as EventListener);
  el.addEventListener('image-error', ((e: CustomEvent) => emit('image-error', e.detail)) as EventListener);
  el.addEventListener('image-change', ((e: CustomEvent) => emit('image-change', e.detail)) as EventListener);
  el.addEventListener('mode-change', ((e: CustomEvent) => emit('mode-change', e.detail)) as EventListener);

  // 初始加载
  if (props.sources && props.sources.length > 0) {
    el.open(props.sources);
  }
});

onBeforeUnmount(() => {
  viewerRef.value?.destroy();
});

/** 暴露 Web Component 的方法 */
defineExpose({
  /** 获取底层 Web Component 实例 */
  getElement: () => viewerRef.value,
  /** 打开图片 */
  open: (sources: ImageSource[]) => viewerRef.value?.open(sources),
  /** 打开文件选择器 */
  openFileDialog: () => viewerRef.value?.openFileDialog(),
  /** 设置模式 */
  setMode: (mode: ViewMode) => viewerRef.value?.setMode(mode),
  /** 下载当前图片 */
  downloadCurrent: () => viewerRef.value?.downloadCurrent(),
});
</script>

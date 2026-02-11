/**
 * Vue 组件 Demo
 */
import { createApp, ref, h, defineComponent } from 'vue';
import { ImgViewer } from '@jacktea/img-viewer-vue';
import type { ImageSource, ViewMode } from '@jacktea/img-viewer';

const VueDemo = defineComponent({
  name: 'VueDemo',
  setup() {
    const sources = ref<ImageSource[]>([]);
    const mode = ref<ViewMode>('single');
    const readonly_ = ref(false);
    const viewerRef = ref<InstanceType<typeof ImgViewer>>();

    const loadMultiple = () => {
      sources.value = Array.from({ length: 6 }, (_, i) => ({
        type: 'url' as const,
        data: `https://picsum.photos/800/600?random=${i + 10}&t=${Date.now()}`,
        name: `Vue Photo ${i + 1}.jpg`,
      }));
    };

    const openLocal = () => {
      viewerRef.value?.openFileDialog();
    };

    return () =>
      h('div', {}, [
        h('div', { class: 'controls' }, [
          h('div', { class: 'control-group' }, [
            h('button', { class: 'btn btn-primary', onClick: openLocal }, '📂 打开本地文件'),
          ]),
          h('div', { class: 'control-group' }, [
            h('button', { class: 'btn', onClick: loadMultiple }, '🖼️ 加载多张图片'),
          ]),
          h('div', { class: 'control-group' }, [
            h('label', {}, '模式: '),
            h(
              'select',
              { onChange: (e: Event) => (mode.value = (e.target as HTMLSelectElement).value as ViewMode) },
              [
                h('option', { value: 'single' }, '单图'),
                h('option', { value: 'carousel' }, '轮播图'),
                h('option', { value: 'slideshow' }, '幻灯片'),
                h('option', { value: 'gallery' }, '相册'),
              ]
            ),
          ]),
          h('div', { class: 'control-group' }, [
            h('label', {}, [
              h('input', {
                type: 'checkbox',
                checked: readonly_.value,
                onChange: (e: Event) => (readonly_.value = (e.target as HTMLInputElement).checked),
              }),
              ' 只读模式',
            ]),
          ]),
        ]),
        h('div', { class: 'viewer-container' }, [
          h(ImgViewer, {
            ref: viewerRef,
            sources: sources.value,
            mode: mode.value,
            readonly: readonly_.value,
            autoPlay: false,
            onImageLoad: (d: { index: number }) => console.log('[Vue] image-load', d),
          }),
        ]),
      ]);
  },
});

export function mountVueDemo(container: HTMLElement) {
  const app = createApp(VueDemo);
  app.mount(container);
  return () => app.unmount();
}

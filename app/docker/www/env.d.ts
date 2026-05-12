/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'cal-heatmap' {
  export default class CalHeatmap {
    paint(options: object): CalHeatmap
    addPlugin(plugin: unknown, options?: object): CalHeatmap
    destroy(): void
  }
}

declare module 'cal-heatmap/plugins/Tooltip' {
  export default class Tooltip {
    constructor()
  }
}

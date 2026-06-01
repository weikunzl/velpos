import { ref, onMounted, onBeforeUnmount } from 'vue'

// 统一断点常量，CSS 与 JS 均以此为准
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
}

const isMobile = ref(false)
const isTablet = ref(false)

let mobileQuery = null
let tabletQuery = null

function onMobileChange(e) {
  isMobile.value = e.matches
}

function onTabletChange(e) {
  isTablet.value = e.matches
}

// 单例初始化：只在浏览器环境下注册一次
if (typeof window !== 'undefined') {
  mobileQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.mobile}px)`)
  tabletQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.tablet}px)`)
  isMobile.value = mobileQuery.matches
  isTablet.value = tabletQuery.matches
  mobileQuery.addEventListener('change', onMobileChange)
  tabletQuery.addEventListener('change', onTabletChange)
}

/**
 * 响应式视口断点 composable。
 * 使用 matchMedia 单例，多次调用不会重复注册监听器。
 *
 * @returns {{ isMobile: Ref<boolean>, isTablet: Ref<boolean> }}
 *   isMobile — 视口宽度 <= 768px
 *   isTablet — 视口宽度 <= 1024px
 */
export function useViewport() {
  return { isMobile, isTablet }
}

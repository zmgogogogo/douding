// ============================================
//  useImageCrop — 图片裁剪交互逻辑
//  拖拽移动 + 四角缩放 + 九宫格参考线
//  供 ImageImportView 和 OcrView 共用
// ============================================
import { ref, computed, reactive } from 'vue'

/**
 * @param {object} opts
 * @param {number} opts.imgW - 图片自然宽度
 * @param {number} opts.imgH - 图片自然高度
 * @param {number} opts.displayScale - 图片显示缩放比（img.style.scale）
 */
export function useImageCrop(opts = {}) {
  const imgW = ref(opts.imgW || 0)
  const imgH = ref(opts.imgH || 0)
  const displayScale = ref(opts.displayScale || 1)

  // 裁剪区域（相对于显示坐标系的像素值）
  const crop = reactive({ x: 0, y: 0, w: 0, h: 0 })

  // 拖拽/缩放状态
  const dragging = ref(false)
  const resizing = ref(null) // 当前缩放手柄 'nw'|'ne'|'sw'|'se'|null
  const dragStart = ref(null) // { x, y, cx, cy, cw, ch }

  /** 初始化裁剪区域（居中正方形，占图片短边 80%） */
  function initCrop() {
    const size = Math.min(imgW.value, imgH.value) * 0.8 * displayScale.value
    crop.w = size
    crop.h = size
    crop.x = (imgW.value * displayScale.value - size) / 2
    crop.y = (imgH.value * displayScale.value - size) / 2
  }

  /** 重新设置图片尺寸 */
  function setImageSize(w, h, scale = 1) {
    imgW.value = w
    imgH.value = h
    displayScale.value = scale
  }

  // ---- 裁剪手柄 ----
  const handles = computed(() => {
    if (!crop.w) return []
    return [
      { handle: 'nw', left: '0%', top: '0%', cursor: 'nwse-resize' },
      { handle: 'ne', left: '100%', top: '0%', cursor: 'nesw-resize' },
      { handle: 'sw', left: '0%', top: '100%', cursor: 'nesw-resize' },
      { handle: 'se', left: '100%', top: '100%', cursor: 'nwse-resize' },
    ]
  })

  const cropStyle = computed(() => ({
    left: crop.x + 'px',
    top: crop.y + 'px',
    width: crop.w + 'px',
    height: crop.h + 'px',
  }))

  // ---- 拖拽移动裁剪框 ----
  function startDrag(e) {
    e.preventDefault()
    dragging.value = true
    dragStart.value = {
      x: e.clientX,
      y: e.clientY,
      cx: crop.x,
      cy: crop.y,
    }
    document.addEventListener('pointermove', onDragMove)
    document.addEventListener('pointerup', onDragEnd)
  }

  function onDragMove(e) {
    if (!dragging.value || !dragStart.value) return
    const dx = e.clientX - dragStart.value.x
    const dy = e.clientY - dragStart.value.y
    crop.x = Math.max(
      0,
      Math.min(imgW.value * displayScale.value - crop.w, dragStart.value.cx + dx)
    )
    crop.y = Math.max(
      0,
      Math.min(imgH.value * displayScale.value - crop.h, dragStart.value.cy + dy)
    )
  }

  function onDragEnd() {
    dragging.value = false
    dragStart.value = null
    document.removeEventListener('pointermove', onDragMove)
    document.removeEventListener('pointerup', onDragEnd)
  }

  // ---- 四角缩放 ----
  function startResize(e, handle) {
    e.preventDefault()
    e.stopPropagation()
    resizing.value = handle
    dragStart.value = {
      x: e.clientX,
      y: e.clientY,
      cx: crop.x,
      cy: crop.y,
      cw: crop.w,
      ch: crop.h,
    }
    document.addEventListener('pointermove', onResizeMove)
    document.addEventListener('pointerup', onResizeEnd)
  }

  function onResizeMove(e) {
    if (!resizing.value || !dragStart.value) return
    const dx = e.clientX - dragStart.value.x
    const dy = e.clientY - dragStart.value.y
    const { cx, cy, cw, ch } = dragStart.value
    const maxW = imgW.value * displayScale.value
    const maxH = imgH.value * displayScale.value
    const MIN = 20

    const h = resizing.value
    let nx = cx,
      ny = cy,
      nw = cw,
      nh = ch

    if (h.includes('e')) nw = Math.min(maxW - cx, Math.max(MIN, cw + dx))
    if (h.includes('w')) {
      nw = Math.max(MIN, cw - dx)
      nx = Math.min(cx + cw - MIN, cx + dx)
    }
    if (h.includes('s')) nh = Math.min(maxH - cy, Math.max(MIN, ch + dy))
    if (h.includes('n')) {
      nh = Math.max(MIN, ch - dy)
      ny = Math.min(cy + ch - MIN, cy + dy)
    }

    crop.x = Math.max(0, nx)
    crop.y = Math.max(0, ny)
    crop.w = nw
    crop.h = nh
  }

  function onResizeEnd() {
    resizing.value = null
    dragStart.value = null
    document.removeEventListener('pointermove', onResizeMove)
    document.removeEventListener('pointerup', onResizeEnd)
  }

  /** 获取原始图片坐标系下的裁剪参数 */
  function getOriginalCrop() {
    const s = displayScale.value
    if (s <= 0) return { x: 0, y: 0, w: 0, h: 0 }
    return {
      x: Math.round(crop.x / s),
      y: Math.round(crop.y / s),
      w: Math.round(crop.w / s),
      h: Math.round(crop.h / s),
    }
  }

  /** 清理 */
  function destroy() {
    document.removeEventListener('pointermove', onDragMove)
    document.removeEventListener('pointerup', onDragEnd)
    document.removeEventListener('pointermove', onResizeMove)
    document.removeEventListener('pointerup', onResizeEnd)
  }

  return {
    crop,
    cropStyle,
    handles,
    dragging,
    resizing,
    initCrop,
    setImageSize,
    startDrag,
    startResize,
    getOriginalCrop,
    destroy,
  }
}

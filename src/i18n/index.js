/**
 * 国际化框架 — 中/英/日三语
 *
 * 设计：
 * - 文案外置，模块化管理
 * - Vue 响应式，切换语言自动更新
 * - 日期/数字本地化
 */

import { ref, computed } from 'vue'

// 模块级单例
const currentLocale = ref(loadLocale())

function loadLocale() {
  const saved = localStorage.getItem('douding-locale')
  if (saved && ['zh', 'en', 'ja'].includes(saved)) return saved
  // 跟随浏览器语言
  const nav = navigator.language?.toLowerCase() || 'zh'
  if (nav.startsWith('en')) return 'en'
  if (nav.startsWith('ja')) return 'ja'
  return 'zh'
}

// ==================== 文案字典 ====================

const messages = {
  zh: {
    // 通用
    app_name: '豆丁',
    app_desc: '在线拼豆图纸设计工具',
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    close: '关闭',
    loading: '加载中...',

    // 编辑器
    editor_title: '拼豆编辑器',
    new_design: '新建图纸',
    brush: '画笔',
    eraser: '橡皮',
    fill: '填充',
    picker: '吸色',
    select: '选区',
    replace: '替换',
    move: '移动',
    line: '直线',
    rect: '矩形',
    circle: '圆形',
    text: '文字',
    gradient: '渐变',

    // 菜单
    menu_file: '文件',
    menu_edit: '编辑',
    menu_view: '视图',
    menu_image: '图像',
    menu_layer: '图层',
    menu_collab: '协作',
    menu_help: '帮助',

    // 导出
    export_png: '导出 PNG 图片',
    export_svg: '导出 SVG 矢量',
    export_pdf: '导出 PDF 图纸',
    export_json: '导出 JSON 数据',

    // 状态栏
    status_edit_mode: '编辑模式',
    status_guide_mode: '引导模式',
    status_total_beads: '颗豆子',
    status_colors: '色',

    // 图层面板
    layer_panel: '图层',
    color_panel: '颜色',
    swatch_panel: '色板',
    history_panel: '历史',
    properties_panel: '属性',
    blend_mode: '混合模式',
    opacity: '不透明度',
    add_layer: '新建图层',
    remove_layer: '删除图层',
    add_mask: '添加蒙版',
    edit_mask: '编辑蒙版',
    apply_mask: '应用蒙版',
  },

  en: {
    app_name: 'Douding',
    app_desc: 'Online Fuse Bead Pattern Designer',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    close: 'Close',
    loading: 'Loading...',

    editor_title: 'Bead Editor',
    new_design: 'New Design',
    brush: 'Brush',
    eraser: 'Eraser',
    fill: 'Fill',
    picker: 'Eyedropper',
    select: 'Select',
    replace: 'Replace',
    move: 'Move',
    line: 'Line',
    rect: 'Rectangle',
    circle: 'Circle',
    text: 'Text',
    gradient: 'Gradient',

    menu_file: 'File',
    menu_edit: 'Edit',
    menu_view: 'View',
    menu_image: 'Image',
    menu_layer: 'Layer',
    menu_collab: 'Collaborate',
    menu_help: 'Help',

    export_png: 'Export PNG',
    export_svg: 'Export SVG',
    export_pdf: 'Export PDF',
    export_json: 'Export JSON',

    status_edit_mode: 'Edit Mode',
    status_guide_mode: 'Guide Mode',
    status_total_beads: 'beads',
    status_colors: 'colors',

    layer_panel: 'Layers',
    color_panel: 'Colors',
    swatch_panel: 'Swatches',
    history_panel: 'History',
    properties_panel: 'Properties',
    blend_mode: 'Blend Mode',
    opacity: 'Opacity',
    add_layer: 'Add Layer',
    remove_layer: 'Delete Layer',
    add_mask: 'Add Mask',
    edit_mask: 'Edit Mask',
    apply_mask: 'Apply Mask',
  },

  ja: {
    app_name: 'ドウディン',
    app_desc: 'オンラインアイロンビーズデザインツール',
    save: '保存',
    cancel: 'キャンセル',
    confirm: '確認',
    delete: '削除',
    close: '閉じる',
    loading: '読み込み中...',

    editor_title: 'ビーズエディター',
    new_design: '新規作成',
    brush: 'ブラシ',
    eraser: '消しゴム',
    fill: '塗りつぶし',
    picker: 'スポイト',
    select: '選択',
    replace: '置換',
    move: '移動',
    line: '直線',
    rect: '長方形',
    circle: '円',
    text: 'テキスト',
    gradient: 'グラデーション',

    menu_file: 'ファイル',
    menu_edit: '編集',
    menu_view: '表示',
    menu_image: '画像',
    menu_layer: 'レイヤー',
    menu_collab: 'コラボ',
    menu_help: 'ヘルプ',

    export_png: 'PNG 書き出し',
    export_svg: 'SVG 書き出し',
    export_pdf: 'PDF 書き出し',
    export_json: 'JSON 書き出し',

    status_edit_mode: '編集モード',
    status_guide_mode: 'ガイドモード',
    status_total_beads: 'ビーズ',
    status_colors: '色',

    layer_panel: 'レイヤー',
    color_panel: 'カラー',
    swatch_panel: 'スウォッチ',
    history_panel: '履歴',
    properties_panel: 'プロパティ',
    blend_mode: '描画モード',
    opacity: '不透明度',
    add_layer: 'レイヤー追加',
    remove_layer: 'レイヤー削除',
    add_mask: 'マスク追加',
    edit_mask: 'マスク編集',
    apply_mask: 'マスク適用',
  },
}

// ==================== Composable ====================

export function useI18n() {
  function t(key, fallback) {
    const msg = messages[currentLocale.value]
    return msg?.[key] || fallback || key
  }

  function setLocale(locale) {
    if (['zh', 'en', 'ja'].includes(locale)) {
      currentLocale.value = locale
      localStorage.setItem('douding-locale', locale)
    }
  }

  function cycleLocale() {
    const locales = ['zh', 'en', 'ja']
    const idx = locales.indexOf(currentLocale.value)
    setLocale(locales[(idx + 1) % locales.length])
  }

  const localeLabels = { zh: '中', en: 'EN', ja: '日' }

  return {
    locale: currentLocale,
    t,
    setLocale,
    cycleLocale,
    localeLabel: computed(() => localeLabels[currentLocale.value]),
  }
}

// 非响应式快速翻译（用于工具函数中）
export function t(key, fallback) {
  return messages[currentLocale.value]?.[key] || fallback || key
}

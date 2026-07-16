// ============================================
//  useBeads — 珠子数据加载（组合式函数）
//  封装品牌/系列/颜色查询，避免各组件重复实现
// ============================================
import { ref, computed } from 'vue'
import API from '@/api/index.js'

// 全局珠子数据缓存（单例）
const beadData = ref([])
const loaded = ref(false)
const loading = ref(false)

export function useBeads() {
  /** 加载珠子颜色数据（仅首次调用时请求） */
  async function loadBeads() {
    if (loaded.value || loading.value) return beadData.value
    loading.value = true
    try {
      const res = await API.get('/api/beads/colors', false)
      beadData.value = res.data || []
      loaded.value = true
    } catch { beadData.value = [] }
    finally { loading.value = false }
    return beadData.value
  }

  /** 所有品牌列表 */
  const brands = computed(() => [...new Set(beadData.value.map(c => c.brand))])

  /** 指定品牌的系列列表 */
  function seriesForBrand(brand) {
    return [...new Set(beadData.value.filter(c => c.brand === brand).map(c => c.series))]
  }

  /** 指定品牌+系列的扁平颜色列表 */
  function colorsForSeries(brand, series) {
    return beadData.value.filter(c => c.brand === brand && c.series === series)
  }

  /** 查找指定 hex 的珠子颜色 */
  function findColor(hex) {
    return beadData.value.find(c => c.hex.toUpperCase() === hex.toUpperCase())
  }

  /** 查找指定名称的珠子颜色 */
  function findColorByName(name) {
    return beadData.value.find(c => c.name === name)
  }

  return {
    beadData,
    loaded,
    loading,
    loadBeads,
    brands,
    seriesForBrand,
    colorsForSeries,
    findColor,
    findColorByName
  }
}

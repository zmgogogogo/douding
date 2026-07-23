<!-- 404 页面 -->
<template>
  <div class="flex items-center justify-center h-full bg-slate-50">
    <div class="text-center">
      <div class="text-6xl font-extrabold text-slate-300 mb-4">404</div>
      <h2 class="text-lg font-bold text-slate-700 mb-2">页面未找到</h2>
      <p class="text-sm text-slate-500 mb-4">你访问的页面不存在或已被移除</p>
      <button
        class="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
        @click="$router.push('/')"
      >
        返回首页
      </button>
    </div>
  </div>
</template>

<!-- 占位页面 — 功能开发中 -->
<template>
  <div class="flex items-center justify-center h-full bg-slate-50">
    <div class="text-center">
      <div class="text-5xl mb-4">🚧</div>
      <h2 class="text-lg font-bold text-slate-700 mb-2">功能开发中</h2>
      <p class="text-sm text-slate-500">该功能即将上线，敬请期待</p>
      <button
        class="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
        @click="$router.push('/')"
      >
        返回首页
      </button>
    </div>
  </div>
</template>

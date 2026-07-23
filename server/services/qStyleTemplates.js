// ============================================
//  Q 版拼豆风格模板配置
//  5 种内置风格，配置化可扩展
// ============================================

export const Q_STYLE_TEMPLATES = [
  {
    style_id: 'q_big_head',
    style_name: 'Q版大头头像',
    description: '大头小身比例，圆润可爱，大眼睛，带黑色描边，扁平化色块',
    tags: ['头像', '钥匙扣', '冰箱贴'],
    cover_image: '/assets/qstyles/big_head.png',
    recommend_size: [80, 80],
    difficulty: '简单',
    estimate_beads: '600-800',
    ai_prompt:
      'Q版卡通头像，大头小身比例，圆润可爱，大眼睛，清晰黑色轮廓描边，扁平化插画风格，纯色块，无渐变阴影，背景纯白色，保留人物发型和五官特征，适合像素化',
    ai_negative_prompt: '照片写实，复杂背景，渐变，光影，皱纹，皮肤纹理，模糊，噪点，多人物',
    bean_algorithm_params: {
      denoise_type: 'bilateral',
      denoise_intensity: 'medium',
      k_means_color: 16,
      region_segment: true,
      dithering: false,
      interpolation: 'nearest',
      prefilter: true,
      crisp: true,
      post_process: {
        connect_area_threshold: 4,
        morphology_open: true,
        contour_boost: true,
      },
    },
  },
  {
    style_id: 'cute_sticker',
    style_name: '可爱贴纸风',
    description: '粗黑边、高饱和、纯色块、无阴影，像卡通贴纸一样干净利落',
    tags: ['徽章', '挂件', '简约摆件'],
    cover_image: '/assets/qstyles/sticker.png',
    recommend_size: [70, 70],
    difficulty: '简单',
    estimate_beads: '400-600',
    ai_prompt:
      '卡通贴纸风格，粗黑色外轮廓描边，高饱和明亮颜色，纯色块填充，完全无阴影渐变，造型简洁可爱，白色背景，边缘清晰利落',
    ai_negative_prompt: '写实，复杂细节，渐变，光影，纹理，模糊，半透明',
    bean_algorithm_params: {
      denoise_type: 'bilateral',
      denoise_intensity: 'high',
      k_means_color: 12,
      region_segment: false,
      dithering: false,
      interpolation: 'nearest',
      prefilter: true,
      crisp: true,
      post_process: {
        connect_area_threshold: 5,
        morphology_open: true,
        contour_boost: true,
      },
    },
  },
  {
    style_id: 'simple_line',
    style_name: '简约线条风',
    description: '低饱和度、柔和配色、细描边、极简细节，高级感强',
    tags: ['装饰画', '桌面摆件', '高级感'],
    cover_image: '/assets/qstyles/simple.png',
    recommend_size: [100, 100],
    difficulty: '中等',
    estimate_beads: '800-1200',
    ai_prompt:
      '简约扁平插画，低饱和度莫兰迪配色，细黑色线条，少细节，大面积纯色块，柔和干净，无复杂光影，极简风格',
    ai_negative_prompt: '写实，高饱和，复杂花纹，渐变，噪点，纹理',
    bean_algorithm_params: {
      denoise_type: 'guided',
      denoise_intensity: 'low',
      k_means_color: 20,
      region_segment: true,
      dithering: false,
      interpolation: 'nearest',
      prefilter: false,
      crisp: true,
      post_process: {
        connect_area_threshold: 3,
        morphology_open: false,
        contour_boost: false,
      },
    },
  },
  {
    style_id: 'pet_cute',
    style_name: '萌宠专属风',
    description: '强化五官和毛发特征，简化复杂毛发，圆润化脸型，保留毛色特点',
    tags: ['宠物', '猫狗定制', '宠物纪念'],
    cover_image: '/assets/qstyles/pet.png',
    recommend_size: [90, 90],
    difficulty: '简单',
    estimate_beads: '700-900',
    ai_prompt:
      'Q版可爱宠物，圆润脸型，大眼睛，简化毛发，清晰黑色描边，纯色块，保留宠物毛色和品种特征，无复杂毛发纹理，背景简洁',
    ai_negative_prompt: '真实毛发，复杂纹理，渐变光影，脏乱背景，写实照片',
    bean_algorithm_params: {
      denoise_type: 'bilateral',
      denoise_intensity: 'medium',
      k_means_color: 18,
      region_segment: true,
      dithering: false,
      interpolation: 'nearest',
      prefilter: true,
      crisp: true,
      post_process: {
        connect_area_threshold: 4,
        morphology_open: true,
        contour_boost: true,
      },
    },
  },
  {
    style_id: 'couple_double',
    style_name: '情侣双人风',
    description: '双人物构图，简化背景，强化人物特征，造型互动感强',
    tags: ['情侣', '礼物', '纪念日'],
    cover_image: '/assets/qstyles/couple.png',
    recommend_size: [120, 100],
    difficulty: '中等',
    estimate_beads: '1200-1800',
    ai_prompt:
      'Q版情侣双人形象，大头小身，可爱互动造型，清晰黑色描边，扁平化色块，保留两个人物外貌特征，背景简洁纯色，适合像素化',
    ai_negative_prompt: '写实，复杂背景，多人，渐变光影，皮肤纹理，模糊',
    bean_algorithm_params: {
      denoise_type: 'bilateral',
      denoise_intensity: 'medium',
      k_means_color: 24,
      region_segment: true,
      dithering: false,
      interpolation: 'nearest',
      prefilter: true,
      crisp: true,
      post_process: {
        connect_area_threshold: 4,
        morphology_open: true,
        contour_boost: true,
      },
    },
  },
]

/**
 * 根据 style_id 获取风格参数
 */
export function getStyleById(styleId) {
  return Q_STYLE_TEMPLATES.find((s) => s.style_id === styleId) || null
}

/**
 * 获取所有风格列表（去掉敏感字段）
 */
export function getStyleList() {
  return Q_STYLE_TEMPLATES.map((s) => ({
    style_id: s.style_id,
    style_name: s.style_name,
    description: s.description,
    tags: s.tags,
    recommend_size: s.recommend_size,
    difficulty: s.difficulty,
    estimate_beads: s.estimate_beads,
  }))
}

/**
 * 根据风格参数生成图片处理选项
 */
export function buildImageOptionsFromStyle(styleId) {
  const style = getStyleById(styleId)
  if (!style) return {}

  const p = style.bean_algorithm_params
  return {
    prefilter: p.prefilter !== false,
    crisp: p.crisp !== false,
    dither: p.dithering ? 'true' : 'false',
    segmentation: p.region_segment ? 'true' : 'false',
    raw: 'false',
  }
}

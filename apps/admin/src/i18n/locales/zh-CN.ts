/* ============================================================
 * P0-15 · 中文文案（zh-CN）
 * 所有组件内不硬编码中文，统一从此处引用
 * ============================================================ */

export default {
  common: {
    appName: 'Atlas 运营后台',
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    submit: '提交',
    reset: '重置',
    search: '搜索',
    edit: '编辑',
    delete: '删除',
    create: '新建',
    batchDelete: '批量删除',
    operation: '操作',
    status: '状态',
    loading: '加载中...',
    empty: '暂无数据',
    success: '操作成功',
    failed: '操作失败',
    required: '此项必填',
  },
  menu: {
    workbench: '工作台',
    novel: '作品管理',
    novelList: '作品列表',
    chapter: '章节管理',
    audit: '内容审核',
    user: '用户管理',
    userList: '读者列表',
    author: '作者管理',
    permission: '角色权限',
    system: '系统设置',
  },
  novel: {
    list: {
      title: '作品管理',
      searchPlaceholder: '搜索作品名称 / 作者',
      batchOffline: '批量下架',
      batchOnline: '批量上架',
    },
    status: {
      draft: '草稿',
      pending: '待审核',
      published: '已上架',
      offline: '已下架',
    },
  },
  chapter: {
    title: '章节管理',
    wordCount: '字数',
    pureWord: '纯文字',
    withPunctuation: '含标点',
  },
  audit: {
    title: '内容审核',
    approve: '通过',
    reject: '驳回',
    revise: '修订',
    rejectReason: '驳回原因',
    rejectReasonRequired: '请填写驳回原因（不少于 10 字）',
  },
  royalty: {
    title: '稿费管理',
    total: '累计稿费',
    monthly: '本月稿费',
    pending: '待结算',
  },
  permission: {
    title: '角色权限',
    assign: '分配权限',
  },
  error: {
    loginFailed: '登录失败，请检查用户名和密码',
    sessionExpired: '会话已过期，请重新登录',
    forbidden: '抱歉，您没有权限访问此页面',
    notFound: '抱歉，您访问的页面不存在',
    serverError: '服务器开小差了，请稍后重试',
  },
} as const;

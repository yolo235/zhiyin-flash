---
name: 职引 · 来源、记录与下一步
description: 方案1实际Vue工作区；保留原门户，以来源、连续记录和真实操作组织学生生涯任务。
colors:
  primary: "#154494"
  primary-hover: "#113a7d"
  primary-active: "#0d2e63"
  primary-weak: "#eff3fa"
  primary-border: "#c3d1e9"
  attention: "#96000e"
  attention-strong: "#7d000c"
  attention-weak: "#fdf7f4"
  studio-ground: "#f4f5f9"
  studio-paper: "#ffffff"
  studio-wash: "#edf0f6"
  studio-line: "#dce1e9"
  source-on: "#e2eaf9"
  source-next: "#e9ecf3"
  red-source-on: "#f6e0e4"
  text: "#1e232c"
  text-secondary: "#4b5157"
  text-muted: "#61666b"
  border-strong: "#cfd3d6"
  neutral-fill: "#ebedf2"
  portal-ground: "#f9f8f8"
  dark-studio-ground: "#181a1f"
  dark-studio-paper: "#22252b"
  dark-studio-wash: "#2a2e35"
  dark-studio-line: "#41464f"
  dark-source-next: "#2c3038"
  dark-on-primary: "#151517"
  dark-text: "#f9fafb"
  dark-text-secondary: "#cfd3d6"
  dark-text-muted: "#adb2b8"
  dark-primary: "#6e93c9"
  dark-attention: "#d98a92"
typography:
  headline:
    fontFamily: "'Noto Sans SC Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Source Han Sans SC', 'Noto Sans CJK SC', sans-serif"
    fontSize: "34px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title:
    fontSize: "20px"
    lineHeight: 1.5
  source-value:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif"
    fontSize: "24px"
    fontWeight: 650
    lineHeight: 1.7
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Source Han Sans SC', 'Noto Sans CJK SC', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.8
  control:
    fontSize: "14px"
    fontWeight: 500
  label:
    fontSize: "12px"
rounded:
  sm: "6px"
  source-control: "7px"
  md: "8px"
  field: "10px"
  source-surface: "12px"
  inherited-workspace-lg: "14px"
  pill: "999px"
spacing:
  sp-1: "4px"
  sp-2: "8px"
  sp-3: "12px"
  sp-4: "16px"
  sp-5: "20px"
  sp-6: "24px"
  sp-7: "32px"
  sp-8: "40px"
  sp-9: "56px"
  sp-10: "72px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.studio-paper}"
    typography: "{typography.control}"
    rounded: "{rounded.source-control}"
    padding: "9px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
  button-secondary:
    backgroundColor: "{colors.studio-paper}"
    textColor: "{colors.text}"
    rounded: "{rounded.source-control}"
    padding: "9px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.source-control}"
    padding: "9px 16px"
  field:
    backgroundColor: "{colors.studio-wash}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "11px 13px"
  card:
    backgroundColor: "{colors.studio-paper}"
    rounded: "{rounded.source-surface}"
    padding: "26px"
  chip-primary:
    backgroundColor: "{colors.primary-weak}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  navigation-active:
    backgroundColor: "{colors.primary-weak}"
    textColor: "{colors.primary}"
    rounded: "{rounded.source-control}"
  source-evidence:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.studio-paper}"
    padding: "26px 24px"
  selected-record:
    backgroundColor: "{colors.primary-weak}"
    textColor: "{colors.text}"
    padding: "18px 13px"
  composer:
    backgroundColor: "{colors.studio-paper}"
    rounded: "{rounded.source-surface}"
    padding: "16px 20px 12px"
---

# Design System: 职引 · 来源、记录与下一步

## Overview

**Creative North Star: "来源、记录与下一步"**

用户于2026-10-13明确选择方案1，并要求保留之前的门户。当前文档记录真实Vue工程已实施的工作区：选中实际记录时，原始来源与可做的下一步在旁边回应；其他页面按各自任务组织。方案选择是方向授权，不等于用户已接受落地成品。静态 tonal 草图和 one.html 是方向参照，未获授权作为像素规格。

连续白色阅读面承载事实与长文，灰色区域承载相关说明和下一步，品牌强调面承载真实来源、关键依据或阶段。导航保留白灰底，深色仍用中性表面。鲜活感来自记录切换、附件到达、任务移位、按压与页面到达等操作反馈，减少动效时停止这些效果。

门户保持现有 PortalView / PortalProposal / PortalClassic、原版/新版入口及原构图。新工作区与既有样式层并存，以最后导入的 source-workspace.css 覆盖其作用范围；frontmatter是默认浅色、蓝强调、plain的真实常用值，主题和局部覆盖以源码为准。旧被否决候选的视觉规范由本文刷新，历史审查及产品边界继续保留于 [PRODUCT.md](PRODUCT.md)。

**Key Characteristics:**

- 来源、连续记录与下一步具有实际对应关系。
- 白灰导航、中性浅深工作面与可切换蓝红强调。
- 沿用本地中文标题，业务正文和输入保持16px。
- 各业务采用对象合适的构图，共享输入、按钮、导航与状态。
- 操作触发的反馈与来源可核对，未知、示例和服务结果保持可辨认。

## Colors

### Primary

校徽采样蓝用于默认主操作、当前记录、链接及来源面；官网实际用红可切换为强调色。此处记录既有来源，不把采样值称为已核验官方VI。蓝红均以 `--c-primary` 和 `--c-on-primary` 配对，来源面次级字使用 `--source-on`。

### Neutral

工作底、阅读白、关联灰、分隔线和下一步灰来自 source-workspace.css。深色工作区采用 frontmatter 的 dark-studio-* 值；正文仍继承 tokens.css 的语义文字层。`portal-ground`记录既有门户值，不能将新工作底推广到门户。

**The 配对前景 Rule.** 深色来源、报告依据与学籍强调面的次级字继承 `--c-on-primary`；不能沿用浅色模式的亮来源字。深色声明位于红声明之后，蓝/红均覆盖。

**The 状态有文字 Rule.** 风险与缺口使用红，完成与中性使用灰；状态同时提供文字、图标或位置，不只靠色相。

## Typography

**Display Font:** 沿用自托管 Noto Sans SC Variable 与平台回退；未新增字体。**Body Font:** 既有平台中文系统栈。技术值按原 `--font-mono` 使用，不将等宽或像素字体引入学生正文。

### Hierarchy

- **Headline:** 普通工作页标题使用 frontmatter 的 headline；手机普通页为29px。咨询头部保留专用30px/700与手机、短高度覆盖，并非全部标题统一放大。
- **Title:** 共用节标题20px；来源/下一步标题21px，主题档案22px，主题小节18px。
- **Source value:** 原始引用24px/650；≤1150px为22px，手机18px。选中记录桌面22px，其他记录16px。
- **Body:** 业务阅读、表格主体、资料、任务、风险和输入16px。新重点连续正文行高1.8；既有普通正文1.7和阅读面1.85仍保留。
- **Control / Label:** 控件14px与来源/时间12–14px分工。紧凑密度不以缩小业务正文换取条数。

**The 原文可读 Rule.** 真实内容决定层级，原始依据与本人更正并存；不用装饰性小标或假数值替代阅读内容。

## Layout

桌面侧栏226px；收起时主区左距归零。普通工作页最大1460px、内距30px 34px 54px；咨询最大1340px、回复连续面最大830px。手机普通页内距22px 18px 100px，咨询13px 16px 12px；安全区及既有短屏输入台规则继续由原层负责。

画像工作台为来源220px / 弹性记录 / 下一步200px，来源在桌面sticky top80px。≤1150px来源横跨顶部，记录与220px下一步并列；≤760px转为来源→记录→下一步顺序，原生16px选择器只提供当前筛选可见记录。报告连续章节、方向连续候选与风险、行动当前任务与阶段、日历日期和课程节次均保留各自结构，不强制套画像三栏。

4px基数间距阶梯来自 tokens.css，soft/dense覆盖既有间距与行高。新工作区的7px控件、12px工作面及显式尺寸有自己的覆盖，因此外观偏好并不等于所有局部值随密度改变。

样式入口实际顺序：tokens → heading-font → base → workspace → experience → journey → redesign → studio → business-studio → conversation-studio → source-workspace。退役 dialogue.css 未导入。App.vue仅在非bare页添加 `app--workspace`；新层的工作区、source-*及studio-chat规则与门户分离，sheet规则保留现有弹层共享样式。两个门户版本启用/禁用新层像素相等是既有受控测试证据。

## Elevation & Depth

新工作面采用连续表面和分隔线：`--studio-lift:none`，来源/下一步用明暗和颜色分工，记录与章节不逐条抬升。对话的用户内容仍以灰底区别，回复保持连续阅读。继承按钮悬停轻影、popover/dialog遮罩和必要阴影仍存在；“新工作面无投影”不意味着全站所有浮层都没有阴影。

**The 连续阅读 Rule.** 表面按任务分区，行和段落靠真实标题、分隔线与留白组织，避免每个字段形成等重卡片。

## Shapes

工作区按钮与导航使用小角（7px），输入沿用10px，新的大工作面12px、头像8px、附件6px。记录、章节、阶段和资讯内部行保持直边与底部分隔线。原 `--r-md:10px`、`--r-lg:14px`等变量仍服务未被新层覆盖的部件，不能误写为全部新部件形态。门户使用原形态。

## Components

### Buttons / Navigation

主操作采用语义强调底和配对前景，默认内距9px 16px、最小高度42px；局部回复工具和手机来源动作有更紧凑高度。悬停继承主色hover/active；新按压为translateY(1px) scale(.98)，颜色和边框180ms。键盘焦点沿用2px语义主色轮廓。导航当前页为弱强调底，分组、历史、更多、唯一账号及侧栏状态保留。

### Inputs / Composer

字段采用关联灰底、工作区分隔线、10px角、11px 13px内距、最小46px高；正文与输入16px。焦点沿用2px轮廓。咨询输入台为连续白面、12px角、分隔工具行和真实材料入口；focus-within改变边框。附件加入有到达反馈，材料按实际通道能力显示，不能通过样式宣称已解析或上传。

### Source / Selected record

来源面显示所选字段的原始值、来源、时间、把握与证据；本人更正另行显示。`activeField`、同步watch、手机options均以 `visible` 为范围：筛选后保留仍可见选择，否则选首条；零结果隐藏旧来源和选择器，提供“查看全部信息”或咨询入口。来源说明可展开，缺口逐条链接下一步；汇总及整体分析位于工作台后。

### Records / Drafts

待办与目标使用独立tabs和连续记录；新增、去重、完成恢复、删除确认、建议采纳拒绝保留。workspace-drafts.ts 按 `demo.state.account` 缓存两类型独立未提交文本，跨路由保留于本次页面运行内存。该缓存没有服务请求、localStorage或跨刷新/设备持久化承诺；保存由现有demo/service逻辑处理。

### Business surfaces / States

报告保留15维、证据、版本、方法和打印；方向候选与本人确认分离；阶段计数来自实际关联任务；日历和课程不把空课当可用时间；学籍材料先核对后确认。复盘时间线来自实际行动，资讯保持原文、日期与同指标对比。通用sheet、登录、加载、空白、错误、成功、工具、指南、规范及未知地址入口继续存在，错误保留输入和旧内容，失败不能冒充示例成功。

### Motion / Responsive / Print

新曲线为 `cubic-bezier(.16,1,.3,1)`：记录切换opacity180ms/transform300ms，来源连线450ms；页面进入transform/clip300ms、离开opacity100ms；任务移动320ms、进入/离开transform260ms/opacity180ms；附件280ms，完成反馈360ms。它们解释刚发生的操作，未新增动画依赖或持续装饰循环。

系统 `prefers-reduced-motion:reduce` 关闭工作区及伪元素动画/过渡并恢复即时滚动；`html[data-motion=reduced|reduce]`保留显式减少动效选择。原弹层、流式文本和短屏规则由既有层负责；源码存在不等于所有偏好组合已实测。打印取消来源/下一步强调底与sticky，隐藏来源操作，报告既有打印处理继续有效。

## Do's and Don'ts

### Do:

- **Do** 保留现有门户两版本与原入口，新视觉规则限定实际工作区。
- **Do** 用来源、连续记录与下一步表达真实对应关系，让业务对象决定构图。
- **Do** 保持16px业务阅读和输入，沿用已有中文标题字体与蓝红灰语义。
- **Do** 同时保留原始依据与本人更正，筛选零结果提供明确恢复入口。
- **Do** 让动效响应操作并尊重减少动效，明确示例、未知与实际服务回包。

### Don't:

- **Don't** 将画像三面分工、静态方向原型或被否决旧构图当作全页像素规格。
- **Don't** 加入行业照片、像素字体、虚假评分、解析、核验、实时职位或自动重算声明。
- **Don't** 把内存草稿写成服务保存或跨刷新持久化，把空课写成可用时间。
- **Don't** 把方向选择、技术QA数量或仅两项修正的SHIP写成用户接受全站或生产后端通过。

文档来源为当前代码与已存在证据；没有重跑浏览器、构建、detector或服务测试。新审查两项均resolved，SHIP仅限该两项修正；完整13×8映射、实图来源和证据边界见 [方案1落地说明](design-review/visual-redesign-2026-10-13/方案1落地说明.md)。旧层的字体/色彩注释与实现漂移仅在此注明，不进行范围外代码修复。

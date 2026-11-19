window.__ModuleLoader__.load({
  id: '@local/skills-inspector',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useCallback } = React;

    const API = '/api/skills-inspector';
    const DEFAULT_LANG = 'zh';

    // 每个技能的中文对照：悬停翻译气泡里显示
    const TRANSLATIONS = {
      'agent-browser': { name: '浏览器自动化', desc: '给智能体用的浏览器自动化命令行工具：打开网页、填表单、点按钮、截图、抓取数据、测试网页，或自动化任何浏览器任务；也能操作 Electron 桌面应用（VS Code、Slack、Discord、Figma 等）、查 Slack 未读、发消息、在 Vercel 微VM 或 AWS Bedrock 云浏览器里跑自动化。做探索性测试、QA、查 bug、评审界面质量时优先用它。' },
      'agent-handoff': { name: '跨会话交接', desc: '跨平台（Codex、Claude Code、DeepSeek Harness）的仓库交接技能：创建、更新、压缩、轮换、修复和审查持久化的交接文档（AGENT_HANDOFF.md 等），管理跨会话记忆、AGENTS.md 规则和交接质量。' },
      'agent-experience': { name: '智能体经验', desc: '编写或修改面向模型的工具定义（名称、描述、参数结构、系统提示词段落），以及设计技能、上下文加载和多步骤工作流，让信息更容易被发现。' },
      'arill-me': { name: 'Arill 助手', desc: '本机新增的技能（arill-me），用于相关的辅助任务；英文原名见标题，完整说明可看右侧原文。' },
      'domain-modeling': { name: '领域建模', desc: '构建和打磨项目的领域模型：讨论代码库术语、编写或修改 GLOSSARY.md 术语表，以及记录和编辑 ADR 架构决策记录。' },
      'grilling': { name: '拷问式评审', desc: '对计划、决策或想法进行 relentless（不留情面）的追问式压力测试；当用户想压力测试自己的思路，或用 grill 类触发词时加载。' },
      'grill-me': { name: '拷问我', desc: '对用户进行追问式拷问/压力测试的辅助技能（grill-me），用于反复质疑和验证想法。' },
      'grill-with-docs': { name: '带文档拷问', desc: '结合文档内容对用户进行追问式拷问与评审的技能，用于依据文档压力测试计划或决策。' },
      'improve-codebase-architecture': { name: '改进代码架构', desc: '分析和改进代码库架构：重构、分层、解耦与架构治理相关的辅助技能。' },
      'triage': { name: '问题分诊', desc: '对问题、缺陷或任务进行分类分诊（triage）：判断优先级、归类与处理路径。' },
      'compshare-cli': { name: 'CompShare 云显卡', desc: '用命令行管理 GPU 云资源，以及 MiniMax H3 的视频、图片、语音任务：安装配置、查显卡规格库存、看价格、创建管理实例、SSH 连接、传文件、跑远程任务等。' },
      'cordis-composition-reference': { name: 'Cordis 组合参考', desc: '编写或阅读本框架的 Cordis 补丁和智能体预设时用；需要 Loader 的 YAML 语法（insert、override、group、disabled、isolate、!!js）或可安装插件包清单。' },
      'cordis-plugin-development': { name: 'Cordis 插件开发', desc: '设计、审查、添加、启用、禁用、安装、配置和调试当前配置里的插件、bundle、功能、页面、面板、工具或 MCP 连接，包括默认关闭的插件。' },
      'editing-cordis-compositions': { name: '编辑 Cordis 组合', desc: '创建、修改或校验智能体预设或 Cordis 组合，包括决定放在宿主还是预设层，以及检查写好的预设能否挂载。' },
      'find-skills': { name: '查找技能', desc: '当用户问「怎么做某件事」「找个能做某事的技能」或想扩展能力时，帮他发现并安装智能体技能。' },
      'hindsight-coding-agent': { name: '后见编码记忆', desc: '本机的 Hindsight 编码智能体记忆——就是 🧠 横幅背后的插件。用户说「记到 hindsight」、问记忆或页面是什么、要配置按仓库记忆时加载。' },
      'impeccable': { name: '界面设计大师', desc: '设计、重构、打磨、评审、优化前端界面：网站、落地页、仪表盘、产品 UI、组件、表单、设置、引导页等。' },
      'office': { name: 'Office 文档', desc: '创建、编辑、查看或转换 Office 文档、表格、演示文稿和 PDF；加载后选择对应工作流。' },
      'office-docx': { name: 'Word 文档', desc: '创建、读取、编辑和校验 Word 文档（.docx）。' },
      'office-export-pdf': { name: '导出 PDF', desc: '用 LibreOffice Kit 把 Office 文档转换成指定的 PDF。' },
      'office-pptx': { name: 'PowerPoint 演示', desc: '创建、读取、编辑和校验 PowerPoint 演示文稿（.pptx）。' },
      'office-recalculate': { name: '表格重算', desc: '用 LibreOffice Kit 刷新电子表格公式缓存并校验计算值。' },
      'office-render': { name: '文档渲染', desc: '用 LibreOffice Kit 渲染指定的文档图片或检查可视布局。' },
      'office-xlsx': { name: 'Excel 表格', desc: '读取、创建、编辑和校验 Excel 工作簿、数据和公式（.xlsx）。' },
      'popo-evasion': { name: '破破免杀', desc: '免杀、EDR 绕过、杀软对抗、AMSI patch、ETW bypass、直接 syscall、shellcode 加载器、进程注入、unhook、C2 框架、流量伪装、反虚拟机、反调试、反沙箱等。' },
      'popo-pentest': { name: '破破渗透工具', desc: 'Web 安全和渗透测试技能包（小迪安全培训提炼），含漏洞扫描、信息收集、SQL 注入、文件上传、XSS、SSRF、RCE、反序列化、JWT、弱口令爆破等 13 个知识库。' },
      'popo-reverse': { name: '破破逆向', desc: '逆向工程、反汇编、反编译、脱壳、反混淆、授权校验绕过、注册机、DRM 分析、二进制分析、Frida hook、IDA/Ghidra 脚本、补丁制作等。' },
      'popo-social': { name: '破破社工', desc: '社会工程学、钓鱼套件、落地页、投递脚本、BEC 话术、合成身份、话术设计、OSINT 信息收集、目标画像等。' },
      'ui-ux-pro-max': { name: 'UI/UX 设计智能', desc: '网页、移动端和桌面端的 UI/UX 设计智能；设计、构建、评审或修复界面（页面、组件、设计系统、无障碍、交互、响应式布局、排版、配色、图表）时加载。' },
    };

    // 「怎么用」栏目：每个技能的大白话教程 + 可直接复制给 AI 的话术
    const HOWTO = {
      'agent-browser': { what: '让 AI 帮你操作网页：打开网站、点按钮、填表、截图、抓数据、测网页。', steps: ['先告诉我网址和要做什么', 'AI 会自己打开浏览器操作', '做完把结果/截图给你'], script: '用 agent-browser 打开 <网址>，帮我<做什么>，做完把结果和截图给我。' },
      'agent-handoff': { what: '换会话/换电脑时，把项目记忆打包带走，新会话接着干不丢上下文。', steps: ['告诉我"做个交接"', 'AI 生成 AGENT_HANDOFF.md', '新会话让我读这个文件接着干'], script: '用 agent-handoff 给当前项目做一份交接文档，写清进度、关键决策和下一步。' },
      'agent-experience': { what: '优化给 AI 用的工具说明和技能写法，让 AI 更懂怎么调用工具。', steps: ['把工具定义或技能发给 AI', '让它按最佳实践改', '确认改完更清楚'], script: '用 agent-experience 帮我检查并改进这个工具定义，让它更清楚、AI 更容易调用。' },
      'arill-me': { what: 'Arill 相关的辅助技能，具体用看右侧原文。', steps: ['直接说你要做什么', 'AI 判断要不要用它'], script: '用 arill-me 帮我处理：<你的需求>。' },
      'domain-modeling': { what: '整理项目里的术语和架构决策，写成术语表(GLOSSARY)和决策记录(ADR)。', steps: ['说"整理一下领域模型"', 'AI 梳理术语和决策', '生成/更新 GLOSSARY.md 和 ADR'], script: '用 domain-modeling 帮我整理这个项目的核心术语，写进 GLOSSARY.md。' },
      'grilling': { what: '让 AI 像面试官一样不停追问你的计划，帮你找出漏洞。', steps: ['把你的计划/想法发出来', '说"拷问我"', 'AI 会一直追问，你逐一回答'], script: '用 grilling 压力测试我的这个计划，不停追问，直到没有漏洞：<你的计划>。' },
      'grill-me': { what: '追问模式，让 AI 反复质疑你的想法，逼你想清楚。', steps: ['说出你的想法', '让它开拷问', '回答它的追问'], script: '用 grill-me 拷问我，把我的想法问到没有死角：<你的想法>。' },
      'grill-with-docs': { what: '边看文档边拷问，用文档里的内容来质疑你的方案。', steps: ['给 AI 文档', '说"按文档拷问我"', 'AI 引文档追问'], script: '用 grill-with-docs 结合这份文档拷问我的方案：<文档/路径>。' },
      'improve-codebase-architecture': { what: '让 AI 检查代码架构，给出重构和解耦建议。', steps: ['说"看看架构"', 'AI 分析分层和耦合', '给出改进建议'], script: '用 improve-codebase-architecture 分析这个项目的架构，指出问题并给改进方案。' },
      'triage': { what: '把一堆问题/bug/任务分门别类、排优先级。', steps: ['把问题列表丢给 AI', '说"分诊一下"', 'AI 给出分类和优先级'], script: '用 triage 帮我把这些问题分诊，按优先级排序：<问题列表>。' },
      'compshare-cli': { what: '用命令行管理云显卡和 AI 生图/视频任务。', steps: ['说要做什么任务', 'AI 帮你查显卡/价格并跑任务', '结果给你'], script: '用 compshare-cli 帮我查一下有哪些显卡和价格，我要做<生图/视频>。' },
      'cordis-composition-reference': { what: '查 Cordis 配置写法（YAML 语法、插件包清单）时用的参考资料。', steps: ['问配置怎么写', 'AI 查这份参考', '给出正确写法'], script: '用 cordis-composition-reference 告诉我这个插件配置该怎么写：<需求>。' },
      'cordis-plugin-development': { what: '开发/调试 DSH 插件时的完整指南，从建插件到上架。', steps: ['说要做什么插件', 'AI 按指南建工程', '安装并调试'], script: '用 cordis-plugin-development 帮我做一个能在侧边栏显示<内容>的插件。' },
      'editing-cordis-compositions': { what: '创建或修改智能体预设组合，并检查能不能挂载。', steps: ['说要改预设', 'AI 改组合配置', '验证能挂载'], script: '用 editing-cordis-compositions 帮我新建一个预设组合并验证能挂载。' },
      'find-skills': { what: '不知道用哪个技能时，让 AI 帮你找并安装。', steps: ['说"有没有能做XX的技能"', 'AI 帮你搜索', '确认后安装'], script: '用 find-skills 帮我找一个能<你的需求>的技能，找到后装好。' },
      'hindsight-coding-agent': { what: '跨会话的编码记忆，让 AI 记住项目的事，下次接着用。', steps: ['说"记住：XX"', 'AI 存进 hindsight', '以后自动带上'], script: '用 hindsight 记住：这个项目<要记的事>。' },
      'impeccable': { what: '设计/美化界面：网页、后台、组件、配色、排版都行。', steps: ['描述要做的界面', 'AI 按设计规范做', '给你预览再改'], script: '用 impeccable 帮我设计一个<页面类型>，风格要<风格>，要现代好看。' },
      'office': { what: '处理 Word/Excel/PPT/PDF 的总入口。', steps: ['说要处理什么文件', 'AI 选对应流程', '做完给你文件'], script: '用 office 帮我<创建/编辑/转换>一个<文件类型>，内容是<需求>。' },
      'office-docx': { what: '做 Word 文档：新建、读取、修改、校验。', steps: ['说要写什么 Word', 'AI 生成 .docx', '给你文件'], script: '用 office-docx 帮我写一份 Word 文档，标题是<标题>，内容<内容>。' },
      'office-export-pdf': { what: '把 Office 文件转成 PDF。', steps: ['给 AI 文件', '说"转 PDF"', '给你 PDF'], script: '用 office-export-pdf 把这个文件转成 PDF：<文件路径>。' },
      'office-pptx': { what: '做 PowerPoint 演示文稿。', steps: ['说演示主题和页数', 'AI 生成 .pptx', '给你文件'], script: '用 office-pptx 帮我做一份 PPT，主题<主题>，大概<页数>页。' },
      'office-recalculate': { what: '刷新 Excel 公式缓存并核对算得对不对。', steps: ['给 AI 表格', '说"重算核对"', '给出校验结果'], script: '用 office-recalculate 帮我重算这个表格的公式并核对结果：<文件>。' },
      'office-render': { what: '把文档渲染成图片，或检查排版布局。', steps: ['给 AI 文档', '说"渲染看看"', '给你图片'], script: '用 office-render 帮我把这个文档渲染成图片看看排版：<文件>。' },
      'office-xlsx': { what: '做 Excel 表格：新建、读数据、改、校验公式。', steps: ['说要做什么表', 'AI 生成 .xlsx', '给你文件'], script: '用 office-xlsx 帮我做一个 Excel 表，包含<内容/列>，带公式。' },
      'popo-evasion': { what: '免杀对抗研究：让样本躲过杀软/EDR 检测。', steps: ['给样本和需求', 'AI 分析检测面', '给出规避方案'], script: '用 popo-evasion 分析这个样本的检测面并给出免杀思路：<需求>。' },
      'popo-pentest': { what: 'Web 渗透测试工具包，扫漏洞、信息收集、注入等。', steps: ['给目标范围', 'AI 按流程测', '给报告'], script: '用 popo-pentest 对这个范围做安全测试，先信息收集再找漏洞：<目标>。' },
      'popo-reverse': { what: '逆向工程：反汇编、脱壳、找校验、做补丁和注册机。', steps: ['给二进制文件', 'AI 定位关键函数', '给分析或补丁'], script: '用 popo-reverse 分析这个程序的校验逻辑，找到关键函数：<需求>。' },
      'popo-social': { what: '社会工程学：钓鱼话术、场景设计、OSINT 画像。', steps: ['给目标和场景', 'AI 设计方案', '给话术/流程'], script: '用 popo-social 帮我设计这个场景的方案和话术：<场景>。' },
      'ui-ux-pro-max': { what: 'UI/UX 设计智库：配色、字体、布局、图表、交互建议。', steps: ['描述界面需求', 'AI 出设计方案', '给你规范/代码'], script: '用 ui-ux-pro-max 帮我规划这个界面的配色、字体和布局：<需求>。' },
    };

    const STRINGS = {
      zh: {
        title: '技能与提示词',
        skills: '技能',
        howto: '怎么用',
        prompt: '系统提示词',
        refresh: '刷新',
        close: '收起',
        open: '展开技能与提示词',
        search: '筛选技能…',
        loading: '加载中…',
        noSkills: '未找到技能。',
        noPrompt: '暂无提示词内容。',
        copied: '已复制',
        copy: '复制',
        scan: (n, r) => `${n} 个技能，来自 ${r} 个目录`,
        size: (kb) => `${kb} KB`,
        error: '错误',
        usage: '用法：在「技能」里点左侧任一技能，右侧会显示它的完整提示词（SKILL.md 原文）；点「系统提示词」可查看本会话当前使用的提示词。任一内容都能点「复制」取走。',
      },
      en: {
        title: 'Skills & Prompt',
        skills: 'Skills',
        howto: 'How to use',
        prompt: 'System Prompt',
        refresh: 'Refresh',
        close: 'Close',
        open: 'Open skills & prompt',
        search: 'Filter skills…',
        loading: 'Loading…',
        noSkills: 'No skills found.',
        noPrompt: 'No prompt text available.',
        copied: 'Copied',
        copy: 'Copy',
        scan: (n, r) => `${n} skills from ${r} roots`,
        size: (kb) => `${kb} KB`,
        error: 'Error',
        usage: 'How to use: pick a skill on the left to read its full prompt (raw SKILL.md), or open System Prompt to see the prompt used by this session. Use Copy to take any text.',
      },
    };

    // 入口按钮与浮层面板共享的开关状态
    const state = { open: false };
    const listeners = new Set();
    const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
    const getOpen = () => state.open;
    const setOpen = (v) => {
      if (state.open !== v) { state.open = v; listeners.forEach((fn) => fn()); }
    };
    function useOpen() {
      const [v, setV] = useState(state.open);
      useEffect(() => subscribe(() => setV(state.open)), []);
      return v;
    }

    async function getJSON(url) {
      const res = await fetch(url, { cache: 'no-store' });
      const value = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(value.error || ('HTTP ' + res.status));
      return value;
    }

    const CSS = `
.si-root{font-family:inherit;font-size:12px;color:var(--dsw-alias-label-primary)}
.si-root *{box-sizing:border-box}
.si-trigger{display:flex;align-items:center;gap:6px;max-width:100%;padding:4px 9px;
  border:1px solid var(--dsw-alias-border-l1);border-radius:14px;cursor:pointer;
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;white-space:nowrap}
.si-trigger:hover{border-color:var(--dsw-alias-brand-primary)}
.si-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);display:inline-block;flex:none}
.si-overlay{position:fixed;left:10px;bottom:52px;width:min(560px,calc(100vw - 24px));
  max-height:min(560px,76vh);z-index:9999;background:var(--dsw-alias-bg-overlay);
  border:1px solid var(--dsw-alias-border-l2);border-radius:12px;
  box-shadow:0 12px 40px #0006;overflow:hidden}
.si-head{display:flex;align-items:center;gap:6px;padding:8px 10px;
  border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap;
  cursor:move;user-select:none;touch-action:none}
.si-title{font-weight:600;margin-right:2px}
.si-tab{padding:3px 10px;border:1px solid transparent;border-radius:6px;cursor:pointer;
  background:transparent;color:var(--dsw-alias-label-secondary);font:inherit}
.si-tab:hover{color:var(--dsw-alias-label-primary)}
.si-tab[aria-selected="true"]{border-color:var(--dsw-alias-border-l2);
  background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.si-icon{padding:3px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;cursor:pointer;
  background:transparent;color:var(--dsw-alias-label-secondary);font:inherit}
.si-icon:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
.si-spacer{flex:1}
.si-usage{margin:0;padding:8px 12px;font-size:12px;line-height:1.6;
  color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);
  border-bottom:1px solid var(--dsw-alias-border-l1)}
.si-tools{display:flex;align-items:center;gap:6px;padding:7px 9px;border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}
.si-search{flex:1;min-width:140px;padding:5px 9px;border:1px solid var(--dsw-alias-border-l1);
  border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit}
.si-search::placeholder{color:var(--dsw-alias-label-secondary)}
.si-body{display:flex;max-height:330px;min-height:120px;overflow:auto}
.si-list{width:38%;min-width:150px;overflow:auto;border-right:1px solid var(--dsw-alias-border-l1);flex:none}
.si-item{display:block;width:100%;text-align:start;padding:7px 10px;border:0;border-bottom:1px solid var(--dsw-alias-border-l1);
  background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit}
.si-item:hover{background:var(--dsw-alias-bg-layer-2)}
.si-item[aria-current="true"]{background:var(--dsw-alias-bg-layer-2);
  box-shadow:inset 3px 0 0 var(--dsw-alias-brand-primary)}
.si-item b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.si-item small{display:block;opacity:.62;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.si-tip{position:fixed;z-index:10000;width:min(320px,calc(100vw - 24px));padding:10px 12px;
  background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);
  border-radius:10px;box-shadow:0 10px 32px #0007;pointer-events:none}
.si-tip h5{margin:0 0 4px;font-size:13px}
.si-tip p{margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
.si-tip .si-busy{opacity:.7;font-style:italic}
.si-translatable{cursor:help;text-decoration:underline dotted var(--dsw-alias-border-l2);
  text-underline-offset:3px}
.si-translatable:hover{text-decoration-color:var(--dsw-alias-brand-primary)}
.si-detail{flex:1;overflow:auto;padding:10px 12px;min-width:0}
.si-detail h4{margin:0 0 3px;font-size:13px}
.si-meta{opacity:.6;font-size:11px;margin-bottom:8px;overflow-wrap:anywhere}
.si-code{white-space:pre-wrap;overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;
  font-size:11.5px;line-height:1.5;margin:0;padding:10px;border:1px solid var(--dsw-alias-border-l1);
  border-radius:7px;background:var(--dsw-alias-bg-base)}
.si-full{padding:10px 12px;overflow:auto;max-height:300px}
.si-note{opacity:.66;padding:14px;text-align:center}
.si-how{max-height:390px;overflow:auto;padding:6px 10px 10px}
.si-howcard{border:1px solid var(--dsw-alias-border-l1);border-radius:9px;
  padding:9px 11px;margin-bottom:8px;background:var(--dsw-alias-bg-layer-1)}
.si-howcard h4{margin:0 0 5px;font-size:13px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.si-howcard .si-cn{color:var(--dsw-alias-brand-primary);font-weight:600}
.si-howcard .si-en{opacity:.55;font-weight:400;font-size:11px}
.si-howcard p{margin:0 0 6px;line-height:1.6;font-size:12px}
.si-steps{margin:0 0 8px;padding-left:20px;line-height:1.7;font-size:12px}
.si-script{display:block;width:100%;text-align:start;padding:7px 9px;margin-top:2px;
  border:1px dashed var(--dsw-alias-border-l2);border-radius:7px;
  background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}
.si-script:hover{border-color:var(--dsw-alias-brand-primary)}
.si-script b{color:var(--dsw-alias-brand-primary)}
.si-howhead{display:flex;align-items:center;gap:6px;padding:7px 9px;flex-wrap:wrap;
  border-bottom:1px solid var(--dsw-alias-border-l1)}
.si-badge{font-size:10px;padding:1px 6px;border-radius:10px;
  border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.si-badge.on{color:var(--dsw-alias-state-success-primary);
  border-color:var(--dsw-alias-state-success-primary)}
.si-err{color:var(--dsw-alias-state-error-primary);padding:8px 12px;overflow-wrap:anywhere}
.si-root :focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
`;

    function Trigger() {
      const open = useOpen();
      const t = STRINGS[DEFAULT_LANG];
      return h('button', {
        type: 'button', className: 'si-trigger', onClick: () => setOpen(!open),
        'aria-expanded': open, title: open ? t.close : t.open,
      },
        h('span', { className: 'si-dot' }),
        t.title
      );
    }

    function Panel() {
      const open = useOpen();
      const [lang, setLang] = useState(DEFAULT_LANG);
      const t = STRINGS[lang] || STRINGS.zh;
      const [tab, setTab] = useState('skills');
      const [skills, setSkills] = useState(null);
      const [prompt, setPrompt] = useState(null);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const [query, setQuery] = useState('');
      const [selected, setSelected] = useState(0);
      const [copied, setCopied] = useState(false);
      const copyTimer = useRef(null);
      const [tip, setTip] = useState(null); // { skill, phase, x, y } phase: 'waiting'|'busy'|'done'
      const tipTimers = useRef([]);
      const [autoTr, setAutoTr] = useState({}); // 后端自动翻译结果（新装技能也能有中文）

      // 合并静态字典与自动翻译：优先静态，其次自动
      const trOf = (name) => autoTr[name] || TRANSLATIONS[name] || null;

      // 拖拽移动：按住标题栏拖动，限制在屏幕内，位置记到 localStorage
      const overlayRef = useRef(null);
      const dragRef = useRef(null);
      const [dragPos, setDragPos] = useState(() => {
        try { const s = localStorage.getItem('si-pos'); return s ? JSON.parse(s) : null; } catch (_) { return null; }
      });
      const startDrag = (e) => {
        if (e.target && e.target.closest && e.target.closest('button')) return;
        const el = overlayRef.current;
        if (!el || e.button !== 0) return;
        const rect = el.getBoundingClientRect();
        dragRef.current = { px: e.clientX, py: e.clientY, left: rect.left, top: rect.top };
        e.preventDefault();
        const move = (ev) => {
          const s = dragRef.current;
          if (!s) return;
          const w = el.offsetWidth, h = el.offsetHeight;
          const left = Math.max(0, Math.min(s.left + ev.clientX - s.px, window.innerWidth - w));
          const top = Math.max(0, Math.min(s.top + ev.clientY - s.py, window.innerHeight - h));
          setDragPos({ left, top });
        };
        const up = () => {
          dragRef.current = null;
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
          setDragPos((p) => { if (p) { try { localStorage.setItem('si-pos', JSON.stringify(p)); } catch (_) {} } return p; });
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      };

      const clearTipTimers = () => { tipTimers.current.forEach(clearTimeout); tipTimers.current = []; };
      const hoverSkill = (skill, ev) => {
        clearTipTimers();
        const rect = ev.currentTarget.getBoundingClientRect();
        const x = Math.min(rect.right + 8, window.innerWidth - 336);
        const y = Math.min(Math.max(rect.top, 8), window.innerHeight - 180);
        setTip({ skill, phase: 'waiting', x, y });
        tipTimers.current.push(setTimeout(() => {
          setTip((cur) => cur && cur.skill === skill ? { ...cur, phase: 'busy' } : cur);
        }, 350));
        tipTimers.current.push(setTimeout(() => {
          setTip((cur) => cur && cur.skill === skill ? { ...cur, phase: 'done' } : cur);
        }, 2200));
      };
      const leaveSkill = () => { clearTipTimers(); setTip(null); };
      useEffect(() => () => clearTipTimers(), []);

      const loadSkills = useCallback(async () => {
        setBusy(true); setError('');
        try {
          const data = await getJSON(API + '/skills');
          setSkills(data);
          setSelected(0);
          // 自动翻译：把当前技能清单交给后端，新装技能也会生成中文+怎么用（有缓存，第二次秒出）
          const items = (data.skills || []).map((s) => ({ name: s.name, description: s.description }));
          try {
            const r = await fetch(API + '/translate', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ items }),
            });
            const tj = await r.json().catch(() => ({}));
            if (tj && tj.translations && !tj.translations.__error) setAutoTr(tj.translations);
          } catch (_) {}
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
      }, []);

      const loadPrompt = useCallback(async () => {
        setBusy(true); setError('');
        try {
          const data = await getJSON(API + '/prompt');
          setPrompt(data);
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
      }, []);

      useEffect(() => {
        // 每次打开都重扫：下次新装技能后，一打开面板就自动出现（翻译有缓存，重复打开秒出）
        if (open) loadSkills();
      }, [open]);

      const chooseTab = (name) => {
        setTab(name); setError('');
        if (name === 'prompt' && !prompt) loadPrompt();
        if ((name === 'skills' || name === 'howto') && !skills) loadSkills();
      };

      const switchLang = () => setLang((v) => (v === 'zh' ? 'en' : 'zh'));

      const copy = async (text) => {
        try {
          await navigator.clipboard.writeText(text || '');
          setCopied(true);
          clearTimeout(copyTimer.current);
          copyTimer.current = setTimeout(() => setCopied(false), 1400);
        } catch (_) {}
      };

      useEffect(() => () => clearTimeout(copyTimer.current), []);

      // 按 ESC 关闭面板（和 × 按钮效果一样，自己决定用哪种）
      useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [open]);

      if (!open) return null;

      const list = (skills && skills.skills) || [];
      const filtered = list.filter((s) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return ((s.name || '') + ' ' + (s.description || '') + ' ' + (s.source || '') + ' ' + (s.file || ''))
          .toLowerCase().includes(q);
      });
      const current = filtered[selected] || filtered[0];
      const rootCount = skills ? (skills.roots || []).length : 0;

      const tr = (trOf(tip && tip.skill && tip.skill.name) || trOf(tip && tip.skill && tip.skill.id) || {});
      const tipBubble = tip && h('div', {
        className: 'si-tip', style: { left: tip.x, top: tip.y }, role: 'status',
      },
        tip.phase === 'done'
          ? h('div', null,
              h('h5', null, tr.cn || tr.name ? ('🇨🇳 ' + (tr.cn || tr.name)) : (tip.skill.name || '')),
              h('p', null, tr.desc || (lang === 'zh'
                ? '暂无中文翻译（这个技能刚装好、中文说明还没生成，稍等或点↻刷新）。'
                : 'No Chinese translation available yet for this skill.'))
            )
          : h('p', { className: 'si-busy' }, lang === 'zh' ? '翻译中…' : 'Translating…')
      );

      return h(React.Fragment, null,
        h('div', {
          className: 'si-overlay', role: 'dialog', 'aria-label': t.title,
          ref: overlayRef,
          style: dragPos ? { left: dragPos.left, top: dragPos.top, bottom: 'auto' } : undefined,
        },
        h('div', { className: 'si-head', onMouseDown: startDrag, title: '按住标题栏拖动' },
          h('span', { className: 'si-title' }, t.title),
          h('button', {
            type: 'button', className: 'si-tab', role: 'tab',
            'aria-selected': tab === 'skills', onClick: () => chooseTab('skills'),
          }, t.skills),
          h('button', {
            type: 'button', className: 'si-tab', role: 'tab',
            'aria-selected': tab === 'howto', onClick: () => chooseTab('howto'),
          }, t.howto),
          h('button', {
            type: 'button', className: 'si-tab', role: 'tab',
            'aria-selected': tab === 'prompt', onClick: () => chooseTab('prompt'),
          }, t.prompt),
          h('span', { className: 'si-spacer' }),
          h('button', {
            type: 'button', className: 'si-icon', onClick: tab === 'prompt' ? loadPrompt : loadSkills,
            title: t.refresh,
          }, '↻'),
          h('button', {
            type: 'button', className: 'si-icon', onClick: switchLang,
            title: lang === 'zh' ? 'Switch to English' : '切换到中文',
          }, lang === 'zh' ? 'EN' : '中'),
          h('button', {
            type: 'button', className: 'si-icon', onClick: () => setOpen(false), title: t.close,
          }, '×')
        ),
        h('p', { className: 'si-usage' }, t.usage),
        error && h('div', { className: 'si-err', role: 'alert' }, t.error + ': ' + error),
        tab === 'skills' && h('div', null,
          h('div', { className: 'si-tools' },
            h('input', {
              className: 'si-search', value: query, placeholder: t.search,
              'aria-label': t.search, onChange: (e) => { setQuery(e.target.value); setSelected(0); },
            })
          ),
          !skills && busy && h('div', { className: 'si-note' }, t.loading),
          skills && filtered.length === 0 && h('div', { className: 'si-note' }, t.noSkills),
          filtered.length > 0 && h('div', { className: 'si-body' },
            h('div', { className: 'si-list', role: 'listbox' }, filtered.map((s, i) =>
              h('button', {
                key: s.file + ':' + i, type: 'button', role: 'option', className: 'si-item',
                'aria-current': current === s, onClick: () => setSelected(i),
                onMouseEnter: (e) => hoverSkill(s, e), onMouseLeave: leaveSkill,
              },
                h('b', null, s.name || s.id),
                h('small', null, s.source + ' · ' + t.size(Math.round((s.size || 0) / 1024)))
              )
            )),
            current && h('div', { className: 'si-detail' },
              h('button', {
                type: 'button', className: 'si-icon', style: { float: 'right' },
                onClick: () => copy(current.content),
              }, copied ? t.copied : t.copy),
              h('h4', {
                className: 'si-translatable', title: lang === 'zh' ? '悬停查看中文' : 'Hover to translate',
                onMouseEnter: (e) => hoverSkill(current, e), onMouseLeave: leaveSkill,
              }, current.name || current.id),
              current.description && h('div', {
                className: 'si-meta si-translatable', title: lang === 'zh' ? '悬停查看中文' : 'Hover to translate',
                onMouseEnter: (e) => hoverSkill(current, e), onMouseLeave: leaveSkill,
              }, current.description),
              h('div', { className: 'si-meta' }, current.file),
              h('pre', { className: 'si-code' }, current.content || '')
            )
          )
        ),
        tab === 'howto' && h('div', null,
          h('div', { className: 'si-howhead' },
            h('input', {
              className: 'si-search', value: query, placeholder: t.search,
              'aria-label': t.search, onChange: (e) => setQuery(e.target.value),
            })
          ),
          h('div', { className: 'si-how' }, (() => {
            const installedNames = ((skills && skills.skills) || []).map((s) => s.name);
            const installedSet = new Set(installedNames);
            const q = query.trim().toLowerCase();
            // 合并静态教程 + 所有已装技能：新装技能靠自动翻译也有中文和怎么用
            const allKeys = [...new Set([...installedNames, ...Object.keys(HOWTO)])];
            const keys = allKeys.filter((k) => {
              const at = trOf(k) || {};
              const hay = k + ' ' + (HOWTO[k] && HOWTO[k].what || '') + ' ' + (at.cn || at.name || '') + ' ' + (at.desc || '');
              if (q && !hay.toLowerCase().includes(q)) return false;
              return true;
            }).sort((a, b) => (installedSet.has(b) ? 1 : 0) - (installedSet.has(a) ? 1 : 0) || a.localeCompare(b));
            if (!keys.length) return h('div', { className: 'si-note' }, t.noSkills);
            return keys.map((k) => {
              const g = HOWTO[k] || {};
              const at = trOf(k) || {};
              const cn = at.cn || at.name || '';
              const what = g.what || at.desc || '';
              const steps = g.steps || (at.howto ? [at.howto] : []);
              const script = g.script || at.howto || '';
              return h('div', { className: 'si-howcard', key: k },
                h('h4', null,
                  cn ? h('span', { className: 'si-cn' }, cn) : null,
                  h('span', { className: 'si-en' }, k),
                  installedSet.has(k) ? h('span', { className: 'si-badge on', style: { marginLeft: 'auto' } }, '已装') : h('span', { className: 'si-badge', style: { marginLeft: 'auto' } }, '未装')
                ),
                what ? h('p', null, what) : null,
                steps.length ? h('ol', { className: 'si-steps' }, steps.map((s, i) => h('li', { key: i }, s))) : null,
                script ? h('button', {
                  type: 'button', className: 'si-script', title: '点一下复制这句，粘给 AI 就能用',
                  onClick: () => copy(script),
                }, h('b', null, copied ? t.copied : '📋 复制话术：'), ' ', script) : null
              );
            });
          })())
        ),
        tab === 'prompt' && h('div', null,
          !prompt && busy && h('div', { className: 'si-note' }, t.loading),
          prompt && !prompt.ok && h('div', { className: 'si-err', role: 'alert' }, prompt.error || t.noPrompt),
          prompt && prompt.ok && h('div', null,
            h('div', { className: 'si-tools' },
              h('button', {
                type: 'button', className: 'si-icon', onClick: () => copy(prompt.text),
              }, copied ? t.copied : t.copy)
            ),
            prompt.text
              ? h('pre', { className: 'si-code si-full' }, prompt.text)
              : h('div', { className: 'si-note' }, t.noPrompt)
          )
        )
      ),
      tipBubble
    );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const removeStyle = typeof styles !== 'undefined' && styles.insert
          ? styles.insert(CSS)
          : (() => {
              const el = document.createElement('style');
              el.textContent = CSS;
              document.head.appendChild(el);
              return () => el.remove();
            })();
        const disposeTrigger = ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'skills-inspector-trigger',
          order: 8,
          label: '技能与提示词',
        }, Trigger));
        const disposePanel = ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'skills-inspector-panel',
          order: 8,
          label: '技能与提示词面板',
        }, Panel));
        return () => {
          disposeTrigger();
          disposePanel();
          removeStyle();
        };
      },
    };
  },
});

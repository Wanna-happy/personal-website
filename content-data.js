window.PORTFOLIO_CONTENT = {
  "version": 1,
  "profile": {
    "intro": "四川大学社会保障硕士在读，聚焦 AI Agent、LLM 应用与具身智能场景。我相信好的产品，是让模型能力真正抵达具体的人和问题。",
    "welcome": "我是阮涵。这里放着我的经历、作品， 还有一些想与你分享的生活片段。",
    "email": "1487253258@qq.com",
    "education": [
      {
        "label": "本科",
        "title": "西南政法大学",
        "detail": "行政管理专业"
      },
      {
        "label": "硕士",
        "title": "四川大学",
        "detail": "社会保障专业"
      },
      {
        "label": "主修课程",
        "title": "社会政策分析 · 社会保障基金管理 · 公共管理学 · 公共经济学",
        "detail": ""
      }
    ]
  },
  "experiences": [
    {
      "id": "jiuqu",
      "title": "AI 产品实习生 · FilFil.tv AI 短剧创作平台",
      "date": "2026.06 — 至今",
      "company": "九曲无限科技有限公司",
      "description": "项目：FilFil.tv——AI 短剧创作平台。对标 Lib.tv，提供画布与 Agent 对话式两种创作模式。\n\n平台建设（0→1）：作为唯一产品负责人，独立承担平台全量功能设计，从项目、资产、权限等基础支撑框架，到对话式创作、画布联动等 AI Agent 创作能力，支撑 14 人内容团队一体化生产。\n\n需求取舍：通过数据调研验证「全民出演」功能的商业价值与可行性，判断其非核心价值后，推动降级为趣味入口，避免一轮不必要的研发投入。\n\n流程治理：针对需求分散、版本边界不清的问题，主导补齐用户调研与竞品拆解，重新对齐业务方，重构 PRD 文档层级与索引规则，统一产品愿景与实现阶段；独立完成 BRD 与竞品拆解，输出产品定位结论。",
      "highlight": "降本增效：推动内容生产由外部平台采购转为平台内自建，团队短剧月产能从 2 部（60 集）提升至 5 部，同时替代原有每月 5 万元的外部平台投入。",
      "tags": [
        "AI 产品",
        "0→1 平台建设",
        "AI Agent",
        "需求取舍",
        "PRD / BRD"
      ],
      "narration": "从2026年6月至今，我在九曲无限科技有限公司担任 AI 产品实习生，负责 FilFil.tv AI 短剧创作平台。作为唯一产品负责人，我独立承担了从项目、资产和权限，到 Agent 对话式创作与画布联动的全量功能设计，支撑14人内容团队生产。平台推动内容生产由外部采购转为内建，团队短剧月产能从2部、60集提升至5部，并替代了每月5万元的外部平台投入。我也通过数据调研推动「全民出演」降级为趣味入口，并重构 PRD 文档层级与索引规则，独立完成 BRD、竞品拆解和产品定位结论。",
      "managed": true
    },
    {
      "id": "robot",
      "title": "Prompts 实习生 · 迎宾机器人对话优化",
      "date": "2025.06 — 2025.08",
      "company": "津安达具身机器人科技有限公司",
      "description": "Prompt 设计与迭代：负责迎宾机器人在真实场景下的 LLM Prompt 设计与迭代，采用「角色设定＋输出格式约束＋Few-shot」框架，优化场景识别与用户意图识别。\n\n参数调优与实景验证：通过调节 Temperature / Top-p 等模型参数，做上百轮 A/B 对比，并在真实接待场景完成 100+ 轮实景验证，定位并修复高频失败 case。\n\n失败归因与修复：定位到最典型的失败是多轮对话中用户切换话题后，模型仍沿用上一轮语境误判意图，例如问完营业时间后紧接着问停车。通过增加「每轮独立判断意图」约束，以及易混淆意图对的 Few-shot 对照来缓解。",
      "highlight": "将场景识别与用户意图识别准确率从 72% 提升至 88%。",
      "tags": [
        "Prompt 设计",
        "Few-shot",
        "参数调优",
        "A/B 对比",
        "100+ 轮实景验证"
      ],
      "narration": "2025年6月至8月，我在津安达具身机器人科技有限公司担任 Prompts 实习生，负责迎宾机器人的 LLM Prompt 设计与迭代。通过角色设定、输出格式约束和 Few-shot 框架，将场景识别与用户意图识别准确率从72%提升到88%。我通过调节 Temperature 和 Top-p 做了上百轮 A/B 对比，并完成100多轮真实接待场景验证。针对用户切换话题后模型仍沿用上一轮语境的问题，我增加了每轮独立判断意图的约束，并用易混淆意图对的 Few-shot 对照来缓解。",
      "managed": true
    }
  ],
  "projects": [
    {
      "id": "weekly",
      "title": "未来智选 · 周报 Agent",
      "type": "B 端产品 · AI Agent / MVP 验证",
      "year": "2026",
      "headline": "让业务周报\n自己说清楚",
      "description": "面向运营人员手工撰写周报耗时、管理层查看业务指标分散的问题，梳理 Agent 能力边界、触发条件与输出规范；独立完成覆盖周报自动生成和指标可视化的 HTML 可交互原型，并完成大模型 API 接入与开发协作。",
      "link": "",
      "cover": "",
      "pdf": "",
      "slides": [],
      "problem": "运营人员手工撰写周报耗时，管理层查看业务指标分散。",
      "process": "我梳理了 Agent 的能力边界、触发条件与输出规范，独立完成周报自动生成和指标可视化的 HTML 可交互原型，并参与 API 接入与开发协作。",
      "result": "目前展示的是可演示、可验证的产品方案与原型。",
      "narration": "我做这个项目时，先明确了周报该在什么情况下生成、应该包含什么，再把这些规则落进可以点击体验的原型中。",
      "managed": false
    },
    {
      "id": "learning",
      "title": "AI 学习助手",
      "type": "C 端产品 · Vibe Coding",
      "year": "ONGOING",
      "headline": "把学习的节奏\n交还给自己",
      "description": "一款由我独立 Vibe Coding 完成的 C 端 AI 学习助手。这里将持续记录从想法、设计到实现的过程，并预留项目仓库链接。",
      "link": "",
      "cover": "",
      "pdf": "",
      "slides": [],
      "problem": "这是面向个人学习场景的 AI 产品探索。",
      "process": "我独立用 Vibe Coding 把想法逐步做成可体验的产品。",
      "result": "项目持续完善中，后续会补充设计、实现过程与项目仓库。",
      "narration": "这是我自己动手做的学习助手。我还在持续完善它，也会把从想法到实现的过程记录下来。",
      "managed": false
    }
  ],
  "photos": [
    {
      "id": "everyday",
      "src": "assets/ruan-han-mirror.jpg",
      "alt": "阮涵的日常穿搭",
      "caption": "把普通日子，也过成自己的样子。"
    },
    {
      "id": "fitness",
      "src": "assets/ruan-han-fitness.jpg",
      "alt": "阮涵在健身房",
      "caption": "保持力量，也保持专注。"
    },
    {
      "id": "d1294f0c-bda1-4afa-b22a-5b4c6330275b",
      "src": "assets/uploads/7e93cfa46641820eb52d1c1cc57c6237fc6ed9c5abed9e964321a198da65bb55.jpg",
      "caption": "西安城头上的余晖至今印刻在脑海",
      "alt": "记住这一刻。"
    },
    {
      "id": "89e83a0d-f857-40c4-aa6f-09544a8ffbbf",
      "src": "assets/uploads/083c5da1802b1f7193af7ce9d809ea7f8a563126ec092814b87c82b38a001cb4.jpg",
      "caption": "本科毕业前的最后一次相聚",
      "alt": "记住这一刻。"
    },
    {
      "id": "sunset",
      "src": "assets/ruan-han-sunset.jpg",
      "alt": "阮涵在日落时刻",
      "caption": "在日落里，把视野放远一点。"
    },
    {
      "id": "flowers",
      "src": "assets/ruan-han-qilixiang.jpg",
      "alt": "阮涵在七里香花下",
      "caption": "七里香花下，记住夏天的明亮。"
    }
  ]
};

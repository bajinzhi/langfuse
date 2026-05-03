export const SEED_MARKER = "cn-marketplace-full-loop-v1";

export const DEMO_USER = {
  id: "cn-marketplace-demo-user",
  name: "中文演示用户",
  email: "cn-marketplace-demo@langfuse.local",
  password: "password",
} as const;

export const DEMO_ORG = {
  id: "cn-marketplace-demo-org",
  name: "中文二手集市演示组织",
} as const;

export const DEMO_PROJECT = {
  id: "cn-marketplace-demo-project",
  name: "中文二手集市演示",
} as const;

export const DEMO_API_KEY = {
  publicKey: "pk-lf-cn-marketplace-demo",
  secretKey: "sk-lf-cn-marketplace-demo",
} as const;

export const DEMO_IDS = {
  orgMembership: "cn-marketplace-demo-org-membership",
  promptStyle: "cn-marketplace-prompt-style-v1",
  promptAssistantV1: "cn-marketplace-prompt-assistant-v1",
  promptAssistantV2: "cn-marketplace-prompt-assistant-v2",
  promptSafety: "cn-marketplace-prompt-safety-v1",
  promptDependency: "cn-marketplace-prompt-dependency",
  promptProtectedLabel: "cn-marketplace-prompt-label-production",
  dataset: "cn-marketplace-dataset-customer-loop",
  runBaseline: "cn-marketplace-run-baseline",
  runOptimized: "cn-marketplace-run-optimized",
  promptfooRunAssistantV1: "cn-marketplace-promptfoo-run-assistant-v1",
  promptfooRunAssistantV2: "cn-marketplace-promptfoo-run-assistant-v2",
  llmApiKey: "cn-marketplace-llm-api-key-ollama",
  defaultLlmModel: "cn-marketplace-default-llm-model",
  model: "cn-marketplace-model-chat",
  evalTemplate: "cn-marketplace-eval-template-helpfulness",
  evalJobConfig: "cn-marketplace-eval-job-helpfulness",
  annotationQueue: "cn-marketplace-annotation-queue",
  annotationAssignment: "cn-marketplace-annotation-assignment",
  llmSchema: "cn-marketplace-llm-schema-reply",
  llmTool: "cn-marketplace-llm-tool-safety",
  dashboard: "cn-marketplace-dashboard",
  dashboardWidgetVolume: "cn-marketplace-widget-volume",
  dashboardWidgetQuality: "cn-marketplace-widget-quality",
  dashboardWidgetRisk: "cn-marketplace-widget-risk",
} as const;

export const SCORE_CONFIGS = {
  replyQuality: {
    id: "cn-marketplace-score-reply-quality",
    name: "回复质量",
  },
  dealIntent: {
    id: "cn-marketplace-score-deal-intent",
    name: "成交意向",
  },
  contentRisk: {
    id: "cn-marketplace-score-content-risk",
    name: "内容风险",
  },
  manualAdvice: {
    id: "cn-marketplace-score-manual-advice",
    name: "人工建议",
  },
} as const;

export const EVALUATION_RUNS = [
  {
    id: DEMO_IDS.runBaseline,
    name: "客服助手 v1 基线",
    description: "保守回复策略，用于对比初版客服助手表现。",
    variant: "v1",
    metadata: {
      版本: "v1",
      策略: "基线",
      渠道: "站内私信",
    },
  },
  {
    id: DEMO_IDS.runOptimized,
    name: "客服助手 v2 优化版",
    description: "加入商品事实核对、风险提醒和更自然的中文表达。",
    variant: "v2",
    metadata: {
      版本: "v2",
      策略: "优化",
      渠道: "站内私信",
    },
  },
] as const;

export type DemoCase = {
  id: string;
  title: string;
  userId: string;
  sessionId: string;
  source: string;
  input: {
    场景: string;
    商品: string;
    买家消息: string;
    卖家约束: string;
  };
  expectedOutput: {
    回复要点: string[];
    建议语气: string;
  };
  baselineOutput: string;
  optimizedOutput: string;
  metadata: Record<string, string>;
  scores: {
    v1: {
      replyQuality: number;
      dealIntent: "低" | "中" | "高";
      dealIntentValue: number;
      contentRisk: "安全" | "需复核" | "拦截";
      contentRiskValue: number;
    };
    v2: {
      replyQuality: number;
      dealIntent: "低" | "中" | "高";
      dealIntentValue: number;
      contentRisk: "安全" | "需复核" | "拦截";
      contentRiskValue: number;
    };
  };
  manualAdvice: string;
};

export const DEMO_CASES: DemoCase[] = [
  {
    id: "price",
    title: "买家砍价咨询",
    userId: "买家-阿青",
    sessionId: "cn-marketplace-session-price",
    source: "站内私信",
    input: {
      场景: "买家对九成新露营椅砍价",
      商品: "九成新折叠露营椅，标价 168 元，上海同城可自提",
      买家消息: "能不能 120 包邮？我今天就能拍。",
      卖家约束: "最低 150 元；同城自提优先，不包邮。",
    },
    expectedOutput: {
      回复要点: ["礼貌说明最低价", "解释不包邮原因", "给出同城自提的替代方案"],
      建议语气: "亲切、坚定、不催促",
    },
    baselineOutput:
      "您好，价格已经比较低了，不能 120 包邮，最低 150，您可以考虑一下。",
    optimizedOutput:
      "可以理解您想尽快入手，这把椅子成色比较新，最低我这边能到 150 元；因为体积偏大暂时不包邮。如果您今天方便上海同城自提，我可以优先给您保留到今晚。",
    metadata: {
      商品类目: "户外用品",
      城市: "上海",
      业务阶段: "议价",
    },
    scores: {
      v1: {
        replyQuality: 0.68,
        dealIntent: "中",
        dealIntentValue: 0.5,
        contentRisk: "安全",
        contentRiskValue: 1,
      },
      v2: {
        replyQuality: 0.91,
        dealIntent: "高",
        dealIntentValue: 1,
        contentRisk: "安全",
        contentRiskValue: 1,
      },
    },
    manualAdvice: "可以补充自提地点范围，减少后续来回确认。",
  },
  {
    id: "pickup",
    title: "同城面交安全提醒",
    userId: "买家-小周",
    sessionId: "cn-marketplace-session-pickup",
    source: "站内私信",
    input: {
      场景: "买家希望夜间线下面交",
      商品: "自用平板电脑，标价 980 元，广州同城",
      买家消息: "晚上 11 点你能不能带到地铁口？我现金给你。",
      卖家约束: "仅支持平台担保交易；建议白天公共场所验机。",
    },
    expectedOutput: {
      回复要点: ["拒绝深夜现金交易", "建议平台担保", "约白天公共场所验机"],
      建议语气: "明确、安全、不过度指责",
    },
    baselineOutput: "晚上太晚了不方便，现金也不太合适，还是平台拍吧。",
    optimizedOutput:
      "晚上 11 点线下面交对双方都不太安全，我这边只走平台担保交易。您如果想先验机，可以约明天白天在地铁站客服中心附近，当面确认外观和功能后再在平台完成付款。",
    metadata: {
      商品类目: "数码",
      城市: "广州",
      业务阶段: "安全确认",
    },
    scores: {
      v1: {
        replyQuality: 0.74,
        dealIntent: "中",
        dealIntentValue: 0.5,
        contentRisk: "需复核",
        contentRiskValue: 0.5,
      },
      v2: {
        replyQuality: 0.94,
        dealIntent: "高",
        dealIntentValue: 1,
        contentRisk: "安全",
        contentRiskValue: 1,
      },
    },
    manualAdvice: "安全场景要明确平台担保，不建议保留现金交易余地。",
  },
  {
    id: "shipping",
    title: "邮寄与包装说明",
    userId: "买家-木木",
    sessionId: "cn-marketplace-session-shipping",
    source: "站内私信",
    input: {
      场景: "买家担心玻璃杯邮寄损坏",
      商品: "手冲咖啡玻璃分享壶，标价 58 元",
      买家消息: "这个会不会寄碎？能不能发顺丰？",
      卖家约束: "可发顺丰到付；会用气泡膜和纸箱加固。",
    },
    expectedOutput: {
      回复要点: ["说明包装方式", "说明快递选项", "提醒签收检查"],
      建议语气: "细致、让买家安心",
    },
    baselineOutput: "可以发顺丰，会包好的，应该不会碎。",
    optimizedOutput:
      "可以发顺丰到付。我会先用气泡膜包两层，再放进加厚纸箱并填充空隙；您收到时建议先检查外箱，如果明显破损可以当场拍照联系我处理。",
    metadata: {
      商品类目: "家居",
      城市: "杭州",
      业务阶段: "配送确认",
    },
    scores: {
      v1: {
        replyQuality: 0.7,
        dealIntent: "中",
        dealIntentValue: 0.5,
        contentRisk: "安全",
        contentRiskValue: 1,
      },
      v2: {
        replyQuality: 0.89,
        dealIntent: "高",
        dealIntentValue: 1,
        contentRisk: "安全",
        contentRiskValue: 1,
      },
    },
    manualAdvice: "可以加入运费是否到付，避免买家误解包邮。",
  },
  {
    id: "aftersale",
    title: "收货后售后沟通",
    userId: "买家-梨子",
    sessionId: "cn-marketplace-session-aftersale",
    source: "站内私信",
    input: {
      场景: "买家收到衣服后反馈有轻微色差",
      商品: "羊毛开衫，标价 135 元，已发货签收",
      买家消息: "颜色和照片不太一样，可以退吗？",
      卖家约束: "商品页已标注自然光拍摄；支持友好协商，不承诺无条件退货。",
    },
    expectedOutput: {
      回复要点: ["先共情", "说明商品页信息", "提出可协商方案"],
      建议语气: "克制、愿意解决问题",
    },
    baselineOutput: "图片就是实拍的，色差很正常，不能退。",
    optimizedOutput:
      "抱歉让您觉得有落差。图片是自然光实拍，页面也备注过不同屏幕会有轻微色差。您可以先发一张收到后的照片给我看一下，我们尽量友好协商一个双方都能接受的处理方式。",
    metadata: {
      商品类目: "服饰",
      城市: "成都",
      业务阶段: "售后",
    },
    scores: {
      v1: {
        replyQuality: 0.46,
        dealIntent: "低",
        dealIntentValue: 0,
        contentRisk: "需复核",
        contentRiskValue: 0.5,
      },
      v2: {
        replyQuality: 0.87,
        dealIntent: "中",
        dealIntentValue: 0.5,
        contentRisk: "安全",
        contentRiskValue: 1,
      },
    },
    manualAdvice: "售后场景不要直接否定买家感受，先收集照片再判断。",
  },
  {
    id: "listing",
    title: "商品标题优化",
    userId: "卖家-北北",
    sessionId: "cn-marketplace-session-listing",
    source: "发布助手",
    input: {
      场景: "卖家希望优化商品标题",
      商品: "用了三次的空气炸锅，容量 4L，配件齐全，北京可自提",
      买家消息: "帮我写个标题，别太夸张。",
      卖家约束: "不能夸大成全新；需要突出容量、成色、自提。",
    },
    expectedOutput: {
      回复要点: ["给出自然标题", "保留真实成色", "包含核心筛选词"],
      建议语气: "简洁、可信",
    },
    baselineOutput: "超新空气炸锅 4L 低价出，快来捡漏。",
    optimizedOutput:
      "标题建议：九成新 4L 空气炸锅｜配件齐全｜北京同城可自提。这样既保留容量和自提信息，也避免把使用过的商品描述成全新。",
    metadata: {
      商品类目: "小家电",
      城市: "北京",
      业务阶段: "发布优化",
    },
    scores: {
      v1: {
        replyQuality: 0.52,
        dealIntent: "中",
        dealIntentValue: 0.5,
        contentRisk: "需复核",
        contentRiskValue: 0.5,
      },
      v2: {
        replyQuality: 0.92,
        dealIntent: "高",
        dealIntentValue: 1,
        contentRisk: "安全",
        contentRiskValue: 1,
      },
    },
    manualAdvice: "发布助手要避免极限词，突出真实信息更适合二手交易。",
  },
];

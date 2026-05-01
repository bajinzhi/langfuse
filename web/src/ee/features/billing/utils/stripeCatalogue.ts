import { env } from "@/src/env.mjs";
import { type MessageKey } from "@/src/features/i18n";
import { type Plan } from "@langfuse/shared";

const isTestEnvironment =
  env.NEXT_PUBLIC_LANGFUSE_CLOUD_REGION === "DEV" ||
  env.NEXT_PUBLIC_LANGFUSE_CLOUD_REGION === "STAGING";

type StripeProduct = {
  stripeProductId: string;
  orderKey?: number | undefined; // to check whether a plan is upgraded or downgraded
  mappedPlan: Plan;
  // include checkout if product can be subscribed to by new users
  checkout: {
    titleKey: MessageKey;
    descriptionKey: MessageKey;
    price: string;
    usagePrice: string;
    mainFeatureKeys: MessageKey[];
    cta?: {
      labelKey: MessageKey;
      href: string;
    };
  } | null;
};

// Backward-compatible export: same name and shape as before
export const stripeProducts: StripeProduct[] = [
  {
    stripeProductId: isTestEnvironment
      ? "prod_RoYirvRQ4Kc6po" // sandbox
      : "prod_RoYirvRQ4Kc6po", // live
    mappedPlan: "cloud:core",
    orderKey: 29,
    checkout: {
      titleKey: "billing.plan.core.title",
      descriptionKey: "billing.plan.core.description",
      price: "$29 / month",
      usagePrice: "$8-6/100k units (100k included, graduated pricing)",
      mainFeatureKeys: [
        "billing.plan.features.dataAccess90Days",
        "billing.plan.features.unlimitedUsers",
        "billing.plan.features.unlimitedEvaluators",
        "billing.plan.features.supportEmailChat",
      ],
    },
  },
  {
    stripeProductId: isTestEnvironment
      ? "prod_QhK7UMhrkVeF6R" // sandbox
      : "prod_QhK7UMhrkVeF6R", // live
    mappedPlan: "cloud:pro",
    orderKey: 199,
    checkout: {
      titleKey: "billing.plan.pro.title",
      descriptionKey: "billing.plan.pro.description",
      price: "$199 / month",
      usagePrice: "$8-6/100k units (100k included, graduated pricing)",
      mainFeatureKeys: [
        "billing.plan.features.everythingCore",
        "billing.plan.features.dataAccess3Years",
        "billing.plan.features.unlimitedAnnotationQueues",
        "billing.plan.features.dataRetentionManagement",
        "billing.plan.features.highRateLimits",
        "billing.plan.features.soc2IsoReports",
      ],
    },
  },
  {
    stripeProductId: isTestEnvironment
      ? "prod_QhK9qKGH25BTcS" // sandbox
      : "prod_QhK9qKGH25BTcS", // live
    mappedPlan: "cloud:team",
    orderKey: 499,
    checkout: {
      titleKey: "billing.plan.team.title",
      descriptionKey: "billing.plan.team.description",
      price: "$499 / month",
      usagePrice: "$8-6/100k units (100k included, graduated pricing)",
      mainFeatureKeys: [
        "billing.plan.features.everythingPro",
        "billing.plan.features.enterpriseSso",
        "billing.plan.features.ssoEnforcement",
        "billing.plan.features.fineGrainedRbac",
        "billing.plan.features.supportSlack",
      ],
    },
  },
  {
    stripeProductId: isTestEnvironment
      ? "prod_STnXok7GSSDmyF" // sandbox
      : "prod_STnXok7GSSDmyF", // live
    mappedPlan: "cloud:enterprise",
    orderKey: 2499,
    checkout: {
      titleKey: "billing.plan.enterprise.title",
      descriptionKey: "billing.plan.enterprise.description",
      price: "$2499 / month",
      usagePrice: "$8-6/100k units (100k included, graduated pricing)",
      mainFeatureKeys: [
        "billing.plan.features.everythingProTeams",
        "billing.plan.features.auditLogs",
        "billing.plan.features.scimApi",
        "billing.plan.features.customRateLimits",
        "billing.plan.features.uptimeSla",
        "billing.plan.features.supportSla",
        "billing.plan.features.dedicatedSupportEngineer",
      ],
      cta: {
        labelKey: "billing.contactSales",
        href: "https://langfuse.com/talk-to-us",
      },
    },
  },
];

export const stripeUsageProduct = {
  id: isTestEnvironment
    ? "prod_T2DaIcLiiR78rs" // sandbox
    : "prod_T4nLLI2vn876J2",
};

export const mapStripeProductIdToPlan = (productId: string): Plan | null =>
  stripeProducts.find((product) => product.stripeProductId === productId)
    ?.mappedPlan ?? null;

export const isUpgrade = (
  oldProductId: string,
  newProductId: string,
): boolean => {
  const oldProduct = stripeProducts.find(
    (product) => product.stripeProductId === oldProductId,
  );
  const newProduct = stripeProducts.find(
    (product) => product.stripeProductId === newProductId,
  );
  return (oldProduct?.orderKey ?? 0) < (newProduct?.orderKey ?? 0);
};

export const isValidCheckoutProduct = (id: string) => {
  return stripeProducts.some(
    (p) => Boolean(p.checkout) && p.stripeProductId === id,
  );
};

export const StripeCatalogue = {
  products: stripeProducts,
  usageProductId: () => stripeUsageProduct.id,
  isValidCheckoutProduct: isValidCheckoutProduct,
  isUpgrade,
  mapStripeProductIdToPlan,
} as const;

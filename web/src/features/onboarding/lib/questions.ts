import type { SurveyQuestion } from "./surveyTypes";

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: "role",
    type: "radio",
    questionKey: "onboarding.survey.roleQuestion",
    options: [
      {
        value: "Software Engineer",
        labelKey: "onboarding.survey.role.softwareEngineer",
      },
      {
        value: "ML Engineer / Data Scientist",
        labelKey: "onboarding.survey.role.mlEngineer",
      },
      {
        value: "Product Manager",
        labelKey: "onboarding.survey.role.productManager",
      },
      {
        value: "Domain Expert",
        labelKey: "onboarding.survey.role.domainExpert",
      },
      {
        value: "Executive or Manager",
        labelKey: "onboarding.survey.role.executiveManager",
      },
      { value: "Other", labelKey: "onboarding.survey.role.other" },
    ],
  },
  {
    id: "signupReason",
    type: "radio",
    questionKey: "onboarding.survey.signupReasonQuestion",
    options: [
      {
        value: "Invited by team",
        labelKey: "onboarding.survey.reason.invited",
      },
      {
        value: "Just looking around",
        labelKey: "onboarding.survey.reason.lookingAround",
      },
      {
        value: "Evaluating / Testing Langfuse",
        labelKey: "onboarding.survey.reason.evaluating",
      },
      {
        value: "Start using Langfuse",
        labelKey: "onboarding.survey.reason.startUsing",
      },
      {
        value: "Migrating from other solution",
        labelKey: "onboarding.survey.reason.migratingOther",
      },
      {
        value: "Migrating from self-hosted",
        labelKey: "onboarding.survey.reason.migratingSelfHosted",
      },
    ],
  },
  {
    id: "referralSource",
    type: "text",
    questionKey: "onboarding.survey.referralQuestion",
    placeholderKey: "onboarding.survey.referralPlaceholder",
  },
];

export const TOTAL_STEPS = SURVEY_QUESTIONS.length;

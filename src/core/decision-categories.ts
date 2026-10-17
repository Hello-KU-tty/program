/**
 * Learner-facing names for Core Decision categories (contracts `decisionCategorySchema`), shared
 * by the plan review and the agent surface so a raw code such as `DATA_MODEL` never shows (K23).
 * An unknown value passes through unchanged.
 */
const DECISION_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  PRODUCT_BEHAVIOR: "제품 동작",
  DATA_MODEL: "데이터 구조",
  API_CONTRACT: "API 설계",
  AUTHENTICATION: "로그인·인증",
  AUTHORIZATION: "권한",
  SECURITY_PRIVACY: "보안·개인정보",
  RETENTION_DELETION: "보관·삭제",
  COST_DEPLOYMENT: "비용·배포",
  ARCHITECTURE: "구조 설계",
  LEARNING_CONCEPT: "학습 개념",
};

export function decisionCategoryLabel(category: string): string {
  return DECISION_CATEGORY_LABELS[category] ?? category;
}

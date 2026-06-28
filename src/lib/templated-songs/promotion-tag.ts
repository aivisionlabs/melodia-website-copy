export const TEMPLATED_PROMOTION_TAG_VALUES = [
  'trending',
  'most_preferred',
  'new',
] as const;

export type TemplatedPromotionTag = (typeof TEMPLATED_PROMOTION_TAG_VALUES)[number];

export const AUTO_NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type TemplatedPromotionAdminSetting =
  | 'auto'
  | 'none'
  | TemplatedPromotionTag;

export function isTemplatedPromotionTag(
  value: string,
): value is TemplatedPromotionTag {
  return (TEMPLATED_PROMOTION_TAG_VALUES as readonly string[]).includes(value);
}

export function resolveEffectivePromotionTag(input: {
  promotionTag: TemplatedPromotionTag | null | undefined;
  suppressAutoNew: boolean | null | undefined;
  firstActivatedAt: Date | string | null | undefined;
  now?: Date;
}): TemplatedPromotionTag | null {
  const { promotionTag, suppressAutoNew, firstActivatedAt } = input;
  const now = input.now ?? new Date();

  if (promotionTag) {
    return promotionTag;
  }

  if (suppressAutoNew) {
    return null;
  }

  if (!firstActivatedAt) {
    return null;
  }

  const activatedAt =
    firstActivatedAt instanceof Date
      ? firstActivatedAt
      : new Date(firstActivatedAt);
  if (Number.isNaN(activatedAt.getTime())) {
    return null;
  }

  if (now.getTime() - activatedAt.getTime() <= AUTO_NEW_WINDOW_MS) {
    return 'new';
  }

  return null;
}

export function promotionTagToAdminSetting(input: {
  promotionTag: TemplatedPromotionTag | null | undefined;
  suppressAutoNew: boolean | null | undefined;
}): TemplatedPromotionAdminSetting {
  if (input.promotionTag) {
    return input.promotionTag;
  }
  if (input.suppressAutoNew) {
    return 'none';
  }
  return 'auto';
}

export function adminSettingToPromotionFields(
  setting: TemplatedPromotionAdminSetting,
): {
  promotion_tag: TemplatedPromotionTag | null;
  suppress_auto_new: boolean;
} {
  if (setting === 'auto') {
    return { promotion_tag: null, suppress_auto_new: false };
  }
  if (setting === 'none') {
    return { promotion_tag: null, suppress_auto_new: true };
  }
  return { promotion_tag: setting, suppress_auto_new: false };
}

export function compareTemplatesByPromotion<T extends { promotion_tag?: TemplatedPromotionTag | null }>(
  a: T,
  b: T,
): number {
  const aTagged = a.promotion_tag ? 1 : 0;
  const bTagged = b.promotion_tag ? 1 : 0;
  return bTagged - aTagged;
}

export function promotionTagLabel(tag: TemplatedPromotionTag): string {
  switch (tag) {
    case 'trending':
      return 'Trending';
    case 'most_preferred':
      return 'Most Preferred';
    case 'new':
      return 'New';
    default:
      return tag;
  }
}

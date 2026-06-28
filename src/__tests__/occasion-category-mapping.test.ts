import { describe, it, expect } from 'vitest';
import {
  getCategorySlugsForPartnerTemplatesOccasion,
  usesMultiCategoryPartnerTemplateOrdering,
} from '@/lib/occasion-category-mapping';

describe('getCategorySlugsForPartnerTemplatesOccasion', () => {
  it('returns adult-birthday before birthday for birthday occasion', () => {
    // The route overrides this order for birthday (5 kids-first, 10 adult) via separate queries.
    expect(getCategorySlugsForPartnerTemplatesOccasion('birthday')).toEqual([
      'adult-birthday',
      'birthday',
    ]);
  });

  it('returns a single slug unchanged for anniversary', () => {
    expect(getCategorySlugsForPartnerTemplatesOccasion('anniversary')).toEqual(['anniversary']);
  });

  it('trims whitespace from occasion input', () => {
    expect(getCategorySlugsForPartnerTemplatesOccasion('  anniversary  ')).toEqual(['anniversary']);
  });
});

describe('usesMultiCategoryPartnerTemplateOrdering', () => {
  it('is true only when multiple category slugs are returned', () => {
    expect(
      usesMultiCategoryPartnerTemplateOrdering(
        getCategorySlugsForPartnerTemplatesOccasion('birthday'),
      ),
    ).toBe(true);

    expect(
      usesMultiCategoryPartnerTemplateOrdering(
        getCategorySlugsForPartnerTemplatesOccasion('anniversary'),
      ),
    ).toBe(false);
  });
});

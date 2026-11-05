import { ClassificationData, ClassifiedNorma, validateClassification } from './classification.model';

const norma = (patch: Partial<ClassifiedNorma> = {}): ClassifiedNorma => ({
  code: 'Resolução CMN 5.123',
  classifiedAt: '2021-12-28',
  segment: 'atacado',
  theme: 'Requisitos de capital regulatório',
  applicable: true,
  orgao: 'CMN',
  tipo: 'Resolução',
  numero: '5.123',
  area: 'Gestão de Capital',
  diretoria: 'Riscos',
  ...patch
});
const data = (...normas: ClassifiedNorma[]): ClassificationData => ({ asOf: '2021-12-31', normas });

describe('validateClassification', () => {
  it('accepts a valid payload unchanged', () => {
    const payload = data(norma(), norma({ code: 'Circular BCB 3.700', applicable: false }));
    expect(validateClassification(payload)).toBe(payload);
  });

  it('rejects a payload without normas and repeated codes', () => {
    expect(() => validateClassification({ asOf: '2021-12-31' } as ClassificationData)).toThrowError(/without "normas"/);
    expect(() => validateClassification(data(norma(), norma()))).toThrowError(/unique code/);
  });

  it('rejects an invalid date, segment, theme or applicability', () => {
    expect(() => validateClassification(data(norma({ classifiedAt: '28/12/2021' })))).toThrowError(/invalid classifiedAt/);
    expect(() => validateClassification(data(norma({ segment: 'to-classify' })))).toThrowError(/unknown segment/);
    expect(() => validateClassification(data(norma({ theme: '' })))).toThrowError(/invalid theme/);
    expect(() => validateClassification(data(norma({ applicable: 'sim' as unknown as boolean })))).toThrowError(/invalid theme or applicability/);
    expect(() => validateClassification(data(norma({ diretoria: '' })))).toThrowError(/without orgao/);
  });
});

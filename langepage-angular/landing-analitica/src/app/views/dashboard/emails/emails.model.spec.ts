import { EmailsData, SuggestionEmail, validateEmails } from './emails.model';

const email = (patch: Partial<SuggestionEmail> = {}): SuggestionEmail => ({
  id: 'em-1',
  sentAt: '2021-12-28T09:14:00-03:00',
  subject: 'Sugestões de classificação — Atacado',
  segment: 'atacado',
  recipients: 3,
  normas: [
    {
      code: 'Resolução CMN 5.123',
      orgao: 'CMN',
      tipo: 'Resolução',
      numero: '5.123',
      title: 'Capital',
      suggestedClass: 'Aplicável',
      area: 'Gestão de Capital',
      diretoria: 'Riscos'
    }
  ],
  ...patch
});

const data = (...emails: SuggestionEmail[]): EmailsData => ({ asOf: '2021-12-31', emails });

describe('validateEmails', () => {
  it('accepts a valid payload and returns it unchanged', () => {
    const payload = data(email(), email({ id: 'em-2', segment: 'varejo' }));
    expect(validateEmails(payload)).toBe(payload);
  });

  it('accepts an empty list', () => {
    expect(validateEmails(data()).emails).toEqual([]);
  });

  it('rejects a payload without the emails list', () => {
    expect(() => validateEmails({ asOf: '2021-12-31' } as unknown as EmailsData)).toThrowError(/without "emails"/);
  });

  it('rejects duplicate or missing ids', () => {
    expect(() => validateEmails(data(email(), email()))).toThrowError(/unique id/);
    expect(() => validateEmails(data(email({ id: '' })))).toThrowError(/unique id/);
  });

  it('rejects an invalid sentAt', () => {
    expect(() => validateEmails(data(email({ sentAt: '28/12/2021' })))).toThrowError(/invalid sentAt/);
    expect(() => validateEmails(data(email({ sentAt: '2021-13-45T09:14:00-03:00' })))).toThrowError(/invalid sentAt/);
  });

  it('rejects an unknown segment, including the "to classify" series', () => {
    expect(() => validateEmails(data(email({ segment: 'outro' })))).toThrowError(/unknown segment/);
    expect(() => validateEmails(data(email({ segment: 'to-classify' })))).toThrowError(/unknown segment/);
  });

  it('rejects an e-mail without normas or with an invalid classification', () => {
    expect(() => validateEmails(data(email({ normas: [] })))).toThrowError(/no normas/);
    const bad = [{ code: 'X', title: 'Y', suggestedClass: 'Talvez' }] as unknown as SuggestionEmail['normas'];
    expect(() => validateEmails(data(email({ normas: bad })))).toThrowError(/invalid norma/);
    const noArea = [{ ...email().normas[0], area: '' }];
    expect(() => validateEmails(data(email({ normas: noArea })))).toThrowError(/invalid norma/);
  });
});

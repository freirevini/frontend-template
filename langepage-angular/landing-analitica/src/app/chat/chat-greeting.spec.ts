import { buildGreeting, greetingName, timeOfDayGreeting, withGreeting } from './chat-greeting';

const at = (hour: number, minute = 0) => new Date(2026, 9, 28, hour, minute);

describe('chat greeting', () => {
  it('follows the local clock: morning from 5h, afternoon from 12h, night from 18h until 4h59', () => {
    expect(timeOfDayGreeting(at(5))).toBe('Bom dia');
    expect(timeOfDayGreeting(at(11, 59))).toBe('Bom dia');
    expect(timeOfDayGreeting(at(12))).toBe('Boa tarde');
    expect(timeOfDayGreeting(at(17, 59))).toBe('Boa tarde');
    expect(timeOfDayGreeting(at(18))).toBe('Boa noite');
    expect(timeOfDayGreeting(at(0))).toBe('Boa noite');
    expect(timeOfDayGreeting(at(4, 59))).toBe('Boa noite');
  });

  it('keeps only a real first name, capitalized', () => {
    expect(greetingName('vinicius')).toBe('Vinicius');
    expect(greetingName('VINICIUS FREIRE SILVA')).toBe('Vinicius');
    expect(greetingName('  joão ')).toBe('João');
    expect(greetingName('ana-luíza')).toBe('Ana-Luíza');
    expect(greetingName("d'ávila")).toBe("D'Ávila");
  });

  it('never greets with a login or technical id', () => {
    ['DOMINIO\\vfreire', 'vinicius.freire', 'x12345', 'vinicius@empresa.com.br', '', undefined, 'a'.repeat(41)]
      .forEach(raw => expect(greetingName(raw)).withContext(String(raw)).toBe(''));
  });

  it('builds "Boa tarde, Vinicius!" or "Boa tarde!" without a name', () => {
    expect(buildGreeting({ firstName: 'vinicius' }, at(15))).toBe('Boa tarde, Vinicius!');
    expect(buildGreeting(undefined, at(15))).toBe('Boa tarde!');
    expect(buildGreeting({ firstName: 'DOMINIO\\vfreire' }, at(8))).toBe('Bom dia!');
  });

  it('puts the greeting at the start of the first lasting agent message, or adds one', () => {
    expect(withGreeting([{ role: 'ai', text: 'Busca…', transient: true }, { role: 'ai', text: 'Sou o agente.' }], 'Oi!').map(m => m.text))
      .toEqual(['Busca…', 'Oi! Sou o agente.']);
    expect(withGreeting([], 'Oi!')).toEqual([{ role: 'ai', text: 'Oi!' }]);
  });
});

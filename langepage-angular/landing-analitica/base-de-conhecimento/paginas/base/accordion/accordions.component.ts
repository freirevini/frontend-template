import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-accordions',
  templateUrl: './accordions.component.html',
  styleUrls: ['./accordions.component.scss']
})
export class AccordionsComponent {

  items = [1, 2, 3, 4];

  constructor(
    private sanitizer: DomSanitizer
  ) { }

  getAccordionBodyText(value: string) {
    const textSample = `
      <strong>Este é o corpo do item <mark>#${value}</mark> do acordeão.</strong> Ele fica oculto por
      padrão, até que o plugin de recolhimento adicione as classes apropriadas que usamos para
      estilizar cada elemento. Essas classes controlam a aparência geral, assim como
      a exibição e a ocultação por meio de transições CSS. Você pode modificar tudo isso com
      CSS personalizado ou sobrescrevendo nossas variáveis padrão. Também vale destacar
      que praticamente qualquer HTML pode ser colocado dentro de <code>.accordion-body</code>,
      embora a transição limite o transbordamento.
    `;
    return this.sanitizer.bypassSecurityTrustHtml(textSample);
  }
}

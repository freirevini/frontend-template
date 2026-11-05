import { Component } from '@angular/core';

@Component({
  selector: 'app-cards',
  templateUrl: './cards.component.html',
  styleUrls: ['./cards.component.scss']
})
export class CardsComponent {

  colors = [
    { color: 'primary', textColor: 'primary', label: 'Primário' },
    { color: 'secondary', textColor: 'secondary', label: 'Secundário' },
    { color: 'success', textColor: 'success', label: 'Sucesso' },
    { color: 'danger', textColor: 'danger', label: 'Perigo' },
    { color: 'warning', textColor: 'warning', label: 'Alerta' },
    { color: 'info', textColor: 'info', label: 'Informação' },
    { color: 'light', label: 'Claro' },
    { color: 'dark', label: 'Escuro' }
  ];

  imgContext = { $implicit: 'top', bottom: 'bottom' };

  constructor() { }

}

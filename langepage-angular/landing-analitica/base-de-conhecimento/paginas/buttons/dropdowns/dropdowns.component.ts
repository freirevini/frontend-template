import { Component } from '@angular/core';

@Component({
  selector: 'app-dropdowns',
  templateUrl: './dropdowns.component.html',
  styleUrls: ['./dropdowns.component.scss']
})
export class DropdownsComponent {

  public colors = ['primary', 'secondary', 'success', 'info', 'warning', 'danger'];
  public colorLabels: Record<string, string> = {
    primary: 'Primário',
    secondary: 'Secundário',
    success: 'Sucesso',
    info: 'Informação',
    warning: 'Alerta',
    danger: 'Perigo'
  };

  constructor() { }

}

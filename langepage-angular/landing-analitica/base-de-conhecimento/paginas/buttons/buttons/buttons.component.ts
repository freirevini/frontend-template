import { Component } from '@angular/core';

@Component({
  selector: 'app-buttons',
  templateUrl: './buttons.component.html',
  styleUrls: ['./buttons.component.scss']
})
export class ButtonsComponent {

  states = ['normal', 'active', 'disabled'];
  colors = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];
  stateLabels: Record<string, string> = {
    normal: 'Normal',
    active: 'Ativo',
    disabled: 'Desabilitado'
  };
  colorLabels: Record<string, string> = {
    primary: 'Primário',
    secondary: 'Secundário',
    success: 'Sucesso',
    danger: 'Perigo',
    warning: 'Alerta',
    info: 'Informação',
    light: 'Claro',
    dark: 'Escuro'
  };

  constructor() { }
}

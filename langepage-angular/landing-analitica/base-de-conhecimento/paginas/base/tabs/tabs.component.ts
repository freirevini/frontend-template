import { Component } from '@angular/core';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss']
})
export class TabsComponent {

  public panes = [
    { name: 'Início 01', id: 'tab-01' },
    { name: 'Perfil 02', id: 'tab-02' },
    { name: 'Contato 03', id: 'tab-03' }
  ];

  constructor() { }

}

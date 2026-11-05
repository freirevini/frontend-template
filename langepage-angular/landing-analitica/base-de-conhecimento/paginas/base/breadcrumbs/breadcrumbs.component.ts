import { Component, OnInit } from '@angular/core';

@Component({
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.scss']
})
export class BreadcrumbsComponent implements OnInit {
  public items = <any>[];

  constructor() {}

  ngOnInit(): void {
    this.items = [
      { label: 'Início', url: '/', attributes: { title: 'Início' } },
      { label: 'Biblioteca', url: '/' },
      { label: 'Dados', url: '/dashboard/' },
      { label: 'Painel', url: '/' }
    ];

    setTimeout(() => {
      this.items = [
        { label: 'Painel', url: '/' },
        { label: 'Dados', url: '/dashboard/' },
        { label: 'Biblioteca', url: '/' },
        { label: 'Início', url: '/', attributes: { title: 'Início' } }
      ];
    }, 5000);
  }
}

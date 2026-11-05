import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';

import { IconSetService } from '@coreui/icons-angular';
import { iconSubset } from './icons/icon-subset';
import { Title } from '@angular/platform-browser';
import { ThemeService } from './core/services/theme.service';

@Component({
    selector: 'app-root',
    template: '<router-outlet></router-outlet>',
    imports: [RouterOutlet],
})
export class AppComponent implements OnInit {
  title = 'Agenda Normativa';

  constructor(
    private router: Router,
    private titleService: Title,
    private iconSetService: IconSetService,
    // Instantiated here so the saved color mode is applied at bootstrap.
    private themeService: ThemeService
  ) {
    titleService.setTitle(this.title);
    // iconSet singleton
    iconSetService.icons = { ...iconSubset };
  }

  ngOnInit(): void {
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
    });
  }
}

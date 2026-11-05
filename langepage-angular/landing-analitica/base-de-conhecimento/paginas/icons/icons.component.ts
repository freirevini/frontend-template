import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { IconSetService } from '@coreui/icons-angular';
import { brandSet, flagSet, freeSet } from '@coreui/icons';

@Component({
  templateUrl: 'icons.component.html',
  providers: [IconSetService],
})
export class IconsComponent implements OnInit {
  public title = 'Ícones';
  public icons!: [string, string[]][];

  constructor(
    private route: ActivatedRoute, public iconSet: IconSetService
  ) {
    iconSet.icons = { ...freeSet, ...brandSet, ...flagSet };
  }

  ngOnInit() {
    const path = this.route?.routeConfig?.path;
    let prefix = 'cil';
    if (path === 'general') {
      this.title = `${this.title} - Gerais`;
      prefix = 'cil';
    } else if (path === 'brands') {
      this.title = `${this.title} - Marcas`;
      prefix = 'cib';
    } else if (path === 'flags') {
      this.title = `${this.title} - Bandeiras`;
      prefix = 'cif';
    }
    this.icons = this.getIconsView(prefix);
  }

  toKebabCase(str: string) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  getIconsView(prefix: string) {
    return Object.entries(this.iconSet.icons).filter((icon) => {
      // Third-party branding rule (R8): the template vendor's own logos are not shown.
      return icon[0].startsWith(prefix) && !/coreui/i.test(icon[0]);
    });
  }
}

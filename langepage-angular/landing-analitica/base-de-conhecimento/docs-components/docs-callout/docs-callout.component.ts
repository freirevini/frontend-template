import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-docs-callout',
  templateUrl: './docs-callout.component.html',
  styleUrls: ['./docs-callout.component.scss']
})
export class DocsCalloutComponent {

  @Input() name: string = '';

}

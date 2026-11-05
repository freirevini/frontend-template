import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input
} from '@angular/core';

@Component({
  selector: 'app-docs-example',
  templateUrl: './docs-example.component.html',
  styleUrls: ['./docs-example.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocsExampleComponent implements AfterContentInit, AfterViewInit {

  constructor(
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  @Input() fragment?: string;

  ngAfterContentInit(): void {
    this.changeDetectorRef.detectChanges();
  }

  ngAfterViewInit(): void {
    this.changeDetectorRef.markForCheck();
  }
}

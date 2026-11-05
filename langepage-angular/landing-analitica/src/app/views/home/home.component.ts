import { Component } from '@angular/core';
import { SegmentOverviewComponent } from '../widgets/segment-overview/segment-overview.component';

/** "Início" page: overview card of each business segment (<app-segment-overview>). */
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    imports: [SegmentOverviewComponent]
})
export class HomeComponent {}

import { Component } from '@angular/core';
import { WidgetsDropdownComponent } from '../widgets/widgets-dropdown/widgets-dropdown.component';
import { WaterfallChartComponent } from './waterfall/waterfall-chart.component';
import { RowComponent, ColComponent, CardComponent, CardHeaderComponent, CardBodyComponent, ProgressBarDirective, ProgressComponent, ProgressBarComponent, ButtonDirective } from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';

/** "Scalation" page: hosts the Cascata do resultado chart and the "Tráfego e vendas" card (template demo, static). */
@Component({
    selector: 'app-scalation',
    templateUrl: './scalation.component.html',
    imports: [WidgetsDropdownComponent, WaterfallChartComponent, RowComponent, ColComponent, CardComponent, CardHeaderComponent, CardBodyComponent, ProgressBarDirective, ProgressComponent, ProgressBarComponent, IconDirective, ButtonDirective]
})
export class ScalationComponent {}

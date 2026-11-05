import { Component, ElementRef, NgZone, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';

import { SectionScrollService } from '../../core/navigation/section-scroll';
import { navItems } from './_nav';
import { SidebarComponent, SidebarBrandComponent, SidebarNavComponent, ContainerComponent } from '@coreui/angular';
import { NgScrollbar } from 'ngx-scrollbar';
import { DefaultHeaderComponent } from './default-header/default-header.component';
import { DefaultFooterComponent } from './default-footer/default-footer.component';
import { ChatWidgetComponent } from '../../chat/chat-widget/chat-widget.component';
import { SessionExpiredNoticeComponent } from '../../core/http/session-expired-notice.component';

@Component({
    selector: 'app-dashboard',
    templateUrl: './default-layout.component.html',
    imports: [
        SidebarComponent,
        SidebarBrandComponent,
        RouterLink,
        NgScrollbar,
        SidebarNavComponent,
        DefaultHeaderComponent,
        ContainerComponent,
        RouterOutlet,
        DefaultFooterComponent,
        ChatWidgetComponent,
        SessionExpiredNoticeComponent,
    ],
})
export class DefaultLayoutComponent implements OnDestroy {

  public navItems = navItems;

  private readonly destroy$ = new Subject<void>();

  constructor(router: Router, sectionScroll: SectionScrollService, host: ElementRef<HTMLElement>, zone: NgZone) {
    router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe((event) => {
        // Sidebar sub-items point to page sections (#fragment): keep the section aligned while the page's cards load.
        sectionScroll.follow(router.parseUrl(event.urlAfterRedirects).fragment);
        // CoreUI (4 and 5) cannot match "/triagent#section" to the "/triagent" group, so a page opened by a section link
        // starts with its group closed: open the group that holds the active link (same as the user clicking it).
        zone.runOutsideAngular(() => setTimeout(() => zone.run(() => openActiveGroup(host.nativeElement))));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

/** Clicks the toggle of every closed sidebar group that contains the active link. */
export function openActiveGroup(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.nav-group').forEach((group) => {
    if (!isGroupOpen(group) && group.querySelector('.nav-group-items a.active')) {
      group.querySelector<HTMLElement>('.nav-group-toggle')?.click();
    }
  });
}

/**
 * CoreUI 5 puts routerLinkActive="show" on c-sidebar-nav-group, which strips the "show" class of an open group,
 * so the class alone is not reliable: an open group also has its item list rendered with height (E-006).
 */
function isGroupOpen(group: HTMLElement): boolean {
  const items = group.querySelector<HTMLElement>(':scope > .nav-group-items');
  return group.classList.contains('show') || (items?.offsetHeight ?? 0) > 0;
}

import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ToolbarEventService } from '../toolbar-event.service';
import { select, Store } from '@ngrx/store';
import * as fromIcpSelectors from '../../store/selectors/icp.selectors';
import { Subscription } from 'rxjs';
import { IcpState } from '../../icp/icp.interfaces';
import { IcpEventService } from '../icp-event.service';

@Component({
    selector: 'mv-icp-toolbar',
    templateUrl: './icp-toolbar.component.html',
    standalone: false
})
export class IcpToolbarComponent implements OnInit, OnDestroy {
  readonly toolbarEventService = inject(ToolbarEventService);
  private store = inject<Store<IcpState>>(Store);
  readonly icpEventService = inject(IcpEventService);


  presenterName: string;
  isPresenter: boolean;

  private $subscription: Subscription;

  ngOnInit() {
    this.$subscription = this.store.pipe(select(fromIcpSelectors.isPresenter))
      .subscribe(isPresenter => this.isPresenter = isPresenter);
    this.$subscription.add(this.store.pipe(select(fromIcpSelectors.getPresenterName))
      .subscribe(name => this.presenterName = name));
  }

  ngOnDestroy() {
    this.$subscription.unsubscribe();
  }

  present() {
    this.icpEventService.becomePresenter();
  }

  stopPresenting() {
    this.icpEventService.stopPresenting();
  }

  leaveIcpSession() {
    this.icpEventService.leaveSession();
  }

  showParticipantsList() {
    this.toolbarEventService.toggleParticipantsList(!this.icpEventService.participantsListVisible.getValue());
  }
}

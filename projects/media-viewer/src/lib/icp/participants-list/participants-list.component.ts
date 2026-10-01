import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { ToolbarEventService } from '../../toolbar/toolbar-event.service';
import { IcpParticipant, IcpState } from '../icp.interfaces';
import { select, Store } from '@ngrx/store';
import * as fromSelectors from '../../store/selectors/icp.selectors';
import { IcpEventService } from '../../toolbar/icp-event.service';

@Component({
    selector: 'mv-participants-list',
    templateUrl: './participants-list.component.html',
    standalone: false
})
export class ParticipantsListComponent implements OnInit, OnDestroy {
  private readonly toolbarEvents = inject(ToolbarEventService);
  private store = inject<Store<IcpState>>(Store);
  private readonly icpEventService = inject(IcpEventService);


  subscription: Subscription;
  participants$: Observable<IcpParticipant[]>;
  presenter$: Observable<IcpParticipant>;
  isPresenter$: Observable<boolean>;

  showParticipantsList = false;

  ngOnInit() {
    this.participants$ = this.store.pipe(select(fromSelectors.getParticipants));
    this.presenter$ = this.store.pipe(select(fromSelectors.getPresenter));
    this.isPresenter$ = this.store.pipe(select(fromSelectors.isPresenter));

    this.subscription = this.icpEventService.participantsListVisible.subscribe(isVisible => this.showParticipantsList = isVisible);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}

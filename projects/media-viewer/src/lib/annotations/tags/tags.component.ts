import { Component, Input, ViewEncapsulation, inject } from '@angular/core';
import {TagsModel} from '../models/tags.model';
import {TagsServices} from '../services/tags/tags.services';
import {UntypedFormControl} from '@angular/forms';
import {Observable} from 'rxjs';

@Component({
    selector: 'mv-tags',
    templateUrl: './tags.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class TagsComponent {
  private tagsServices = inject(TagsServices);

  @Input() tagItems: TagsModel[];
  @Input() userId: string;
  @Input() editable: boolean;
  @Input() annoId: string;

  public validators = [this.minLength, this.maxLength20];
  public errorMessages: {[id: string]: string} = {
    'minLength': 'Minimum of 2 characters',
    'maxLength20': 'Maximum of 20 characters'
  };

  onUpdateTags(value) {
    this.tagsServices.updateTagItems(value, this.annoId);
  }

  public requestAutocompleteItems = (text: string): Observable<any[]> => {
    return this.tagsServices.getAllTags(this.userId);
  }

  private minLength(control: UntypedFormControl) {
    if (control.value.length < 2) {
      return {
        'minLength': true
      };
    }
    return null;
  }

  private maxLength20(control: UntypedFormControl) {
    if (control.value.length >= 20) {
      return {
        'maxLength20': true
      };
    }
    return null;
  }
}

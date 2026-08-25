import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AssetStatus, STATUS_LABEL } from '../core/models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge badge--' + cssClass()">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input.required<AssetStatus>();

  readonly label = computed(() => STATUS_LABEL[this.status()]);
  readonly cssClass = computed(() => this.status().toLowerCase());
}

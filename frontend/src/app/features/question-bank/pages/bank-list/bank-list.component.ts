import { Component, resource, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Plus, Database } from 'lucide-angular';
import { BancosService } from '../../../../core/services/bancos.service';

@Component({
  selector: 'app-bank-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './bank-list.component.html',
  styleUrls: ['./bank-list.component.scss']
})
export class BankListComponent {
  private readonly bancosService = inject(BancosService);
  
  readonly PlusIcon = Plus;
  readonly DatabaseIcon = Database;

  bancosResource = resource({
    loader: () => {
      return new Promise<any[]>((resolve, reject) => {
        this.bancosService.getAllBancos().subscribe({
          next: resolve,
          error: reject
        });
      });
    }
  });
}

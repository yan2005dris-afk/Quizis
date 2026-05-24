import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Plus, Database } from 'lucide-angular';

@Component({
  selector: 'app-bank-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './bank-list.component.html',
  styleUrls: ['./bank-list.component.scss']
})
export class BankListComponent {
  readonly PlusIcon = Plus;
  readonly DatabaseIcon = Database;

  banks = signal([
    { id: 1, name: 'Banco de Geografía', questionCount: 25, type: 'JSON', createdAt: new Date() },
    { id: 2, name: 'Ciencias Naturales', questionCount: 40, type: 'EXCEL', createdAt: new Date() }
  ]);
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/ui';

@Component({
  selector: 'app-bank-create',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent],
  templateUrl: './bank-create.component.html',
  styleUrls: ['./bank-create.component.scss'],
})
export class BankCreateComponent {}

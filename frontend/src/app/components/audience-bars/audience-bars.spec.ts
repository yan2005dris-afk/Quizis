import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudienceBars } from './audience-bars';

describe('AudienceBars', () => {
  let component: AudienceBars;
  let fixture: ComponentFixture<AudienceBars>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AudienceBars],
    }).compileComponents();

    fixture = TestBed.createComponent(AudienceBars);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

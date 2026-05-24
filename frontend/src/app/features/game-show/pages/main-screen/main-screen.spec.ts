import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainScreen } from './main-screen';

describe('MainScreen', () => {
  let component: MainScreen;
  let fixture: ComponentFixture<MainScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainScreen],
    }).compileComponents();

    fixture = TestBed.createComponent(MainScreen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

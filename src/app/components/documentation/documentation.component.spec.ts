import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentationPageComponent } from './documentation-page.component';
import { CommonModule } from '@angular/common'; // Add this

describe('DocumentationPageComponent', () => {
  let component: DocumentationPageComponent;
  let fixture: ComponentFixture<DocumentationPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Remove the standalone import
      // imports: [DocumentationPageComponent] // <-- REMOVE THIS LINE
      declarations: [DocumentationPageComponent], // Add this instead
      imports: [CommonModule] // Add this
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
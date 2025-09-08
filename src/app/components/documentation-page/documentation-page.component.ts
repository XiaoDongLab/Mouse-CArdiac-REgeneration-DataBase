import { Component } from '@angular/core';
import { CellTypes } from 'src/app/services/database-consts.service';

@Component({
  selector: 'app-documentation-page',
  standalone: false,
  templateUrl: './documentation-page.component.html',
  styleUrl: './documentation-page.component.css'
})
export class DocumentationPageComponent {
  cellTypes = CellTypes;
}

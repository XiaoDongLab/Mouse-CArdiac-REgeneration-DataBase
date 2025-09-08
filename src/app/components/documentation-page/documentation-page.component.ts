import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CellTypes } from 'src/app/services/database-consts.service';
import { LociService } from 'src/app/services/loci.service';

@Component({
  selector: 'app-documentation-page',
  standalone: false,
  templateUrl: './documentation-page.component.html',
  styleUrl: './documentation-page.component.css'
})
export class DocumentationPageComponent {
  cellTypes = CellTypes;
  geneRerout(item: string) {
    this.lociService.setLocus(item);
    this.router.navigate(['/igv']);
  }

  constructor(public lociService: LociService, private router: Router, public translateService: TranslateService) {

  }
}

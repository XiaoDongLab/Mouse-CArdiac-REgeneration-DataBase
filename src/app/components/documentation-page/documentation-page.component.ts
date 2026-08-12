import { AfterViewInit, Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AppCitation } from 'src/app/app.component';
import { CellTypes } from 'src/app/services/database-consts.service';
import { LociService } from 'src/app/services/loci.service';

interface DocumentationSection {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-documentation-page',
  standalone: false,
  templateUrl: './documentation-page.component.html',
  styleUrl: './documentation-page.component.css'
})
export class DocumentationPageComponent implements AfterViewInit {
  readonly cellTypes = CellTypes;
  readonly citation = AppCitation;
  readonly sections: DocumentationSection[] = [
    { id: 'overview', label: 'Overview', icon: 'fa-compass' },
    { id: 'quick-start', label: 'Choose a workflow', icon: 'fa-route' },
    { id: 'dataset', label: 'Dataset & terminology', icon: 'fa-database' },
    { id: 'genome-browser', label: 'Genome Browser', icon: 'fa-dna' },
    { id: 'gene-expression', label: 'Gene Expression', icon: 'fa-chart-column' },
    { id: 'spatial', label: 'Spatial Transcriptomics', icon: 'fa-location-dot' },
    { id: 'pathway', label: 'Pathway Enrichment', icon: 'fa-diagram-project' },
    { id: 'download', label: 'Search & Download', icon: 'fa-download' },
    { id: 'settings', label: 'Settings', icon: 'fa-sliders' },
    { id: 'interpretation', label: 'Interpretation guide', icon: 'fa-chart-line' },
    { id: 'cell-types', label: 'Cell clusters', icon: 'fa-cells' },
    { id: 'citation', label: 'Citation & sources', icon: 'fa-book-open' }
  ];
  activeSection = 'overview';

  ngAfterViewInit(): void {
    window.setTimeout(() => this.updateActiveSection());
  }

  @HostListener('window:scroll')
  updateActiveSection(): void {
    const offset = 150;
    let current = this.sections[0].id;

    for (const section of this.sections) {
      const element = document.getElementById(section.id);
      if (element && element.getBoundingClientRect().top <= offset) current = section.id;
    }

    this.activeSection = current;
  }

  scrollTo(sectionId: string): void {
    this.activeSection = sectionId;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openTool(route: string): void {
    this.router.navigate([route]);
  }

  geneRerout(item: string) {
    this.lociService.setLocus(item);
    this.router.navigate(['/igv']);
  }

  constructor(public lociService: LociService, private router: Router, public translateService: TranslateService) {

  }
}

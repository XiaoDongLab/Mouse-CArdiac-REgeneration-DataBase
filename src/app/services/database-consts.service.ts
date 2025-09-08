import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseConstsService {
  tissueTypes: string[] = [
    "Heart",
    "Bone Marrow"
  ]
  cellTypes: string[] = [
    "Adipose progenitor cell", "Adipose-derived stem cell", "Adipose-derived stromal cell", "Adipose multilineage-differentiating stress-enduring cell", "Beige adipogenic precursor cell",
    "Type I pneumocyte", "Urine-derived stem cell", "Vaginal cell", "Atypical memory B cell", "Well-established epicardial progenitor cell", "Mural cell", "Endothelial cell", "Endothelial cell 2", "Sinoatrial node (SAN) cell",
    "Macrophage", "Cardiomyocyte", "M2 macrophage", "Cardiomyocyte 2", "Cardiomyocyte 3", "Endothelial cell", "Fibroblast", "Fibroblast 2", "Fibroblast 3", "Progenitor cell", "Atrial cell", "Airway secretory cell", "Alpha cell", "Alveolar epithelial progenitor cell", "Astrocyte", "B cell", "Basal cell", "Beta cell"
  ]

  DiffExpCellTypes = [
    "All Cells",
    "Cardiac cell",
    "B cell",
    "T cell",
    "Red blood cell",
    "Granulocyte",
    "Cardiomyocyte",
    "Cardiomyocyte 1",
    "Cardiomyocyte 1 2",
    "Cardiomyocyte 1 3",
    "Cardiomyocyte 1 4",
    "Cardiomyocyte 2",
    "Cardiomyocyte 2 2",
    "Cardiomyocyte 2 3",
    "Cardiomyocyte 2 4",
    "Cardiomyocyte 3",
    "Cardiomyocyte 4",
    "Cardiomyocyte 4 2",
    "Sinoatrial node (SAN) cell",
    "Sinoatrial node cell",
    "Endothelial cell",
    "Endothelial cell 2",
    "Endothelial cell 3",
    "Endothelial cell 4",
    "Endothelial cell 5",
    "Endothelial cell 6",
    "Macrophage",
    "Macrophage 2",
    "M2 macrophage",
    "Fibroblast",
    "Fibroblast 2",
    "Fibroblast 3",
    "Fibroblast 4",
    "Fibroblast 5",
    "Fibroblast 6",
    "Mural cell",
    "Well-established epicardial progenitor cell",
    "Progenitor cell",
    "Activated fibroblast"
  ];

  searchCellTypes = [
    "All Cells",
    "Cardiac cell",
    "B cell",
    "T cell",
    "Red blood cell",
    "Granulocyte",
    "Cardiomyocyte",
    "Cardiomyocyte 1",
    "Cardiomyocyte 2",
    "Cardiomyocyte 3",
    "Cardiomyocyte 4",
    "Sinoatrial node (SAN) cell",
    "Sinoatrial node cell",
    "Endothelial cell",
    "Endothelial cell 2",
    "Endothelial cell 3",
    "Endothelial cell 4",
    "Endothelial cell 5",
    "Endothelial cell 6",
    "Macrophage",
    "Macrophage 2",
    "M2 macrophage",
    "Fibroblast",
    "Fibroblast 2",
    "Fibroblast 3",
    "Fibroblast 4",
    "Fibroblast 5",
    "Fibroblast 6",
    "Mural cell",
    "Well-established epicardial progenitor cell",
    "Progenitor cell",
    "Activated fibroblast"
  ];

  species: string[] = [
    "matrix", "barcodes", "tsne", "umap", "info", "features", "diffExp", "Pathway Enrich", "DEG Results"
  ]

  DiffExpPMIDTissueDict: { [key: string]: number[] } = {
    "Bone Marrow": [30518681],
    "Brain": [31316211, 31178122],
    "Colon": [32888429, 34428183],
    "Kidney": [31896769],
    "Liver": [30348985, 35021063],
    "Lung": [30554520, 36108172],
    "Pancreas": [30865899, 34450029],
    "Heart": [33296652, 34489413, 38510108]
  };

  loadKEGGPathways(): Observable<{ [key: string]: string }> {
    return this.http.get<{ [key: string]: string }>('/assets/kegg_pathways_map.json')
      .pipe(
        catchError(error => {
          console.error('Error loading gene mappings:', error);
          return of({});
        })
      );
  }



  getTissueTypes() {
    return this.tissueTypes
  }
  getCellTypes() {
    return this.cellTypes
  }
  getSpecies() {
    return this.species
  }
  getDePmidTissueDict() {
    return this.DiffExpPMIDTissueDict
  }
  getDECellTypes() {
    return this.DiffExpCellTypes
  }

  getSearchCellTypes() {
    return this.searchCellTypes;
  }

  constructor(private http: HttpClient) { }
}

export const CellTypes = [
  /*
   * defined as:
   * name: string | translate, def: string | translate, marker: string | translate, subsets: Array<type>
   */
  {
    name: 'celltypes.bcell.name',
    def: 'celltypes.bcell.def',
    marker: 'celltypes.bcell.marker',
    subsets: [],
  },
  {
    name: 'celltypes.cardiaccell.name',
    def: 'celltypes.cardiaccell.def',
    marker: 'celltypes.cardiaccell.marker',
    subsets: [],
  },
  {
    name: 'celltypes.cardiomyocytes.name',
    def: 'celltypes.cardiomyocytes.def',
    subsets: [
      {
        name: "celltypes.cardiomyocytes.subs.1.name",
        def: "celltypes.cardiomyocytes.subs.1.def",
        marker: "celltypes.cardiomyocytes.subs.1.marker",
      },
      {
        name: "celltypes.cardiomyocytes.subs.2.name",
        def: "celltypes.cardiomyocytes.subs.2.def",
        marker: "celltypes.cardiomyocytes.subs.2.marker",
      },
      {
        name: "celltypes.cardiomyocytes.subs.3.name",
        def: "celltypes.cardiomyocytes.subs.3.def",
        marker: "celltypes.cardiomyocytes.subs.3.marker",
      },
      {
        name: "celltypes.cardiomyocytes.subs.4.name",
        def: "celltypes.cardiomyocytes.subs.4.def",
        marker: "celltypes.cardiomyocytes.subs.4.marker",
      },
      {
        name: "celltypes.cardiomyocytes.subs.5.name",
        def: "celltypes.cardiomyocytes.subs.5.def",
        marker: "celltypes.cardiomyocytes.subs.5.marker",
      },
    ],
  },
  {
    name: 'celltypes.endothelial.name',
    def: 'celltypes.endothelial.def',
    marker: 'celltypes.endothelial.marker',
    subsets: [],
  },
  {
    name: 'celltypes.weepc.name',
    def: 'celltypes.weepc.def',
    marker: 'celltypes.weepc.marker',
    subsets: [],
  },
  {
    name: 'celltypes.fibroblast.name',
    def: 'celltypes.fibroblast.def',
    marker: 'celltypes.fibroblast.marker',
    subsets: [],
  },
  {
    name: 'celltypes.ac-fibroblast.name',
    def: 'celltypes.ac-fibroblast.def',
    marker: 'celltypes.ac-fibroblast.marker',
    subsets: [],
  },
  {
    name: 'celltypes.granulocyte.name',
    def: 'celltypes.granulocyte.def',
    marker: 'celltypes.granulocyte.marker',
    subsets: [],
  },
  {
    name: 'celltypes.macrophage.name',
    def: 'celltypes.macrophage.def',
    marker: 'celltypes.macrophage.marker',
    subsets: [],
  },
  {
    name: 'celltypes.mural.name',
    def: 'celltypes.mural.def',
    marker: 'celltypes.mural.marker',
    subsets: [],
  },
  {
    name: 'celltypes.progenitor.name',
    def: 'celltypes.progenitor.def',
    marker: 'celltypes.progenitor.marker',
    subsets: [],
  },
  {
    name: 'celltypes.rbc.name',
    def: 'celltypes.rbc.def',
    marker: 'celltypes.rbc.marker',
    subsets: [],
  },
  {
    name: 'celltypes.sinoatrial.name',
    def: 'celltypes.sinoatrial.def',
    marker: 'celltypes.sinoatrial.marker',
    subsets: [],
  },
  {
    name: 'celltypes.tcell.name',
    def: 'celltypes.tcell.def',
    marker: 'celltypes.tcell.marker',
    subsets: [],
  },
]
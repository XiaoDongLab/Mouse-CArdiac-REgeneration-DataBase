import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';

export type SpatialSurgery = 'MI' | 'Sham';
export type SpatialFeatureType = 'gene' | 'cell_type';

export interface SpatialSample {
  sampleKey: number;
  accession: string;
  label: string;
  surgery: SpatialSurgery;
  timepoint: '3 dpi' | '7 dpi';
  replicate: number;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  spotDiameter: number;
  flipHorizontal?: boolean;
}

export interface SpatialCellType {
  cell_type_id: number;
  source_name: string;
  display_name: string;
}

export interface SpatialCellTypesResponse {
  cellTypes: SpatialCellType[];
  aliases: string[];
}

export interface SpatialGene {
  gene_id: number;
  symbol: string;
}

export interface SpatialSpot {
  spotId: number;
  barcode: string;
  x: number;
  y: number;
  xHires: number;
  yHires: number;
  inTissue: boolean;
  rawCount?: number;
  value: number;
}

export interface SpatialLayerResponse {
  sample: SpatialSample;
  feature: {
    type: SpatialFeatureType;
    name: string;
    normalization: string;
  };
  spots: SpatialSpot[];
  min?: number;
  max?: number;
}

const apiOrigin = 'https://api.mcaredb.org:3305';
const spatialApiUrl = `${apiOrigin}/api/spatial`;
const paperFlippedSamples = new Set(['GSM4983123']);

@Injectable({ providedIn: 'root' })
export class SpatialService {
  constructor(private readonly http: HttpClient) {}

  getSamples(): Observable<SpatialSample[]> {
    return this.http.get<SpatialSample[]>(`${spatialApiUrl}/samples`).pipe(
      map(samples => samples.map(sample => ({
        ...sample,
        // Figure 1f in Cui et al. mirrors this deposited PNG horizontally.
        flipHorizontal: paperFlippedSamples.has(sample.accession)
      })))
    );
  }

  getCellTypes(): Observable<SpatialCellTypesResponse> {
    return this.http.get<SpatialCellTypesResponse>(`${spatialApiUrl}/cell-types`);
  }

  getGenes(query: string, limit = 20): Observable<SpatialGene[]> {
    const normalizedLimit = Math.max(1, Math.min(100, limit));
    const variants = this.geneQueryVariants(query);
    const requests = variants.map(variant => {
      const params = new HttpParams()
        .set('q', variant)
        .set('limit', normalizedLimit);
      return this.http.get<SpatialGene[]>(`${spatialApiUrl}/genes`, { params });
    });

    return forkJoin(requests).pipe(
      map(results => {
        const genes = new Map<number, SpatialGene>();
        results.flat().forEach(gene => genes.set(gene.gene_id, gene));
        const lowerQuery = query.trim().toLocaleLowerCase();
        return [...genes.values()]
          .sort((a, b) => {
            const aExact = a.symbol.toLocaleLowerCase() === lowerQuery ? 0 : 1;
            const bExact = b.symbol.toLocaleLowerCase() === lowerQuery ? 0 : 1;
            return aExact - bExact || a.symbol.localeCompare(b.symbol);
          })
          .slice(0, normalizedLimit);
      })
    );
  }

  getGeneLayer(accession: string, symbol: string): Observable<SpatialLayerResponse> {
    return this.http.get<SpatialLayerResponse>(
      `${spatialApiUrl}/samples/${encodeURIComponent(accession)}/gene/${encodeURIComponent(symbol)}`
    );
  }

  getCellTypeLayer(accession: string, cellType: string): Observable<SpatialLayerResponse> {
    return this.http.get<SpatialLayerResponse>(
      `${spatialApiUrl}/samples/${encodeURIComponent(accession)}/cell-type/${encodeURIComponent(cellType)}`
    );
  }

  private geneQueryVariants(query: string): string[] {
    const value = query.trim();
    if (!value) return [''];

    const variants = new Set([value]);
    variants.add(value.charAt(0).toLocaleUpperCase() + value.slice(1));
    variants.add(value.charAt(0).toLocaleUpperCase() + value.slice(1).toLocaleLowerCase());

    if (/^mt-/i.test(value)) {
      const suffix = value.slice(3);
      variants.add(`mt-${suffix.charAt(0).toLocaleUpperCase()}${suffix.slice(1).toLocaleLowerCase()}`);
    }

    const rikenMatch = value.match(/^(\d+)([a-z])(\d+)rik$/i);
    if (rikenMatch) {
      variants.add(`${rikenMatch[1]}${rikenMatch[2].toLocaleUpperCase()}${rikenMatch[3]}Rik`);
    }

    return [...variants];
  }
}

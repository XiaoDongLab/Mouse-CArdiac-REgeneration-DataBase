import { SpatialSpot } from '../../services/spatial.service';

export interface SpatialClusterFit {
  zoom: number;
  centerX: number;
  centerY: number;
  occupiedWidth: number;
  occupiedHeight: number;
}

export function calculateSpatialClusterFit(
  spots: SpatialSpot[],
  maxZoom = 250,
  occupiedFraction = .84
): SpatialClusterFit {
  const coordinates = spots
    .filter(spot => spot.inTissue && Number.isFinite(spot.x) && Number.isFinite(spot.y));
  if (coordinates.length < 2) {
    return {
      zoom: 100,
      centerX: .5,
      centerY: .5,
      occupiedWidth: 1,
      occupiedHeight: 1
    };
  }

  const xs = coordinates.map(spot => spot.x).sort((a, b) => a - b);
  const ys = coordinates.map(spot => spot.y).sort((a, b) => a - b);
  const trim = coordinates.length >= 50 ? Math.floor(coordinates.length * .02) : 0;
  const minX = xs[trim];
  const maxX = xs[xs.length - 1 - trim];
  const minY = ys[trim];
  const maxY = ys[ys.length - 1 - trim];
  const occupiedWidth = Math.max(.01, maxX - minX);
  const occupiedHeight = Math.max(.01, maxY - minY);
  const zoom = Math.max(100, Math.min(
    maxZoom,
    Math.floor(Math.min(occupiedFraction / occupiedWidth, occupiedFraction / occupiedHeight) * 100)
  ));

  return {
    zoom,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    occupiedWidth,
    occupiedHeight
  };
}

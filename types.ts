export interface MapData {
  id: string;
  name: string;
  url: string;
  createdAt: number;
  isFavorite?: boolean;
  width?: number;
  height?: number;
}

export enum AppView {
  LIBRARY = 'LIBRARY',
  VIEWER = 'VIEWER'
}

export interface DragPosition {
  x: number;
  y: number;
}
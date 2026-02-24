export interface MapData {
  id: string;
  name: string;
  url: string;
  file: File;
  createdAt: number;
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
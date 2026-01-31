export enum DrawTool {
  PEN = 'PEN',
  ERASER = 'ERASER',
  SELECT = 'SELECT',
}

export enum ByteOrder {
  MSB_FIRST = 'MSB_FIRST',
  LSB_FIRST = 'LSB_FIRST',
}

export enum ScanMode {
  HORIZONTAL_RASTER = 'HORIZONTAL_RASTER', // Standard CRT-like scanning
  VERTICAL_PAGE = 'VERTICAL_PAGE', // Common in SSD1306/OLED controllers (Page Addressing)
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface ImportSettings {
  threshold: number;
  invert: boolean;
  scaleMode: 'fit' | 'stretch' | 'center';
}

export interface Preset {
  name: string;
  width: number;
  height: number;
}

export interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FloatingLayer {
  x: number;
  y: number;
  w: number;
  h: number;
  data: Uint8Array;
}
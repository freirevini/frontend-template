declare module '@coreui/chartjs/dist/js/coreui-chartjs.js';

declare module '*.json' {
  const value: any;
  export default value;
}

// exceljs browser build, typed locally in src/app/core/export/xlsx-export.ts (its own typings need Node types).
declare module 'exceljs/dist/exceljs.min.js';

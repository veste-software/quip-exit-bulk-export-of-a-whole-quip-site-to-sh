export type PresetId = 'sharepoint' | 'drive' | 'notion' | 'archive';

export interface Preset {
  id: PresetId;
  label: string;
  /** Which file each document is opened from. */
  main: 'html' | 'native' | 'md';
  /** Where the HTML copy lives: beside the native file, under _archive/, or not at all. */
  html: 'beside' | 'archive-dir' | 'none';
  /** What a second folder gets for a document that lives in two folders. */
  shortcuts: 'html-stub' | 'url' | 'md-stub' | 'none';
  steps: string[];
}

export const PRESETS: Record<PresetId, Preset> = {
  sharepoint: {
    id: 'sharepoint',
    label: 'SharePoint',
    main: 'native',
    html: 'archive-dir',
    shortcuts: 'url',
    steps: [
      'Unzip the file. Keep the folder structure as it is.',
      'Open the target document library in File Explorer through OneDrive sync, or use “Upload folder” in the browser.',
      'Copy the folders (not the _archive folder, unless you want the HTML copies with comments and working links) into the library.',
      'Documents that lived in two folders were stored once; the other folder holds a .url shortcut that points to the stored copy.',
      'Links between documents inside _archive/ are already relative. For the .docx files, use link-map.csv to fix links later.',
    ],
  },
  drive: {
    id: 'drive',
    label: 'Google Drive',
    main: 'native',
    html: 'none',
    shortcuts: 'none',
    steps: [
      'Unzip the file. Keep the folder structure as it is.',
      'In Google Drive choose New > Folder upload and select the unzipped folder.',
      'To open files as Google Docs and Sheets, turn on “Convert uploads to Google Docs editor format” in Drive settings before uploading.',
      'Comments were appended to the end of each .docx and are also listed in comments.csv.',
      'Links between documents are not rewritten inside .docx files. link-map.csv lists every link with its new location, so you can fix them afterwards.',
    ],
  },
  notion: {
    id: 'notion',
    label: 'Notion',
    main: 'md',
    html: 'none',
    shortcuts: 'md-stub',
    steps: [
      'Keep the ZIP as it is; do not unzip it.',
      'In Notion open Settings > Import > Text & Markdown and choose the ZIP file.',
      'Documents are Markdown files with relative links between them and images beside them. Check a few pages after the import (to be confirmed on your own workspace).',
      'Spreadsheets are included as .xlsx next to a Markdown copy.',
      'Comments are written at the end of each page and listed in comments.csv.',
    ],
  },
  archive: {
    id: 'archive',
    label: 'Archive only',
    main: 'html',
    html: 'beside',
    shortcuts: 'html-stub',
    steps: [
      'Unzip the file anywhere. Open index.html to browse everything offline.',
      'Every document is stored as HTML (with comments and images beside it) and as .docx or .xlsx.',
      'Documents that lived in two folders were stored once; the other folder holds a small HTML page that redirects to it.',
      'Keep manifest.csv: it lists every document and where it went.',
    ],
  },
};

export const PRESET_LIST: Preset[] = [PRESETS.sharepoint, PRESETS.drive, PRESETS.notion, PRESETS.archive];

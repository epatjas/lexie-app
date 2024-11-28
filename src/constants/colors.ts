export const FOLDER_COLORS = {
  pink: '#EAD9D5',
  yellow: '#FFEBA1',
  green: '#DAE8D7',
  blue: '#D9EAFD',
  purple: '#C2C5F4',
} as const;

export const FOLDER_COLOR_OPTIONS = [
  { id: 'pink', value: FOLDER_COLORS.pink, name: 'Pinkki' },
  { id: 'yellow', value: FOLDER_COLORS.yellow, name: 'Keltainen' },
  { id: 'green', value: FOLDER_COLORS.green, name: 'Vihreä' },
  { id: 'blue', value: FOLDER_COLORS.blue, name: 'Sininen' },
  { id: 'purple', value: FOLDER_COLORS.purple, name: 'Lila' },
] as const;

export type FolderColorKey = keyof typeof FOLDER_COLORS; 
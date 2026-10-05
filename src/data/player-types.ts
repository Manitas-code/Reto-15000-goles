export type Position = 'DEF' | 'MED' | 'DEL';
export const goalKeys = [
  'champions',
  'premier',
  'laliga',
  'seriea',
  'bundesliga',
  'ligue1',
  'erepor',
  'seleccion',
  'america',
  'carrera',
  'cabeza',
  'olimpicos',
  'mundiales',
  'fchampions',
  'flibertadores',
  'fmundial',
] as const;
export type GoalKey = (typeof goalKeys)[number];
export type GoalValues = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
export type RawPlayerRow =
  [string, string, ...GoalValues] | [string, string, Position, ...GoalValues];
export type Player = { name: string; flag: string; pos: Position } & Record<
  GoalKey,
  number
>;
export interface RetoPlayer {
  name: string;
  flag: string;
  pos: Position;
  base: GoalValues;
  v: GoalValues;
}

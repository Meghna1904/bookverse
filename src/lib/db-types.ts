export type Id<T extends string = string> = string & { readonly __table?: T };
export type Doc<T extends string = string> = Record<string, any> & {
  _id: Id<T>;
};

export const HOUSEHOLD_ID = "00000000-0000-4000-8000-000000000001";
export const READER_IDS = {
  whiskeyy: "00000000-0000-4000-8000-000000000002",
  matildaa: "00000000-0000-4000-8000-000000000003",
} as const;

export function normalizeRow<T extends Record<string, any>>(row: T) {
  return { ...row, _id: row.id };
}

export function normalizeRows<T extends Record<string, any>>(rows: T[]) {
  return rows.map(normalizeRow);
}

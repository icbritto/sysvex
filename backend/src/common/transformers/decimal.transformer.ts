import { ValueTransformer } from 'typeorm';

// Postgres "numeric" columns come back from pg as strings to avoid precision
// loss; SYSVEX's amounts stay well within float safety, so we convert to
// number at the ORM boundary and keep the rest of the app free of string math.
export const DecimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : parseFloat(value)),
};

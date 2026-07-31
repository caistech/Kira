// Stands in for Next's `server-only` package under vitest.
//
// `server-only` exists to make a client component that imports server code fail AT BUILD TIME. It
// has no runtime module, so vitest cannot resolve it, and the failure takes down the entire import
// chain — a test file that never touched server code fails because something it imports imports
// something that declares the guard. Aliased here (vitest.config.ts) so the guard keeps working
// where it matters and stops breaking where it does not.
export {};

// Shared styles for the auth pages — keeps them visually consistent.
export const s = {
  page:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f3f3', padding: 24 },
  card:    { width: 400, background: '#fff', border: '1px solid #d1d1d1', borderRadius: 8, padding: '36px 36px 28px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
  title:   { fontSize: '1.4rem', fontWeight: 700, color: '#1b1b1b', margin: '0 0 6px' },
  sub:     { fontSize: '0.85rem', color: '#666', margin: 0, lineHeight: 1.6 },
  field:   { marginTop: 16 },
  label:   { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#444', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:   { width: '100%', height: 38, padding: '0 12px', fontSize: '0.92rem', border: '1px solid #c8c8c8', borderRadius: 4, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' },
  err:     { marginTop: 14, padding: '8px 12px', background: '#fde7e9', borderLeft: '4px solid #d13438', borderRadius: 4, fontSize: '0.8rem', color: '#9b1c20' },
  ok:      { marginTop: 14, padding: '8px 12px', background: '#e8f5e9', borderLeft: '4px solid #2e7d32', borderRadius: 4, fontSize: '0.82rem', color: '#1b5e20' },
  btn:     { width: '100%', height: 40, marginTop: 18, background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer' },
  links:   { display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: '0.8rem' },
  link:    { color: '#0078d4', textDecoration: 'none' },
  footer:  { display: 'flex', justifyContent: 'center', gap: 18, marginTop: 22, paddingTop: 18, borderTop: '1px solid #ececec' },
  flink:   { fontSize: '0.78rem', color: '#999', textDecoration: 'none' },
};

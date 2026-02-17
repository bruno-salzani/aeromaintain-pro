export function requireAdminApiKey(req, res, next) {
  const key = process.env.ADMIN_API_KEY || '';
  if (!key) return next();
  const provided = req.headers['x-api-key'] || '';
  if (provided === key) return next();
  res.status(401).json({ error: 'unauthorized' });
}

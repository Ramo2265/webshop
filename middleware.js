function requireCustomer(req, res, next) {
  if (!req.session.customerId) {
    return res.status(401).json({ error: 'Once giris yapmalisin.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(401).json({ error: 'Admin girisi gerekli.' });
  }
  next();
}

module.exports = { requireCustomer, requireAdmin };

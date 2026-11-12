function requireLogin(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  return res.status(401).json({ ok: false, message: 'Harus login sebagai admin.' });
}

function requireLoginPage(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  return res.redirect('/admin/login.html');
}

module.exports = { requireLogin, requireLoginPage };

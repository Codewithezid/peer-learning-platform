const parseAdminUserIds = () =>
  (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

const requireAdmin = (req, res, next) => {
  const adminUserIds = parseAdminUserIds();

  if (adminUserIds.length === 0) {
    return res.status(500).json({
      success: false,
      message: 'Admin access is not configured. Set ADMIN_USER_IDS in backend environment variables.',
    });
  }

  if (!req.user?.id || !adminUserIds.includes(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  return next();
};

module.exports = { requireAdmin };

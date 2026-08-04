const createLegacyEndpointGuard = ({ verifyAdmin, adminAuthFailed }) =>
  (req, res, next) => {
    const { email, password } = req.body;
    verifyAdmin(email, password, (authErr, isAdmin) => {
      if (authErr) return res.status(500).json(authErr);
      if (!isAdmin) return adminAuthFailed(res);
      return next();
    });
  };

module.exports = createLegacyEndpointGuard;

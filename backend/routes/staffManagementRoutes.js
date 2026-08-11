const express = require("express");

const createStaffManagementRoutes = (controller, { allowRoles }) => {
  const router = express.Router();
  const adminOnly = allowRoles("Admin");
  router.post("/adminStaffList", ...adminOnly, controller.adminStaffList);
  router.post("/adminStaffUpsert", ...adminOnly, controller.adminStaffUpsert);
  return router;
};

module.exports = createStaffManagementRoutes;

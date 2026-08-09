const express = require("express");

const createStaffManagementRoutes = (controller) => {
  const router = express.Router();
  router.post("/adminStaffList", controller.adminStaffList);
  router.post("/adminStaffUpsert", controller.adminStaffUpsert);
  return router;
};

module.exports = createStaffManagementRoutes;

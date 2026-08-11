const express = require("express");

const createCinemaManagementRoutes = (controller, { allowRoles }) => {
  const router = express.Router();
  const adminOnly = allowRoles("Admin");

  router.post("/adminCinemaStructure", ...adminOnly, controller.adminCinemaStructure);
  router.post("/adminTheatreUpsert", ...adminOnly, controller.adminTheatreUpsert);
  router.post("/adminTheatreDelete", ...adminOnly, controller.adminTheatreDelete);
  router.post("/adminHallUpsert", ...adminOnly, controller.adminHallUpsert);
  router.post("/adminHallDelete", ...adminOnly, controller.adminHallDelete);
  router.post("/adminHallLayout", ...adminOnly, controller.adminHallLayout);
  router.post("/adminHallLayoutSave", ...adminOnly, controller.adminHallLayoutSave);
  router.post("/adminComboManagement", ...adminOnly, controller.adminComboManagement);
  router.post("/adminComboUpsert", ...adminOnly, controller.adminComboUpsert);
  router.post("/adminComboPromotionUpsert", ...adminOnly, controller.adminComboPromotionUpsert);
  router.post("/adminComboPromotionDelete", ...adminOnly, controller.adminComboPromotionDelete);
  router.post("/adminBranchComboUpsert", ...adminOnly, controller.adminBranchComboUpsert);

  return router;
};

module.exports = createCinemaManagementRoutes;

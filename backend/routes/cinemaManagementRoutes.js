const express = require("express");

const createCinemaManagementRoutes = (controller) => {
  const router = express.Router();

  router.post("/adminCinemaStructure", controller.adminCinemaStructure);
  router.post("/adminTheatreUpsert", controller.adminTheatreUpsert);
  router.post("/adminTheatreDelete", controller.adminTheatreDelete);
  router.post("/adminHallUpsert", controller.adminHallUpsert);
  router.post("/adminHallDelete", controller.adminHallDelete);
  router.post("/adminHallLayout", controller.adminHallLayout);
  router.post("/adminHallLayoutSave", controller.adminHallLayoutSave);
  router.post("/adminComboManagement", controller.adminComboManagement);
  router.post("/adminComboUpsert", controller.adminComboUpsert);
  router.post("/adminComboPromotionUpsert", controller.adminComboPromotionUpsert);
  router.post("/adminComboPromotionDelete", controller.adminComboPromotionDelete);

  return router;
};

module.exports = createCinemaManagementRoutes;

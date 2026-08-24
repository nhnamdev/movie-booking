const express = require("express");

const createAdminRoutes = (controller, { uploadImage, authentication }) => {
  const router = express.Router();
  const { allowRoles } = authentication;

  router.post("/adminOrders", ...allowRoles("Admin", "Staff"), controller.adminOrders);
  router.post("/adminOrderStatusUpdate", ...allowRoles("Admin", "Staff"), controller.adminOrderStatusUpdate);
  router.post("/adminOrderFulfillmentUpdate", ...allowRoles("Admin", "Staff"), controller.adminOrderFulfillmentUpdate);
  router.post("/adminTicketCheckIn", ...allowRoles("Admin", "Staff"), controller.adminTicketCheckIn);
  const adminOnly = allowRoles("Admin");
  router.post("/adminMovies", ...adminOnly, controller.adminMovies);
  router.post("/adminMovieUpdate", ...adminOnly, controller.adminMovieUpdate);
  router.post("/adminMovieDelete", ...adminOnly, controller.adminMovieDelete);
  router.post("/adminMovieAdd", ...adminOnly, controller.adminMovieAdd);
  router.post("/totalTickets", ...adminOnly, controller.totalTickets);
  router.post("/totalPayment", ...adminOnly, controller.totalPayment);
  router.post("/totalCustomers", ...adminOnly, controller.totalCustomers);
  router.post("/totalTicketPerMovie", ...adminOnly, controller.totalTicketPerMovie);
  router.post("/adminShowtimeOptions", ...adminOnly, controller.adminShowtimeOptions);
  router.post("/adminShowtimeSlots", ...adminOnly, controller.adminShowtimeSlots);
  router.post("/adminShowtimeCreate", ...adminOnly, controller.adminShowtimeCreate);
  router.post("/adminShowtimeUpdate", ...adminOnly, controller.adminShowtimeUpdate);
  router.post("/adminShowtimeDelete", ...adminOnly, controller.adminShowtimeDelete);
  router.post("/adminShowtimeRestore", ...adminOnly, controller.adminShowtimeRestore);
  router.post("/adminMoviePerformance", ...adminOnly, controller.adminMoviePerformance);
  router.post("/adminDashboardStats", ...adminOnly, controller.adminDashboardStats);
  router.post("/adminRevenueStats", ...adminOnly, controller.adminRevenueStats);
  router.post("/adminOrderStatusStats", ...adminOnly, controller.adminOrderStatusStats);
  router.post("/adminBookingTimeStats", ...adminOnly, controller.adminBookingTimeStats);
  router.post("/adminRecentOrders", ...adminOnly, controller.adminRecentOrders);
  router.post("/adminTopMovies", ...adminOnly, controller.adminTopMovies);
  router.post("/adminUploadImage", ...adminOnly, uploadImage, controller.adminUploadImage);
  router.post("/adminMediaDelete", ...adminOnly, controller.adminMediaDelete);
  router.post("/adminTicketPriceConfigs", ...adminOnly, controller.adminTicketPriceConfigs);
  router.post("/adminTicketPriceConfigUpdate", ...adminOnly, controller.adminTicketPriceConfigUpdate);
  router.post("/adminSeedCgvShowtimes", ...adminOnly, controller.adminSeedCgvShowtimes);

  return router;
};

module.exports = createAdminRoutes;

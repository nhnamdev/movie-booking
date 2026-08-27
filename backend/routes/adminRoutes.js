const express = require("express");

const createAdminRoutes = (controller, { uploadImage, authentication }) => {
  const router = express.Router();
  const { allowRoles } = authentication;

  const staffOrAdmin = allowRoles("Admin", "Staff");
  const adminOnly = allowRoles("Admin");

  router.post("/adminOrders", ...staffOrAdmin, controller.adminOrders);
  router.post("/adminOrderStatusUpdate", ...staffOrAdmin, controller.adminOrderStatusUpdate);
  router.post("/adminOrderFulfillmentUpdate", ...staffOrAdmin, controller.adminOrderFulfillmentUpdate);
  router.post("/adminTicketCheckIn", ...staffOrAdmin, controller.adminTicketCheckIn);

  // Quản lý phim: Cho phép cả Admin và Staff
  router.post("/adminMovies", ...staffOrAdmin, controller.adminMovies);
  router.post("/adminMovieUpdate", ...staffOrAdmin, controller.adminMovieUpdate);
  router.post("/adminMovieDelete", ...staffOrAdmin, controller.adminMovieDelete);
  router.post("/adminMovieAdd", ...staffOrAdmin, controller.adminMovieAdd);
  router.post("/adminUploadImage", ...staffOrAdmin, uploadImage, controller.adminUploadImage);
  router.post("/adminMediaDelete", ...staffOrAdmin, controller.adminMediaDelete);

  // Quản lý suất chiếu: Cho phép cả Admin và Staff
  router.post("/adminShowtimeOptions", ...staffOrAdmin, controller.adminShowtimeOptions);
  router.post("/adminShowtimeSlots", ...staffOrAdmin, controller.adminShowtimeSlots);
  router.post("/adminShowtimeCreate", ...staffOrAdmin, controller.adminShowtimeCreate);
  router.post("/adminShowtimeUpdate", ...staffOrAdmin, controller.adminShowtimeUpdate);
  router.post("/adminShowtimeDelete", ...staffOrAdmin, controller.adminShowtimeDelete);
  router.post("/adminShowtimeRestore", ...staffOrAdmin, controller.adminShowtimeRestore);
  router.post("/adminSeedCgvShowtimes", ...staffOrAdmin, controller.adminSeedCgvShowtimes);

  // Các chức năng thống kê và cấu hình hệ thống: Dành riêng cho Admin
  router.post("/totalTickets", ...adminOnly, controller.totalTickets);
  router.post("/totalPayment", ...adminOnly, controller.totalPayment);
  router.post("/totalCustomers", ...adminOnly, controller.totalCustomers);
  router.post("/totalTicketPerMovie", ...adminOnly, controller.totalTicketPerMovie);
  router.post("/adminMoviePerformance", ...adminOnly, controller.adminMoviePerformance);
  router.post("/adminDashboardStats", ...adminOnly, controller.adminDashboardStats);
  router.post("/adminRevenueStats", ...adminOnly, controller.adminRevenueStats);
  router.post("/adminOrderStatusStats", ...adminOnly, controller.adminOrderStatusStats);
  router.post("/adminBookingTimeStats", ...adminOnly, controller.adminBookingTimeStats);
  router.post("/adminRecentOrders", ...adminOnly, controller.adminRecentOrders);
  router.post("/adminTopMovies", ...adminOnly, controller.adminTopMovies);
  router.post("/adminTicketPriceConfigs", ...adminOnly, controller.adminTicketPriceConfigs);
  router.post("/adminTicketPriceConfigUpdate", ...adminOnly, controller.adminTicketPriceConfigUpdate);

  return router;
};

module.exports = createAdminRoutes;

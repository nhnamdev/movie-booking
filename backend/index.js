require("dotenv").config();

const createApp = require("./app");
const databaseService = require("./services/databaseService");
const createPaymentService = require("./services/paymentService");
const createComboService = require("./services/comboService");
const createCinemaManagementService = require("./services/cinemaManagementService");
const createConcessionService = require("./services/concessionService");
const createStaffManagementService = require("./services/staffManagementService");
const createRewardService = require("./services/rewardService");
const createAdminService = require("./services/adminService");
const createShowtimeAvailabilityService = require("./services/showtimeAvailabilityService");
const createMoviePerformanceService = require("./services/moviePerformanceService");
const registrationLogService = require("./services/registrationLogService");
const storageService = require("./services/storageService");
const createAuthentication = require("./middleware/authentication");
const { rateLimit } = require("express-rate-limit");
const uploadImage = require("./middleware/uploadImage");

const port = process.env.PORT || 7000;
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
const defaultCorsOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];
const corsOrigins = (process.env.CORS_ORIGINS || defaultCorsOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

databaseService.connectDatabase();
const comboService = createComboService({ queryDbAsync: databaseService.query });
const cinemaManagementService = createCinemaManagementService({
  queryDbAsync: databaseService.query,
  withTransaction: databaseService.withTransaction,
  deleteFromR2: storageService.deleteFromR2,
});
const concessionService = createConcessionService({ queryDbAsync: databaseService.query });
const staffManagementService = createStaffManagementService({
  queryDbAsync: databaseService.query,
});
const rewardService = createRewardService({
  queryDbAsync: databaseService.query,
  withTransaction: databaseService.withTransaction,
});
const showtimeAvailabilityService = createShowtimeAvailabilityService({
  queryDbAsync: databaseService.query,
});
const moviePerformanceService = createMoviePerformanceService({
  queryDbAsync: databaseService.query,
});
const paymentService = createPaymentService({
  queryDbAsync: databaseService.query,
  withTransaction: databaseService.withTransaction,
  priceComboSelection: comboService.priceComboSelection,
  settlePaidOrderRewards: rewardService.settlePaidOrderRewards,
  releaseRewardHold: rewardService.releaseRewardHold,
  releaseExpiredRewardHolds: rewardService.releaseExpiredRewardHolds,
  assertShowtimeBookable: showtimeAvailabilityService.assertShowtimeBookable,
});
const adminService = createAdminService({
  db: databaseService.db,
  parsePayOSOrderPayload: paymentService.parsePayOSOrderPayload,
  normalizeSeatIds: paymentService.normalizeSeatIds,
});

const dependencies = {
  db: databaseService.db,
  queryDbAsync: databaseService.query,
  withTransaction: databaseService.withTransaction,
  frontendUrl,
  ...comboService,
  ...cinemaManagementService,
  ...concessionService,
  ...staffManagementService,
  ...rewardService,
  ...showtimeAvailabilityService,
  ...moviePerformanceService,
  ...paymentService,
  ...adminService,
  ...registrationLogService,
  ...storageService,
};

const authentication = createAuthentication({ queryDbAsync: databaseService.query });
Object.assign(dependencies, authentication);
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau." },
});
const app = createApp({
  dependencies,
  uploadImage,
  corsOrigins,
  authentication,
  loginLimiter,
});

if (require.main === module) {
  paymentService.startExpirationScheduler();
  app.listen(port, () => {
    console.log(` backend running on ${port}`);
  });
}

module.exports = app;

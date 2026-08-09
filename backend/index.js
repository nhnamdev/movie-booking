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
const registrationLogService = require("./services/registrationLogService");
const storageService = require("./services/storageService");
const createLegacyEndpointGuard = require("./middleware/legacyEndpointGuard");
const uploadImage = require("./middleware/uploadImage");

console.log("ENV loaded:");
console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_PORT =", process.env.DB_PORT);
console.log("DB_NAME =", process.env.DB_NAME);

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
  frontendUrl,
  ...comboService,
  ...cinemaManagementService,
  ...concessionService,
  ...staffManagementService,
  ...rewardService,
  ...showtimeAvailabilityService,
  ...paymentService,
  ...adminService,
  ...registrationLogService,
  ...storageService,
};

const legacyEndpointGuard = createLegacyEndpointGuard(adminService);
const app = createApp({
  dependencies,
  legacyEndpointGuard,
  uploadImage,
  corsOrigins,
});

if (require.main === module) {
  paymentService.startExpirationScheduler();
  app.listen(port, () => {
    console.log(` backend running on ${port}`);
  });
}

module.exports = app;

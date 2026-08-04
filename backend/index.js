require("dotenv").config();

const createApp = require("./app");
const databaseService = require("./services/databaseService");
const createPaymentService = require("./services/paymentService");
const createAdminService = require("./services/adminService");
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
const paymentService = createPaymentService({ queryDbAsync: databaseService.query });
const adminService = createAdminService({
  db: databaseService.db,
  parsePayOSOrderPayload: paymentService.parsePayOSOrderPayload,
  normalizeSeatIds: paymentService.normalizeSeatIds,
});

const dependencies = {
  db: databaseService.db,
  queryDbAsync: databaseService.query,
  frontendUrl,
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
  app.listen(port, () => {
    console.log(` backend running on ${port}`);
  });
}

module.exports = app;

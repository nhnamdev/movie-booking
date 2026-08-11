const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger");

const createCatalogController = require("./controllers/catalogController");
const createBookingController = require("./controllers/bookingController");
const createPaymentController = require("./controllers/paymentController");
const createAuthController = require("./controllers/authController");
const createCustomerController = require("./controllers/customerController");
const createAdminController = require("./controllers/adminController");
const createCinemaManagementController = require("./controllers/cinemaManagementController");
const createConcessionController = require("./controllers/concessionController");
const createStaffManagementController = require("./controllers/staffManagementController");
const createRewardController = require("./controllers/rewardController");
const createMediaController = require("./controllers/mediaController");

const createCatalogRoutes = require("./routes/catalogRoutes");
const createBookingRoutes = require("./routes/bookingRoutes");
const createPaymentRoutes = require("./routes/paymentRoutes");
const createAuthRoutes = require("./routes/authRoutes");
const createCustomerRoutes = require("./routes/customerRoutes");
const createAdminRoutes = require("./routes/adminRoutes");
const createCinemaManagementRoutes = require("./routes/cinemaManagementRoutes");
const createConcessionRoutes = require("./routes/concessionRoutes");
const createStaffManagementRoutes = require("./routes/staffManagementRoutes");
const createRewardRoutes = require("./routes/rewardRoutes");
const createMediaRoutes = require("./routes/mediaRoutes");

const createApp = ({
  dependencies,
  uploadImage,
  corsOrigins,
  authentication,
  loginLimiter,
}) => {
  const app = express();

  app.use(
    cors({
      origin: corsOrigins,
      methods: ["POST", "GET", "PUT", "DELETE"],
      credentials: true,
    })
  );
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get("/api-docs.json", (req, res) => res.json(swaggerDocument));
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: "CGV Booking API Docs",
      swaggerOptions: { persistAuthorization: true },
    })
  );

  const catalogController = createCatalogController(dependencies);
  const bookingController = createBookingController(dependencies);
  const paymentController = createPaymentController(dependencies);
  const authController = createAuthController(dependencies);
  const customerController = createCustomerController(dependencies);
  const adminController = createAdminController(dependencies);
  const cinemaManagementController = createCinemaManagementController(dependencies);
  const concessionController = createConcessionController(dependencies);
  const staffManagementController = createStaffManagementController(dependencies);
  const rewardController = createRewardController(dependencies);
  const mediaController = createMediaController(dependencies);

  app.use(createMediaRoutes(mediaController));
  app.use(createCatalogRoutes(catalogController));
  app.use(createBookingRoutes(bookingController));
  app.use(createPaymentRoutes(paymentController, { authentication }));
  app.use(createAuthRoutes(authController, { ...authentication, loginLimiter }));
  app.use(createCustomerRoutes(customerController, authentication));
  app.use(createAdminRoutes(adminController, { uploadImage, authentication }));
  app.use(createCinemaManagementRoutes(cinemaManagementController, authentication));
  app.use(createConcessionRoutes(concessionController, authentication));
  app.use(createStaffManagementRoutes(staffManagementController, authentication));
  app.use(createRewardRoutes(rewardController, authentication));

  return app;
};

module.exports = createApp;

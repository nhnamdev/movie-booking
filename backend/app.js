const express = require("express");
const cors = require("cors");
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

const createApp = ({
  dependencies,
  legacyEndpointGuard,
  uploadImage,
  corsOrigins,
}) => {
  const app = express();

  app.use(
    cors({
      origin: corsOrigins,
      methods: ["POST", "GET", "PUT", "DELETE"],
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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

  app.use(createCatalogRoutes(catalogController));
  app.use(createBookingRoutes(bookingController));
  app.use(createPaymentRoutes(paymentController, { legacyEndpointGuard }));
  app.use(createAuthRoutes(authController));
  app.use(createCustomerRoutes(customerController));
  app.use(createAdminRoutes(adminController, { uploadImage }));
  app.use(createCinemaManagementRoutes(cinemaManagementController));
  app.use(createConcessionRoutes(concessionController));
  app.use(createStaffManagementRoutes(staffManagementController));
  app.use(createRewardRoutes(rewardController));

  return app;
};

module.exports = createApp;

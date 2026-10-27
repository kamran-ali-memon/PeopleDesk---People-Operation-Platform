require("dotenv").config();
const app = require("./app");
const connectDatabase = require("./config/db");

const port = Number(process.env.PORT || 8080);
async function startServer() {
  try {
    await connectDatabase();
    app.listen(port, () =>
      console.log(`PeopleDesk API listening on port ${port}`),
    );
  } catch (error) {
    console.error("Unable to start PeopleDesk API:", error.message);
    process.exit(1);
  }
}
startServer();

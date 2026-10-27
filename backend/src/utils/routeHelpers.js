const { asyncHandler } = require("./errors");

const wrap = (handler) => asyncHandler(handler);

module.exports = { wrap };

/**
 * 统一响应格式工具
 */
const success = (res, data = null, message = 'success', code = 0) => {
  return res.json({ code, message, data });
};

const fail = (res, message = 'error', code = 1, httpStatus = 400) => {
  return res.status(httpStatus).json({ code, message, data: null });
};

const paginated = (res, rows, count, page, limit) => {
  return res.json({
    code: 0,
    message: 'success',
    data: {
      list: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        hasMore: page * limit < count
      }
    }
  });
};

module.exports = { success, fail, paginated };

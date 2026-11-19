function createResponse(success, data = null, error = null) {
  const response = { success };
  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  return response;
}

export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err.statusCode) {
    return res.status(err.statusCode).json(
      createResponse(false, null, err.errors || err.message)
    );
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json(
      createResponse(false, null, err.message)
    );
  }

  if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    return res.status(400).json(
      createResponse(false, null, 'Invalid JSON payload')
    );
  }

  res.status(500).json(
    createResponse(false, null, 'Internal server error')
  );
}

export function notFoundHandler(req, res) {
  res.status(404).json(
    createResponse(false, null, 'Route not found')
  );
}
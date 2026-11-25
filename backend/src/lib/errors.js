/** Error yang dikirim apa adanya ke klien: { error: { code, message } } dengan status HTTP-nya. */
class HttpError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

const badRequest = (code, message) => new HttpError(400, code, message)
const notFound = (message = 'Data tidak ditemukan.') => new HttpError(404, 'not_found', message)
const conflict = (code, message) => new HttpError(409, code, message)

module.exports = { HttpError, badRequest, notFound, conflict }

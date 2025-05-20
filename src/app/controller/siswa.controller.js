const siswaService = require('../service/siswa.service');
const { prisma } = require('../../lib/config/prisma.config');
const Http = require('../../lib/http');
const HttpRequest = require('../../lib/http/request.http');
const ErrorHandler = require('../../lib/http/error.handler.htttp');

class SiswaController {
  preRegisterSiswa = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);
    const result = await siswaService.preRegisterSiswa(data);
    return Http.Response.created(res, result, 'Pre-registrasi berhasil, silakan lakukan pembayaran');
  });

  registerSiswa = ErrorHandler.asyncHandler(async (req, res) => {
    const data = HttpRequest.getBodyParams(req);
    const result = await siswaService.registerSiswa(data);
    return Http.Response.created(res, result, 'Pendaftaran siswa berhasil, silakan lakukan pembayaran');
  });

  getRegistrationStatus = ErrorHandler.asyncHandler(async (req, res) => {
    const { tempId } = HttpRequest.getUrlParams(req);

    // Get payment by ID
    const payment = await prisma.pembayaran.findUnique({
      where: { id: tempId },
      include: {
        xenditPayment: true
      }
    });

    if (!payment) {
      return Http.Response.notFound(res, null, 'Data registrasi tidak ditemukan');
    }

    // Check if this is a pre-registration payment
    if (payment.tipePembayaran !== 'PENDAFTARAN') {
      return Http.Response.badRequest(res, null, 'ID bukan merupakan ID pendaftaran');
    }

    // Get temporary registration data
    const tempData = siswaService.tempStorage.get(tempId);

    // If not in temporary storage but payment exists, check if registration is completed
    if (!tempData) {
      const pendaftaran = await prisma.pendaftaran.findUnique({
        where: { pembayaranId: tempId },
        include: {
          siswa: {
            select: {
              namaMurid: true,
              user: {
                select: {
                  email: true
                }
              }
            }
          }
        }
      });

      if (pendaftaran) {
        return Http.Response.success(res, {
          status: 'COMPLETED',
          payment: {
            id: payment.id,
            status: payment.statusPembayaran,
            paymentUrl: payment.xenditPayment?.xenditPaymentUrl
          },
          pendaftaran: {
            id: pendaftaran.id,
            status: pendaftaran.statusVerifikasi,
            student: {
              name: pendaftaran.siswa.namaMurid,
              email: pendaftaran.siswa.user.email
            }
          }
        }, 'Pendaftaran telah selesai');
      }
    }

    // Return payment status
    return Http.Response.success(res, {
      status: tempData ? 'PENDING' : 'EXPIRED',
      payment: {
        id: payment.id,
        status: payment.statusPembayaran,
        paymentUrl: payment.xenditPayment?.xenditPaymentUrl,
        expiredAt: payment.xenditPayment?.xenditExpireDate
      },
      message: tempData ? 'Registrasi dalam proses, menunggu pembayaran' : 'Data registrasi sudah tidak valid'
    });
  });

  getById = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const result = await siswaService.getById(id);
    return Http.Response.success(res, result);
  });

  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'namaMurid', 'isRegistered', 'strataPendidikan', 'jenisKelamin'
    ]);
    const result = await siswaService.getAll(filters);
    return Http.Response.success(res, result);
  });

  getProfile = ErrorHandler.asyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const result = await siswaService.getProfile(userId);
    return Http.Response.success(res, result);
  });

  updateProfile = ErrorHandler.asyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const data = HttpRequest.getBodyParams(req);
    const result = await siswaService.updateProfile(userId, data);
    return Http.Response.success(res, result, 'Profil berhasil diperbarui');
  });

  delete = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    await siswaService.delete(id);
    return Http.Response.success(res, { id }, 'Siswa berhasil dihapus');
  });

  // Admin: Get all students with detailed information including program, schedule, etc.
  getAllDetailed = ErrorHandler.asyncHandler(async (req, res) => {
    const filters = HttpRequest.getQueryParams(req, [
      'page', 'limit', 'search', 'programId', 'strataPendidikan', 'jenisKelamin', 'status'
    ]);
    const result = await siswaService.getAllDetailed(filters);
    return Http.Response.success(res, result, 'Data siswa detail berhasil diambil');
  });

  // Admin: Get detailed student information including pendaftaran and jadwal
  getDetailedById = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const result = await siswaService.getDetailedById(id);
    return Http.Response.success(res, result, 'Detail lengkap siswa berhasil diambil');
  });

  // Admin: Update detailed student information
  updateDetailedSiswa = ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = HttpRequest.getUrlParams(req);
    const data = HttpRequest.getBodyParams(req);
    const result = await siswaService.updateDetailedSiswa(id, data);
    return Http.Response.success(res, result, 'Data lengkap siswa berhasil diperbarui');
  });
}

module.exports = new SiswaController();
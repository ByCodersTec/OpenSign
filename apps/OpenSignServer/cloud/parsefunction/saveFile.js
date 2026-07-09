import { flattenPdf, getSecureUrl, debugLog } from '../../Utils.js';
import { parseUploadFile } from '../../utils/fileUtils.js';

export default async function saveFile(request) {
  if (!request.params.fileBase64) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Please provide file.');
  }
  const fileBase64 = request.params.fileBase64;
  const id = request.params.id;
  const requestUserId = request?.user?.id || null;
  const fileNameForLog = request.params.fileName;
  debugLog(
    '[PLACEHOLDER_DEBUG] saveFile start',
    JSON.stringify({
      requestUserId,
      id: id || null,
      fileName: fileNameForLog,
      fileBase64Length: fileBase64?.length || 0,
    })
  );
  try {
    if (request.user) {
      const extCls = new Parse.Query('contracts_Users');
      extCls.equalTo('UserId', request.user);
      extCls.include('TenantId');
      extCls.include('UserId');
      const resExt = await extCls.first({ useMasterKey: true });
      if (resExt) {
        const _resExt = JSON.parse(JSON.stringify(resExt));
        const fileName = request.params.fileName;
        const ext = request.params.fileName?.split('.')?.pop();
        let mimeType;
        let file;
        if (ext === 'pdf') {
          mimeType = 'application/pdf';
          debugLog('[PLACEHOLDER_DEBUG] saveFile: flattenPdf start', JSON.stringify({ fileName }));
          const flattenStartedAt = Date.now();
          const flatPdf = await flattenPdf(fileBase64);
          debugLog(
            '[PLACEHOLDER_DEBUG] saveFile: flattenPdf end',
            JSON.stringify({ fileName, durationMs: Date.now() - flattenStartedAt })
          );
          // file = [...flatPdf];
          file = flatPdf;
        } else if (ext === 'png' || ext === 'jpeg' || ext === 'jpg') {
          mimeType = `image/${ext}`;
          // file = { base64: fileBase64 };
          file = Buffer.from(fileBase64, 'base64');
        }
        // const pdfFile = new Parse.File(fileName, file, mimeType);
        // // Save the Parse File if needed
        // const pdfData = await pdfFile.save({ useMasterKey: true });
        // const presignedUrl = pdfData.url();
        // const fileRes = getSecureUrl(presignedUrl);
        // return { url: fileRes.url };
        try {
          debugLog('[PLACEHOLDER_DEBUG] saveFile: parseUploadFile (file adapter access) start', JSON.stringify({ fileName, mimeType }));
          const uploadStartedAt = Date.now();
          const fileRes = await parseUploadFile(fileName, file, mimeType);
          debugLog(
            '[PLACEHOLDER_DEBUG] saveFile: parseUploadFile (file adapter access) end',
            JSON.stringify({ fileName, durationMs: Date.now() - uploadStartedAt })
          );
          const fileUrl = getSecureUrl(fileRes?.url)?.url;
          debugLog('[PLACEHOLDER_DEBUG] saveFile end', JSON.stringify({ fileName, hasUrl: !!fileUrl }));
          return { url: fileUrl };
        } catch (err) {
          debugLog(
            '[PLACEHOLDER_DEBUG] saveFile: upload error',
            JSON.stringify({ fileName, message: err?.message })
          );
          debugLog(err?.stack);
          throw new Parse.Error(400, err?.message);
        }
      } else {
        debugLog('[PLACEHOLDER_DEBUG] saveFile: contracts_Users not found', JSON.stringify({ requestUserId }));
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User not found.');
      }
    } else {
      debugLog('[PLACEHOLDER_DEBUG] saveFile: no authenticated user');
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User is not authenticated.');
    }
  } catch (err) {
    console.log('err in savetoS3', err);
    debugLog(
      '[PLACEHOLDER_DEBUG] saveFile error',
      JSON.stringify({ fileName: fileNameForLog, requestUserId, message: err?.message })
    );
    debugLog(err?.stack);
    throw err;
  }
}

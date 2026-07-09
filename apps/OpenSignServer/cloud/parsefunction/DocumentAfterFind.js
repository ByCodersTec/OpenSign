import { handleValidImage, useLocal, debugLog } from '../../Utils.js';
import getPresignedUrl, { presignedlocalUrl } from './getSignedUrl.js';

async function DocumentAfterFind(request) {
  if (request.objects.length === 1) {
    if (request.objects) {
      const obj = request.objects[0];
      const objId = obj?.id;
      const SignedUrl = obj?.get('SignedUrl') && obj?.get('SignedUrl');
      const Url = obj?.get('URL') && obj?.get('URL');
      const certificateUrl = obj.get('CertificateUrl') && obj.get('CertificateUrl');
      const isPrefillExist = obj?.get('Placeholders')?.some(x => x.Role === 'prefill');
      const Placeholder = obj?.get('Placeholders') || [];

      const shouldUsePresigned = useLocal !== 'true';
      const isLocal = useLocal == 'true';

      debugLog(
        '[PLACEHOLDER_DEBUG] DocumentAfterFind start',
        JSON.stringify({
          documentId: objId,
          hasSignedUrl: !!SignedUrl,
          hasUrl: !!Url,
          hasCertificateUrl: !!certificateUrl,
          isPrefillExist: !!isPrefillExist,
          useLocal,
        })
      );

      const resolveUrl = async (rawUrl, label) => {
        if (!rawUrl) return rawUrl;
        const startedAt = Date.now();
        debugLog(
          `[PLACEHOLDER_DEBUG] DocumentAfterFind resolveUrl(${label}) start`,
          JSON.stringify({ documentId: objId, mode: shouldUsePresigned ? 'presigned' : isLocal ? 'local' : 'none' })
        );
        try {
          let resolved;
          if (shouldUsePresigned) {
            resolved = await getPresignedUrl(rawUrl);
          } else if (isLocal) {
            resolved = presignedlocalUrl(rawUrl);
          }
          debugLog(
            `[PLACEHOLDER_DEBUG] DocumentAfterFind resolveUrl(${label}) end`,
            JSON.stringify({ documentId: objId, durationMs: Date.now() - startedAt, resolved: !!resolved })
          );
          return resolved;
        } catch (err) {
          debugLog(
            `[PLACEHOLDER_DEBUG] DocumentAfterFind resolveUrl(${label}) error`,
            JSON.stringify({ documentId: objId, durationMs: Date.now() - startedAt, message: err?.message })
          );
          debugLog(err?.stack);
          throw err;
        }
      };

      try {
        if (isPrefillExist) {
          const updatedPlaceHolder = await handleValidImage(Placeholder);
          obj.set('Placeholders', updatedPlaceHolder);
        }

        if (SignedUrl) obj.set('SignedUrl', await resolveUrl(SignedUrl, 'SignedUrl'));
        if (Url) obj.set('URL', await resolveUrl(Url, 'URL'));
        if (certificateUrl) obj.set('CertificateUrl', await resolveUrl(certificateUrl, 'CertificateUrl'));
        debugLog('[PLACEHOLDER_DEBUG] DocumentAfterFind end', JSON.stringify({ documentId: objId }));
        return [obj];
      } catch (err) {
        debugLog(
          '[PLACEHOLDER_DEBUG] DocumentAfterFind error',
          JSON.stringify({ documentId: objId, message: err?.message })
        );
        debugLog(err?.stack);
        throw err;
      }
    }
  }
}
export default DocumentAfterFind;

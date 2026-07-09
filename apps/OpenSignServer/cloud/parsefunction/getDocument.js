import axios from 'axios';
import { cloudServerUrl, serverAppId, debugLog } from '../../Utils.js';
export default async function getDocument(request) {
  const serverUrl = cloudServerUrl; //process.env.SERVER_URL;
  const docId = request.params.docId;
  const include = request?.params?.include || '';
  const sessiontoken = request?.headers?.sessiontoken || '';
  const requestUserId = request?.user?.id || null;
  debugLog(
    '[PLACEHOLDER_DEBUG] getDocument start',
    JSON.stringify({ documentId: docId, requestUserId, hasSessionToken: !!sessiontoken, include })
  );
  try {
    if (docId) {
      try {
        const query = new Parse.Query('contracts_Document');
        query.equalTo('objectId', docId);
        query.include('ExtUserPtr');
        query.include('ExtUserPtr.TenantId');
        query.include('CreatedBy');
        query.include('Signers');
        query.include('AuditTrail.UserPtr');
        query.include('Placeholders');
        query.include('DeclineBy');
        query.notEqualTo('IsArchive', true);
        if (include) {
          query?.include(include);
        }
        const queryStartedAt = Date.now();
        const res = await query.first({ useMasterKey: true });
        debugLog(
          '[PLACEHOLDER_DEBUG] getDocument query.first done',
          JSON.stringify({ documentId: docId, found: !!res, durationMs: Date.now() - queryStartedAt })
        );
        if (res) {
          const IsEnableOTP = res?.get('IsEnableOTP') || false;
          const document = JSON.parse(JSON.stringify(res));
          let urlHost = null;
          try {
            urlHost = document?.URL ? new URL(document.URL).hostname : null;
          } catch {
            urlHost = 'unparseable';
          }
          debugLog(
            '[PLACEHOLDER_DEBUG] getDocument document found',
            JSON.stringify({
              documentId: docId,
              IsEnableOTP,
              hasUrl: !!document?.URL,
              urlHost,
              hasSignedUrl: !!document?.SignedUrl,
              hasExtUserPtr: !!document?.ExtUserPtr,
              hasTenantId: !!document?.ExtUserPtr?.TenantId,
            })
          );
          delete document.ExtUserPtr.TenantId.FileAdapters;
          delete document?.ExtUserPtr?.TenantId?.PfxFile;
          if (!IsEnableOTP) {
            debugLog('[PLACEHOLDER_DEBUG] getDocument end (no OTP)', JSON.stringify({ documentId: docId }));
            return document;
          } else {
            if (sessiontoken) {
              try {
                const userRes = await axios.get(serverUrl + '/users/me', {
                  headers: {
                    'X-Parse-Application-Id': serverAppId,
                    'X-Parse-Session-Token': sessiontoken,
                  },
                });
                const userId = userRes.data && userRes.data?.objectId;
                const acl = res.getACL();
                if (userId && acl && acl.getReadAccess(userId)) {
                  debugLog(
                    '[PLACEHOLDER_DEBUG] getDocument end (OTP, access granted)',
                    JSON.stringify({ documentId: docId, userId })
                  );
                  return document;
                } else {
                  debugLog(
                    '[PLACEHOLDER_DEBUG] getDocument end (OTP, access denied)',
                    JSON.stringify({ documentId: docId, userId })
                  );
                  return { error: "You don't have access of this document!" };
                }
              } catch (err) {
                debugLog(
                  '[PLACEHOLDER_DEBUG] getDocument /users/me error',
                  JSON.stringify({ documentId: docId, message: err?.message })
                );
                debugLog(err?.stack);
                return { error: "You don't have access of this document!" };
              }
            } else {
              debugLog('[PLACEHOLDER_DEBUG] getDocument end (OTP, no session token)', JSON.stringify({ documentId: docId }));
              return { error: "You don't have access of this document!" };
            }
          }
        } else {
          debugLog('[PLACEHOLDER_DEBUG] getDocument end (not found or archived)', JSON.stringify({ documentId: docId }));
          return { error: "document deleted or you don't have access." };
        }
      } catch (err) {
        debugLog(
          '[PLACEHOLDER_DEBUG] getDocument inner error',
          JSON.stringify({ documentId: docId, message: err?.message })
        );
        debugLog(err?.stack);
        return err;
      }
    } else {
      debugLog('[PLACEHOLDER_DEBUG] getDocument missing docId param');
      return { error: 'Please pass required parameters!' };
    }
  } catch (err) {
    debugLog(
      '[PLACEHOLDER_DEBUG] getDocument outer error',
      JSON.stringify({ documentId: docId, message: err?.message })
    );
    debugLog(err?.stack);
    if (err.code == 209) {
      return { error: 'Invalid session token' };
    } else {
      return { error: "You don't have access of this document!" };
    }
  }
}

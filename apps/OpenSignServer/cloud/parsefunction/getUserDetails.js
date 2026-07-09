import { debugLog } from '../../Utils.js';
async function getUserDetails(request) {
  const reqEmail = request.params.email;
  const requestUserId = request?.user?.id || null;
  debugLog(
    '[PLACEHOLDER_DEBUG] getUserDetails start',
    JSON.stringify({ requestUserId, hasReqEmail: !!reqEmail, userId: request.params.userId || null })
  );
  if (reqEmail || request.user) {
    try {
      const userId = request.params.userId;
      const userQuery = new Parse.Query('contracts_Users');
      if (reqEmail) {
        userQuery.equalTo('Email', reqEmail);
      } else {
        const email = request.user.get('email');
        userQuery.equalTo('Email', email);
      }
      userQuery.include('TenantId');
      userQuery.include('UserId');
      userQuery.include('CreatedBy');
      userQuery.exclude('CreatedBy.authData');
      userQuery.exclude('TenantId.FileAdapters');
      userQuery.exclude('google_refresh_token');
      userQuery.exclude('TenantId.PfxFile');
      if (userId) {
        userQuery.equalTo('CreatedBy', { __type: 'Pointer', className: '_User', objectId: userId });
      }
      const res = await userQuery.first({ useMasterKey: true });
      debugLog('[PLACEHOLDER_DEBUG] getUserDetails end', JSON.stringify({ requestUserId, found: !!res }));
      if (res) {
        if (reqEmail) {
          return { objectId: res.id };
        } else {
          return res;
        }
      } else {
        return '';
      }
    } catch (err) {
      debugLog(
        '[PLACEHOLDER_DEBUG] getUserDetails error',
        JSON.stringify({ requestUserId, message: err?.message })
      );
      debugLog(err?.stack);
      const code = err?.code || 400;
      const msg = err?.message || 'Something went wrong.';
      throw new Parse.Error(code, msg);
    }
  } else {
    debugLog('[PLACEHOLDER_DEBUG] getUserDetails: no email and no authenticated user');
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User is not authenticated.');
  }
}
export default getUserDetails;

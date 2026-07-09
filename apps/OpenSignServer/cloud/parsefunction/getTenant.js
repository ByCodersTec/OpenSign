import { debugLog } from '../../Utils.js';
async function getTenantByUserId(userId, contactId) {
  try {
    if (contactId) {
      const contactquery = new Parse.Query('contracts_Contactbook');
      contactquery.equalTo('objectId', contactId);
      const contactuser = await contactquery.first({ useMasterKey: true });
      if (contactuser) {
        const tenantId = contactuser?.get('TenantId')?.id;
        if (tenantId) {
          const tenantCreditsQuery = new Parse.Query('partners_Tenant');
          tenantCreditsQuery.equalTo('objectId', tenantId);
          tenantCreditsQuery.exclude('FileAdapters,PfxFile,ContactNumber');
          const res = await tenantCreditsQuery.first({ useMasterKey: true });
          debugLog(
            '[PLACEHOLDER_DEBUG] getTenant (via contactId) end',
            JSON.stringify({ contactId, tenantId, found: !!res })
          );
          return res;
        } else {
          debugLog('[PLACEHOLDER_DEBUG] getTenant (via contactId) no tenantId on contact', JSON.stringify({ contactId }));
          return {};
        }
      } else {
        debugLog('[PLACEHOLDER_DEBUG] getTenant contact not found', JSON.stringify({ contactId }));
        return {};
      }
    } else {
      const query = new Parse.Query('contracts_Users');
      query.equalTo('UserId', { __type: 'Pointer', className: '_User', objectId: userId });
      const extuser = await query.first({ useMasterKey: true });
      if (extuser) {
        const tenantId = extuser?.get('TenantId')?.id || '';
        const user = extuser?.get('CreatedBy')?.id || userId;
        const tenantQuery = new Parse.Query('partners_Tenant');
        if (tenantId) {
          tenantQuery.equalTo('objectId', tenantId);
        } else {
          tenantQuery.equalTo('UserId', {
            __type: 'Pointer',
            className: '_User',
            objectId: user,
          });
        }
        tenantQuery.exclude('FileAdapters,PfxFile');
        const res = await tenantQuery.first({ useMasterKey: true });
        debugLog(
          '[PLACEHOLDER_DEBUG] getTenant (via userId) end',
          JSON.stringify({ userId, tenantId, found: !!res })
        );
        return res;
      } else {
        debugLog('[PLACEHOLDER_DEBUG] getTenant contracts_Users not found', JSON.stringify({ userId }));
        return {};
      }
    }
  } catch (err) {
    console.log('err in getTenant ', err);
    debugLog(
      '[PLACEHOLDER_DEBUG] getTenant error',
      JSON.stringify({ userId, contactId, message: err?.message })
    );
    debugLog(err?.stack);
    return 'user does not exist!';
  }
}
export default async function getTenant(request) {
  const userId = request.params.userId || '';
  const contactId = request.params.contactId || '';
  debugLog('[PLACEHOLDER_DEBUG] getTenant start', JSON.stringify({ userId, contactId }));

  if (userId || contactId) {
    return await getTenantByUserId(userId, contactId);
  } else {
    debugLog('[PLACEHOLDER_DEBUG] getTenant missing userId/contactId params');
    return {};
  }
}

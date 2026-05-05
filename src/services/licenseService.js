const supabase = require('../config/supabase');

async function validateLicense(apiKey) {
  try {
    console.log('[LICENSE] Validating:', apiKey);
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    console.log('[LICENSE] Query result:', { data, error });

    if (error || !data) {
      return { valid: false, reason: 'License not found' };
    }

    if (data.status !== 'active') {
      return { valid: false, reason: 'License is inactive' };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, reason: 'License expired' };
    }

    console.log('[LICENSE] Valid license:', data.id);
    return { valid: true, license: data };
  } catch (err) {
    console.error('[LICENSE] Validation error:', err);
    return { valid: false, reason: 'Validation error' };
  }
}

module.exports = { validateLicense };

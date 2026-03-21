const parseDevice = (userAgent) => {
  const ua = (userAgent || '').toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobile|android|iphone/.test(ua)) return 'mobile';
  return 'desktop';
};

const parseBrowser = (userAgent) => {
  const ua = (userAgent || '').toLowerCase();
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome/')) return 'Chrome';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
  if (ua.includes('firefox/')) return 'Firefox';
  if (ua.includes('opr/') || ua.includes('opera/')) return 'Opera';
  return 'unknown';
};

const parseOs = (userAgent) => {
  const ua = (userAgent || '').toLowerCase();
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os')) return 'macOS';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'iOS';
  if (ua.includes('linux')) return 'Linux';
  return 'unknown';
};

const getIpAddress = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
};

const getLocation = (req) => {
  const country =
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['x-country'] ||
    'unknown';

  const city = req.headers['x-vercel-ip-city'] || req.headers['x-city'] || 'unknown';

  return {
    country: String(country),
    city: String(city),
  };
};

const extractClientInfo = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const { country, city } = getLocation(req);

  return {
    ipAddress: getIpAddress(req),
    device: parseDevice(userAgent),
    browser: parseBrowser(userAgent),
    os: parseOs(userAgent),
    country,
    city,
  };
};

module.exports = {
  extractClientInfo,
};

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const getTimestamp = () => {
  return new Date().toISOString().replace('T', ' ').split('.')[0];
};

const logger = {
  info: (message, data = '') => {
    console.log(`${colors.gray}[${getTimestamp()}]${colors.reset} ${colors.blue}ℹ INFO${colors.reset}  ${message}`, data);
  },

  success: (message, data = '') => {
    console.log(`${colors.gray}[${getTimestamp()}]${colors.reset} ${colors.green}✓ OK${colors.reset}    ${message}`, data);
  },

  warn: (message, data = '') => {
    console.warn(`${colors.gray}[${getTimestamp()}]${colors.reset} ${colors.yellow}⚠ WARN${colors.reset}  ${message}`, data);
  },

  error: (message, data = '') => {
    console.error(`${colors.gray}[${getTimestamp()}]${colors.reset} ${colors.red}✖ ERROR${colors.reset} ${message}`, data);
  },

  request: (method, url, statusCode, duration) => {
    const color = statusCode >= 400 ? colors.red : statusCode >= 300 ? colors.yellow : colors.green;
    console.log(
      `${colors.gray}[${getTimestamp()}]${colors.reset} ${colors.cyan}→ ${method}${colors.reset} ${url} ${color}${statusCode}${colors.reset} ${colors.gray}${duration}ms${colors.reset}`
    );
  },
};

module.exports = logger;

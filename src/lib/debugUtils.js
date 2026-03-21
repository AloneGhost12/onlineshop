// Debug utility functions for monitoring and analytics

/**
 * Intercepts fetch requests to monitor API calls
 * @param {Function} onApiCall - Callback when an API call completes
 */
export function setupNetworkMonitoring(onApiCall) {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const startTime = performance.now();
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    const method = (args[1]?.method || 'GET').toUpperCase();

    try {
      const response = await originalFetch.apply(this, args);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      // Try to get response data
      let responseData = null;
      try {
        const clonedResponse = response.clone();
        responseData = await clonedResponse.json();
      } catch {
        responseData = null;
      }

      onApiCall(method, url, response.status, responseTime, responseData);

      return response;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      onApiCall(method, url, 0, responseTime, { error: error.message });
      throw error;
    }
  };
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics() {
  const metrics = {
    navigation: {},
    resources: [],
    paint: [],
  };

  // Navigation timing
  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    metrics.navigation = {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      dom: timing.domInteractive - timing.domLoading,
      load: timing.loadEventEnd - timing.loadEventStart,
      total: timing.loadEventEnd - timing.fetchStart,
    };
  }

  // Resource timing
  if (window.performance && window.performance.getEntriesByType) {
    metrics.resources = window.performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      duration: Math.round(entry.duration),
      size: entry.transferSize || 0,
    }));

    // Paint timing
    metrics.paint = window.performance.getEntriesByType('paint').map((entry) => ({
      name: entry.name,
      startTime: Math.round(entry.startTime),
    }));
  }

  return metrics;
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Parse error stack and extract relevant information
 */
export function parseErrorStack(stack) {
  if (!stack) return [];
  const lines = stack.split('\n').slice(1); // Skip first line (message)
  return lines.map((line) => {
    const match = line.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/);
    if (match) {
      return {
        function: match[1],
        file: match[2],
        line: match[3],
        column: match[4],
      };
    }
    return { raw: line };
  });
}

/**
 * Export logs to JSON file
 */
export function exportLogsAsJSON(logs, filename = 'debug-logs.json') {
  const dataStr = JSON.stringify(logs, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export logs to CSV file
 */
export function exportLogsAsCSV(logs, filename = 'debug-logs.csv') {
  let csv = 'Timestamp,Type,Level,Message,Data\n';

  logs.forEach((log) => {
    const timestamp = new Date(log.timestamp).toISOString();
    const type = log.type || 'LOG';
    const level = log.level || 'INFO';
    const message = (log.message || '').replace(/"/g, '""');
    const data = log.data ? JSON.stringify(log.data).replace(/"/g, '""') : '';

    csv += `"${timestamp}","${type}","${level}","${message}","${data}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get WebGL information
 */
export function getWebGLInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');

    if (!gl) {
      return {
        available: false,
        extensions: [],
        maxTextureSize: 0,
      };
    }

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const extensions = gl.getSupportedExtensions();
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    return {
      available: true,
      vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'Unknown',
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'Unknown',
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      maxTextureSize,
      extensions: extensions || [],
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
      extensions: [],
      maxTextureSize: 0,
    };
  }
}

/**
 * Create a formatted log entry
 */
export function createLogEntry(level, message, data = {}) {
  return {
    id: Date.now() + Math.random(),
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Filter logs by level
 */
export function filterLogsByLevel(logs, levels) {
  if (!levels || levels.length === 0) return logs;
  return logs.filter((log) => levels.includes(log.level));
}

/**
 * Filter logs by message
 */
export function filterLogsByMessage(logs, searchTerm) {
  if (!searchTerm) return logs;
  const term = searchTerm.toLowerCase();
  return logs.filter((log) => log.message.toLowerCase().includes(term));
}

/**
 * Get error statistics
 */
export function getErrorStatistics(errors) {
  const stats = {
    total: errors.length,
    byType: {},
    recent: errors.slice(0, 10),
  };

  errors.forEach((error) => {
    if (!stats.byType[error.type]) {
      stats.byType[error.type] = 0;
    }
    stats.byType[error.type]++;
  });

  return stats;
}

/**
 * Get API call statistics
 */
export function getApiStatistics(apiCalls) {
  const stats = {
    total: apiCalls.length,
    success: 0,
    failed: 0,
    byStatus: {},
    byMethod: {},
    avgResponseTime: 0,
  };

  let totalResponseTime = 0;

  apiCalls.forEach((call) => {
    if (call.status >= 200 && call.status < 300) {
      stats.success++;
    } else {
      stats.failed++;
    }

    if (!stats.byStatus[call.status]) {
      stats.byStatus[call.status] = 0;
    }
    stats.byStatus[call.status]++;

    if (!stats.byMethod[call.method]) {
      stats.byMethod[call.method] = 0;
    }
    stats.byMethod[call.method]++;

    totalResponseTime += call.responseTime;
  });

  stats.avgResponseTime = apiCalls.length > 0 ? Math.round(totalResponseTime / apiCalls.length) : 0;

  return stats;
}

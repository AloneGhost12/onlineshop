'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const DebugContext = createContext(null);

export function DebugProvider({ children }) {
  const [errors, setErrors] = useState([]);
  const [logs, setLogs] = useState([]);
  const [apiCalls, setApiCalls] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    memory: 0,
    lastFpsUpdate: 0,
  });
  const [webglStatus, setWebglStatus] = useState({
    available: false,
    vendor: '',
    renderer: '',
    version: '',
    errors: [],
  });

  // Add error to tracking
  const addError = useCallback((error, type = 'GENERAL', context = {}) => {
    const errorEntry = {
      id: Date.now() + Math.random(),
      type,
      message: error?.message || String(error),
      stack: error?.stack || '',
      context,
      timestamp: new Date().toISOString(),
    };
    setErrors((prev) => [errorEntry, ...prev].slice(0, 500)); // Keep last 500 errors
  }, []);

  // Add log entry
  const addLog = useCallback((level, message, data = {}) => {
    const logEntry = {
      id: Date.now() + Math.random(),
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    setLogs((prev) => [logEntry, ...prev].slice(0, 1000)); // Keep last 1000 logs
  }, []);

  // Add API call
  const addApiCall = useCallback((method, url, status, responseTime, response = null) => {
    const apiCall = {
      id: Date.now() + Math.random(),
      method,
      url,
      status,
      responseTime,
      response: response ? JSON.stringify(response).slice(0, 500) : null,
      timestamp: new Date().toISOString(),
    };
    setApiCalls((prev) => [apiCall, ...prev].slice(0, 500)); // Keep last 500 API calls
  }, []);

  // Update performance metrics
  const updatePerformanceMetrics = useCallback((metrics) => {
    setPerformanceMetrics((prev) => ({
      ...prev,
      ...metrics,
    }));
  }, []);

  // Update WebGL status
  const updateWebglStatus = useCallback((status) => {
    setWebglStatus((prev) => ({
      ...prev,
      ...status,
    }));
  }, []);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setErrors([]);
    setLogs([]);
    setApiCalls([]);
  }, []);

  // Intercept console methods
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = (...args) => {
      originalLog(...args);
      addLog('LOG', args.join(' '));
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('ERROR', args.join(' '));
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('WARN', args.join(' '));
    };

    console.info = (...args) => {
      originalInfo(...args);
      addLog('INFO', args.join(' '));
    };

    // Intercept global errors
    const handleError = (event) => {
      addError(event.error, 'UNCAUGHT_ERROR', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event) => {
      addError(event.reason, 'UNHANDLED_REJECTION');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [addLog, addError]);

  // Check WebGL support on mount
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');

      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'Unknown';
        const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'Unknown';
        const version = gl.getParameter(gl.VERSION);

        setWebglStatus({
          available: true,
          vendor,
          renderer,
          version,
          errors: [],
        });
      } else {
        setWebglStatus({
          available: false,
          vendor: '',
          renderer: '',
          version: '',
          errors: ['WebGL is not supported in this browser'],
        });
      }
    } catch (error) {
      addError(error, 'WEBGL_ERROR');
      setWebglStatus({
        available: false,
        vendor: '',
        renderer: '',
        version: '',
        errors: [error.message],
      });
    }
  }, [addError]);

  const value = {
    errors,
    logs,
    apiCalls,
    performanceMetrics,
    webglStatus,
    addError,
    addLog,
    addApiCall,
    updatePerformanceMetrics,
    updateWebglStatus,
    clearLogs,
  };

  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}

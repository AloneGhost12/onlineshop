'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDebug } from '@/context/DebugContext';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import {
  Trash2, Download, AlertTriangle, Zap, Gauge, HardDrive, Server,
  Eye, EyeOff, X, Copy, ChevronDown, ChevronUp, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  exportLogsAsJSON, exportLogsAsCSV, getErrorStatistics, getApiStatistics,
  formatBytes, filterLogsByLevel, filterLogsByMessage, parseErrorStack
} from '@/lib/debugUtils';

export default function DebugDashboard() {
  const { user } = useAuth();
  const {
    errors, logs, apiCalls, performanceMetrics, webglStatus,
    clearLogs, addApiCall, updatePerformanceMetrics,
  } = useDebug();

  // Activate performance monitoring
  usePerformanceMonitor();

  // Setup network monitoring
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { setupNetworkMonitoring } = require('@/lib/debugUtils');
      setupNetworkMonitoring(addApiCall);
    }
  }, [addApiCall]);

  const [activeTab, setActiveTab] = useState('overview');
  const [logFilter, setLogFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [expandedError, setExpandedError] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);
  const [expandedApiCall, setExpandedApiCall] = useState(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const errorStats = useMemo(() => getErrorStatistics(errors), [errors]);
  const apiStats = useMemo(() => getApiStatistics(apiCalls), [apiCalls]);

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    if (logFilter !== 'all') {
      filtered = filterLogsByLevel(filtered, [logFilter]);
    }

    if (logSearch) {
      filtered = filterLogsByMessage(filtered, logSearch);
    }

    return filtered;
  }, [logs, logFilter, logSearch]);

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear all logs? This cannot be undone.')) {
      clearLogs();
      toast.success('Logs cleared');
    }
  };

  const handleExport = (format) => {
    const allLogs = [...errors, ...logs, ...apiCalls];
    if (format === 'json') {
      exportLogsAsJSON(allLogs);
      toast.success('Logs exported as JSON');
    } else if (format === 'csv') {
      exportLogsAsCSV(allLogs);
      toast.success('Logs exported as CSV');
    }
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getErrorColor = (type) => {
    const colors = {
      GENERAL: 'bg-red-50 border-red-200',
      UNCAUGHT_ERROR: 'bg-red-50 border-red-200',
      UNHANDLED_REJECTION: 'bg-orange-50 border-orange-200',
      WEBGL_ERROR: 'bg-purple-50 border-purple-200',
      API_ERROR: 'bg-red-50 border-red-200',
    };
    return colors[type] || 'bg-gray-50 border-gray-200';
  };

  const getLogLevelColor = (level) => {
    const colors = {
      LOG: 'bg-blue-50 border-blue-200 text-blue-700',
      ERROR: 'bg-red-50 border-red-200 text-red-700',
      WARN: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      INFO: 'bg-green-50 border-green-200 text-green-700',
    };
    return colors[level] || 'bg-gray-50 border-gray-200 text-gray-700';
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Admin check
  if (!user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
        <p className="text-gray-600 mt-2">You do not have permission to access the debug dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Debug Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('json')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={handleClearLogs}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200">
        {['overview', 'errors', 'logs', 'api', 'webgl'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Errors */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Errors</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{errorStats.total}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </div>

          {/* Failed API Calls */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Failed API Calls</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{apiStats.failed}</p>
              </div>
              <Server className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </div>

          {/* FPS */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">FPS</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{performanceMetrics.fps}</p>
              </div>
              <Gauge className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Memory Usage</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{performanceMetrics.memory} MB</p>
              </div>
              <HardDrive className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>

          {/* API Calls */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total API Calls</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{apiStats.total}</p>
              </div>
              <Zap className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">API Success Rate</p>
                <p className="text-3xl font-bold text-teal-600 mt-2">
                  {apiStats.total > 0 ? Math.round((apiStats.success / apiStats.total) * 100) : 0}%
                </p>
              </div>
              <Zap className="w-12 h-12 text-teal-500 opacity-20" />
            </div>
          </div>

          {/* Recent Logs Count */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Logs</p>
                <p className="text-3xl font-bold text-indigo-600 mt-2">{logs.length}</p>
              </div>
              <Eye className="w-12 h-12 text-indigo-500 opacity-20" />
            </div>
          </div>

          {/* WebGL Status */}
          <div className={`border rounded-lg p-6 ${webglStatus.available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">WebGL</p>
                <p className={`text-3xl font-bold mt-2 ${webglStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                  {webglStatus.available ? 'OK' : 'Failed'}
                </p>
              </div>
              <Zap className={`w-12 h-12 opacity-20 ${webglStatus.available ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </div>
        </div>
      )}

      {/* Errors Tab */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Error Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(errorStats.byType).map(([type, count]) => (
                <div key={type} className="bg-white p-3 rounded border border-gray-200">
                  <p className="text-sm text-gray-600">{type}</p>
                  <p className="text-2xl font-bold text-red-600">{count}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {errors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No errors recorded</div>
            ) : (
              errors.map((error) => (
                <div
                  key={error.id}
                  className={`border-l-4 rounded-r-lg border-l-red-500 p-4 cursor-pointer transition-colors ${getErrorColor(error.type)} hover:bg-opacity-80`}
                  onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{error.type}</p>
                      <p className="text-sm text-gray-600 mt-1">{error.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(error.timestamp)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyToClipboard(error.message);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  {expandedError === error.id && (
                    <div className="mt-4 pt-4 border-t border-gray-300 space-y-2">
                      {error.stack && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700">Stack Trace:</p>
                          <pre className="bg-gray-800 text-gray-100 p-2 rounded text-xs overflow-auto max-h-48 mt-1">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      {Object.keys(error.context).length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700">Context:</p>
                          <pre className="bg-gray-800 text-gray-100 p-2 rounded text-xs overflow-auto max-h-48 mt-1">
                            {JSON.stringify(error.context, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="LOG">Log</option>
              <option value="ERROR">Error</option>
              <option value="WARN">Warning</option>
              <option value="INFO">Info</option>
            </select>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No logs found</div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`border-l-4 rounded-r-lg border-l-blue-500 p-4 cursor-pointer transition-colors ${getLogLevelColor(log.level)} hover:bg-opacity-80`}
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-opacity-20 bg-gray-800">
                          {log.level}
                        </span>
                        <p className="font-semibold text-gray-800">{log.message}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(log.timestamp)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyToClipboard(log.message);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  {expandedLog === log.id && Object.keys(log.data).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Data:</p>
                      <pre className="bg-gray-800 text-gray-100 p-2 rounded text-xs overflow-auto max-h-48">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* API Tab */}
      {activeTab === 'api' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">API Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded border border-gray-200">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">{apiStats.total}</p>
              </div>
              <div className="bg-white p-3 rounded border border-gray-200">
                <p className="text-sm text-gray-600">Success</p>
                <p className="text-2xl font-bold text-green-600">{apiStats.success}</p>
              </div>
              <div className="bg-white p-3 rounded border border-gray-200">
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{apiStats.failed}</p>
              </div>
              <div className="bg-white p-3 rounded border border-gray-200">
                <p className="text-sm text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-purple-600">{apiStats.avgResponseTime}ms</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">By Status Code</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {Object.entries(apiStats.byStatus).map(([status, count]) => (
                <div key={status} className="bg-white p-3 rounded border border-gray-200">
                  <p className={`text-sm font-semibold ${getStatusColor(parseInt(status))}`}>{status}</p>
                  <p className="text-2xl font-bold text-gray-800">{count}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">By Method</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {Object.entries(apiStats.byMethod).map(([method, count]) => (
                <div key={method} className="bg-white p-3 rounded border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700">{method}</p>
                  <p className="text-2xl font-bold text-gray-800">{count}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {apiCalls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No API calls recorded</div>
            ) : (
              apiCalls.map((call) => (
                <div
                  key={call.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedApiCall(expandedApiCall === call.id ? null : call.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`inline-block px-3 py-1 text-sm font-semibold text-white rounded ${
                          call.method === 'GET' ? 'bg-blue-500' :
                          call.method === 'POST' ? 'bg-green-500' :
                          call.method === 'PUT' ? 'bg-yellow-500' :
                          call.method === 'DELETE' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}>
                          {call.method}
                        </span>
                        <p className="text-sm text-gray-800 break-all">{call.url}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <p className={`text-sm font-semibold ${getStatusColor(call.status)}`}>
                          {call.status === 0 ? 'FAILED' : call.status}
                        </p>
                        <p className="text-sm text-gray-600">{call.responseTime}ms</p>
                        <p className="text-xs text-gray-500">{formatTime(call.timestamp)}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyToClipboard(call.url);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  {expandedApiCall === call.id && call.response && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Response:</p>
                      <pre className="bg-gray-800 text-gray-100 p-2 rounded text-xs overflow-auto max-h-48">
                        {call.response}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* WebGL Tab */}
      {activeTab === 'webgl' && (
        <div className="space-y-4">
          <div className={`border rounded-lg p-6 ${webglStatus.available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                webglStatus.available ? 'bg-green-200' : 'bg-red-200'
              }`}>
                <Zap className={`w-6 h-6 ${webglStatus.available ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  WebGL {webglStatus.available ? 'Supported' : 'Not Supported'}
                </h3>
                {webglStatus.available && (
                  <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <p><span className="font-semibold">Vendor:</span> {webglStatus.vendor}</p>
                    <p><span className="font-semibold">Renderer:</span> {webglStatus.renderer}</p>
                    <p><span className="font-semibold">Version:</span> {webglStatus.version}</p>
                  </div>
                )}
                {webglStatus.errors && webglStatus.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold text-red-700">Errors:</p>
                    <ul className="mt-2 space-y-1">
                      {webglStatus.errors.map((error, idx) => (
                        <li key={idx} className="text-red-600 text-sm">• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

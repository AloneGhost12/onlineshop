# Debug Dashboard Implementation Guide

## Overview
This comprehensive debugging dashboard has been integrated into your admin panel at `/src/app/admin/` to help manage and debug the entire website. It's accessible only to admin users (ADMIN and SUPER_ADMIN roles).

## File Structure

### Context
- **`/src/context/DebugContext.js`** - Global debug state management
  - Tracks errors, logs, API calls, performance metrics, and WebGL status
  - Provides hook `useDebug()` to access debug data
  - Automatically intercepts console methods and global error events
  - Maintains 500 errors, 1000 logs, and 500 API calls in memory

### Hooks
- **`/src/hooks/usePerformanceMonitor.js`** - Real-time performance monitoring
  - Measures FPS (frames per second)
  - Tracks memory usage via performance.memory API
  - Updates metrics every 1000ms
  - Non-blocking animation frame-based implementation

### Utilities
- **`/src/lib/debugUtils.js`** - Helper functions for debugging
  - Network monitoring setup
  - Performance metrics collection
  - Log filtering and searching
  - Error statistics calculation
  - API statistics analysis
  - WebGL information retrieval
  - Export functionality (JSON/CSV)

### Components
- **`/src/components/admin/DebugDashboard.jsx`** - Main dashboard UI
  - 5 tabs: Overview, Errors, Logs, API, WebGL
  - Real-time statistics and metrics
  - Error and log viewer with search/filter
  - API call monitoring with response inspection
  - WebGL status and capability reporting

### Integration
- **`/src/app/layout.js`** - Wrapped with DebugProvider
- **`/src/app/admin/page.js`** - Added Debug tab to admin panel

## Features

### 1. Overview Tab
Displays real-time statistics:
- **Total Errors** - Count of all errors tracked
- **Failed API Calls** - Number of failed API requests
- **FPS** - Current frames per second
- **Memory Usage** - Current JavaScript heap size (in MB)
- **Total API Calls** - Total count of API requests
- **API Success Rate** - Percentage of successful API calls
- **Total Logs** - Count of all console logs
- **WebGL Status** - WebGL availability indicator

### 2. Error Tracking
Monitors:
- Uncaught JavaScript errors
- Unhandled promise rejections
- WebGL initialization errors
- API response errors

Features:
- Error type grouping with statistics
- Stack trace expansion
- Error context display
- Copy-to-clipboard functionality
- Expandable error details

### 3. Log Viewer
Features:
- Real-time console log capture (log, error, warn, info)
- Level filtering (all, log, error, warn, info)
- Full-text search across logs
- Expandable log data inspection
- Copy-to-clipboard functionality
- Timestamps for all entries

### 4. API Monitoring
Monitors:
- All fetch requests
- HTTP methods (GET, POST, PUT, DELETE, etc.)
- Response status codes
- Response times
- Response data preview

Statistics:
- Total API calls and success rate
- Breakdown by status code (2xx, 3xx, 4xx, 5xx)
- Breakdown by HTTP method
- Average response time

### 5. WebGL Status
Displays:
- WebGL availability (supported/not supported)
- Vendor information
- Renderer information
- Version information
- Any initialization errors

## Access Control

The debug dashboard is **admin-only** and requires:
- User role must be `ADMIN` or `SUPER_ADMIN`
- Access is controlled at the component level
- Displays access denied message for non-admin users

## How It Works

### Error Tracking
1. Global `error` event listener catches uncaught exceptions
2. `unhandledrejection` event listener catches promise rejections
3. Console methods are wrapped to capture logs
4. All errors are stored in the DebugContext with timestamps

### Network Monitoring
1. Fetch API is intercepted at the window level
2. Request method, URL, and timing are captured
3. Response status and data are recorded
4. Failed requests (status 0) are marked as errors

### Performance Monitoring
1. RequestAnimationFrame-based FPS counter
2. Memory usage tracked via performance.memory API
3. Metrics update every 1000ms
4. Non-blocking implementation for minimal performance impact

### WebGL Detection
1. Canvas element created in memory
2. WebGL context obtained and inspected
3. Vendor, renderer, and version information extracted
4. Extensions list captured for reference

## Data Retention

- **Errors**: Last 500 entries
- **Logs**: Last 1000 entries
- **API Calls**: Last 500 entries
- All entries are limited to prevent memory leaks

## Export Functionality

Users can export collected logs in two formats:

### JSON Export
```javascript
// Complete log data structure preserved
// Suitable for detailed analysis
// Can be imported back for inspection
```

### CSV Export
```csv
Timestamp,Type,Level,Message,Data
2024-03-21T18:30:45.123Z,GENERAL,ERROR,"Error message","json_data"
```

## Usage

### In Your Application
The debug tracking happens automatically:

```javascript
// All console methods are automatically tracked
console.log('User action');     // Tracked
console.error('Error occurred');  // Tracked
console.warn('Warning');          // Tracked

// Global errors are automatically caught
throw new Error('Something failed'); // Tracked

// Fetch requests are automatically monitored
fetch('/api/endpoint').then(...); // Tracked
```

### In Components
Access debug data using the hook:

```javascript
import { useDebug } from '@/context/DebugContext';

function MyComponent() {
  const { errors, logs, apiCalls, performanceMetrics, webglStatus } = useDebug();

  // Use debug data as needed
  return <div>Errors: {errors.length}</div>;
}
```

### In Admin Panel
1. Navigate to `/admin`
2. Click the "Debug" tab (shows Bug icon)
3. Select from: Overview, Errors, Logs, API, WebGL
4. Use search/filter to find specific issues
5. Export logs for analysis

## Performance Impact

- **Minimal**: FPS monitoring uses requestAnimationFrame
- **Non-blocking**: Console interception and error tracking don't block execution
- **Memory safe**: Automatic cleanup of old entries (max 500-1000 per type)
- **Efficient**: Fetch interception uses Promise-based approach

## Example Use Cases

1. **Debugging production issues**: View error stack traces and context
2. **API testing**: Monitor response times and status codes
3. **Performance analysis**: Track FPS and memory usage
4. **WebGL support detection**: Verify 3D capabilities across browsers
5. **User session debugging**: View console logs from specific time periods
6. **Compliance**: Export logs for audit purposes

## Browser Compatibility

- **Errors tracking**: All modern browsers
- **Console interception**: All modern browsers
- **Performance metrics**: Chrome, Firefox, Safari, Edge
- **Memory API**: Chrome, Edge (performance.memory)
- **WebGL**: Most modern browsers (check WebGL tab for status)

## Troubleshooting

### Memory usage is high
- Clear logs using the "Clear" button
- Consider exporting and archiving old logs
- Increase log retention limit if needed

### WebGL shows as unsupported
- Check browser WebGL support
- Verify GPU drivers are updated
- Check for WebGL errors in the debug dashboard

### API calls not showing
- Ensure fetch API is being used (not XMLHttpRequest)
- Check for CORS issues that prevent request capture
- Verify the API monitoring interceptor is active

## Future Enhancements

Potential improvements:
- Real-time log streaming to backend
- Advanced filtering with regex support
- Performance timeline visualization
- Network waterfall chart
- React component error boundaries integration
- Service worker debugging
- IndexedDB persistence for logs
- Real-time collaboration features

## Security Considerations

- Debug dashboard is admin-only
- Logs may contain sensitive information
- Consider disabling network monitoring in production
- Export logs securely
- Don't share logs with untrusted parties
- Consider implementing log encryption

## Integration with Existing Systems

The debug dashboard integrates seamlessly with:
- Existing authentication system
- React hot-toast notifications
- Tailwind CSS styling
- Admin role-based access control
- Error handling middleware

All integrations are non-intrusive and don't require changes to existing code.

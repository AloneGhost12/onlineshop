import React from 'react';

export const AddressLabel = React.forwardRef(({ order }, ref) => {
  const address = order?.shippingAddress;

  return (
    <div
      ref={ref}
      className="w-full bg-white p-8"
      style={{
        width: '100%',
        height: '100%',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Label Header */}
      <div className="mb-6 border-b-2 border-gray-800 pb-4">
        <h2 className="text-lg font-bold text-gray-900">DELIVERY ADDRESS</h2>
      </div>

      {/* Order Info */}
      <div className="mb-6 grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-gray-600 font-semibold">Order #</p>
          <p className="text-lg font-bold text-gray-900">{order?.orderNumber}</p>
        </div>
        <div>
          <p className="text-gray-600 font-semibold">Date</p>
          <p className="text-sm text-gray-900">
            {new Date(order?.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Main Address Box */}
      <div
        className="border-2 border-gray-800 p-6 rounded-lg bg-gray-50"
        style={{
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* Recipient Name - Large and Bold */}
        <div className="mb-6">
          <p className="text-xs text-gray-600 font-semibold">TO</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {address?.name || 'N/A'}
          </p>
        </div>

        {/* Address Details */}
        <div className="mb-6 space-y-2">
          <p className="text-sm font-semibold text-gray-900">
            {address?.street || 'N/A'}
          </p>
          <p className="text-sm text-gray-800">
            {address?.city || 'N/A'}, {address?.state || 'N/A'}
          </p>
          <p className="text-lg font-bold text-gray-900">
            {address?.zipCode || 'N/A'}
          </p>
        </div>

        {/* Phone Number - Large and Clear */}
        <div className="border-t-2 border-gray-400 pt-4">
          <p className="text-xs text-gray-600 font-semibold mb-2">CONTACT</p>
          <p className="text-xl font-bold text-gray-900">
            {address?.phone || 'N/A'}
          </p>
        </div>
      </div>

      {/* Order Details Footer */}
      <div className="mt-6 pt-4 border-t border-gray-300 text-xs text-gray-600">
        <p>Order ID: {order?._id}</p>
        <p className="mt-1">
          Generated on {new Date().toLocaleDateString('en-IN')} at{' '}
          {new Date().toLocaleTimeString('en-IN')}
        </p>
      </div>
    </div>
  );
});

AddressLabel.displayName = 'AddressLabel';

export default AddressLabel;

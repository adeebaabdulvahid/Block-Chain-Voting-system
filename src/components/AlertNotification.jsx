import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const AlertNotification = ({ type = 'info', title, message, txHash, onClose }) => {
  if (!message && !title) return null;

  const typeConfig = {
    success: {
      className: 'alert-success',
      icon: <CheckCircle2 size={20} color="var(--success-solid)" />,
    },
    error: {
      className: 'alert-danger',
      icon: <AlertCircle size={20} color="var(--danger-solid)" />,
    },
    warning: {
      className: 'alert-warning',
      icon: <AlertCircle size={20} color="var(--warning-solid)" />,
    },
    info: {
      className: 'alert-info',
      icon: <Info size={20} color="var(--primary-600)" />,
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div className={`alert ${config.className}`}>
      {config.icon}
      <div className="alert-content">
        {title && <div className="alert-title">{title}</div>}
        <div>{message}</div>
        {txHash && (
          <div style={{ marginTop: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
            Tx Hash:{' '}
            <span style={{ wordBreak: 'break-all', fontWeight: 600 }}>
              {txHash}
            </span>
          </div>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            padding: '2px',
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default AlertNotification;

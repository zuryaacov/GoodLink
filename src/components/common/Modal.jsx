import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Reusable Modal Component
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call when modal should close
 * @param {string} title - Modal title
 * @param {string|ReactNode} message - Modal message/content
 * @param {string} type - Modal type: 'confirm', 'alert', 'success', 'error', 'info'
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {function} onConfirm - Function to call when confirm button is clicked
 * @param {boolean} isLoading - Whether the action is in progress (shows loading state)
 * @param {ReactNode} icon - Custom icon to display (optional)
 * @param {string} confirmButtonClass - Custom class for confirm button (default: "btn-danger")
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'alert',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  isLoading = false,
  icon,
  confirmButtonClass = 'btn-danger',
}) => {
  // Default icons based on type
  const getDefaultIcon = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'confirm':
      case 'delete':
        return (
          <svg width="24" height="24" fill="none" stroke="#e1567c" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
          </svg>
        );
      case 'success':
        return (
          <svg width="24" height="24" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case 'error':
        return (
          <svg width="24" height="24" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case 'info':
      default:
        return (
          <svg width="24" height="24" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
    }
  };

  const handleConfirm = async () => {
    if (onConfirm && !isLoading) {
      await onConfirm();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="icon-circle">
              {getDefaultIcon()}
            </div>

            <h2>{title}</h2>
            <div>{typeof message === 'string' ? <p>{message}</p> : message}</div>

            <div className="modal-actions">
              {type === 'confirm' || type === 'delete' ? (
                <>
                  <button
                    className="btn-secondary"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {cancelText}
                  </button>
                  <button
                    className={confirmButtonClass}
                    onClick={handleConfirm}
                    disabled={isLoading}
                    style={{
                      opacity: isLoading ? 0.5 : 1,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px', display: 'inline-block', marginRight: '8px' }}>
                          refresh
                        </span>
                        {confirmText.includes('...') ? confirmText : `${confirmText}...`}
                      </>
                    ) : (
                      confirmText
                    )}
                  </button>
                </>
              ) : (
                <button
                  className="btn-primary"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  OK
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;

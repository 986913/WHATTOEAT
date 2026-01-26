import { useState } from 'react';
import axios from 'axios';

export type ToastVariant = 'success' | 'danger' | 'info';

export function useToast() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('Success');
  const [variant, setVariant] = useState<ToastVariant>('success');

  /** internal open toast */
  const open = (msg: string, type: ToastVariant, header: string) => {
    setMessage(msg);
    setVariant(type);
    setTitle(header);
    setShow(true);
  };

  /** helpers */
  const success = (msg: string, header = 'Success') => {
    open(msg, 'success', header);
  };

  const info = (msg: string, header = 'Info') => {
    open(msg, 'info', header);
  };

  /**
   * error handler Supports:
   * toast.error("failed")
   * toast.error(err)
   */
  const error = (err: unknown, header = 'Error') => {
    let msg = 'Something went wrong ❌';
    /** axios error */
    if (axios.isAxiosError(err)) {
      msg =
        err.response?.data?.message || err.response?.statusText || err.message;
    }
    /** normal string */
    if (typeof err === 'string') {
      msg = err;
    }
    open(msg, 'danger', header);
  };

  return {
    toast: {
      show,
      title,
      message,
      variant,
      close: () => setShow(false),
    },
    success,
    info,
    error,
  };
}

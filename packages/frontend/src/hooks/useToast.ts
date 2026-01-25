import { useState } from 'react';

export function useToast() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState<'success' | 'danger' | 'info'>(
    'success',
  );

  const notify = (
    msg: string,
    type: 'success' | 'danger' | 'info' = 'success',
  ) => {
    setMessage(msg);
    setVariant(type);
    setShow(true);
  };

  return {
    toast: {
      show,
      message,
      variant,
      close: () => setShow(false),
    },
    notify,
  };
}

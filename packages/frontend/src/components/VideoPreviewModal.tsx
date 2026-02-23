import { Modal } from 'react-bootstrap';
import { useMemo } from 'react';

type Props = {
  url: string | null;
  onClose: () => void;
  title?: string;
};

function convertYoutubeUrl(url: string) {
  if (!url) return url;

  if (url.includes('youtube.com/watch?v=')) {
    const id = new URL(url).searchParams.get('v');
    return `https://www.youtube.com/embed/${id}`;
  }

  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1];
    return `https://www.youtube.com/embed/${id}`;
  }

  return url;
}

export default function VideoPreviewModal({
  url,
  onClose,
  title = 'Cooking Steps Video',
}: Props) {
  const embedUrl = useMemo(() => {
    if (!url) return null;
    return convertYoutubeUrl(url);
  }, [url]);

  return (
    <Modal show={!!url} onHide={onClose} size='lg' centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ height: '70vh' }}>
        {embedUrl && (
          <iframe
            src={embedUrl}
            title='video-preview'
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
            allowFullScreen
          />
        )}
      </Modal.Body>
    </Modal>
  );
}

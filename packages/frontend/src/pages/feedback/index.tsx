import { useState } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import axios from '../../utils/axios';
import { useToast } from '../../hooks/useToast';
import AppToast from '../../components/AppToast';
import '../../styles/pages/feedback.css';

export default function Feedback() {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast, success, error } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      await axios.post('/feedback', { message: message.trim() });
      success('Thank you for your feedback!');
      setMessage('');
    } catch (err) {
      error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='feedback-page'>
      <Card className='feedback-card'>
        <Card.Body>
          <div className='feedback-header'>
            <h2 className='feedback-title'>Feedback</h2>
            <p className='feedback-subtitle'>
              Found a bug? Have a feature idea? I'd love to hear from you!
            </p>
          </div>

          <Form onSubmit={handleSubmit}>
            <Form.Group className='mb-3'>
              <Form.Control
                as='textarea'
                rows={5}
                placeholder='Tell me what you think...'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                className='feedback-textarea'
              />
              <div className='feedback-char-count'>
                {message.length} / 1000
              </div>
            </Form.Group>

            <Button
              type='submit'
              className='feedback-submit-btn'
              disabled={submitting || !message.trim()}
            >
              {submitting ? 'Sending...' : 'Send Feedback'}
            </Button>
          </Form>

          <div className='feedback-footer'>
            <p>
              Or reach out directly at{' '}
              <a href='mailto:merylliu1994@gmail.com'>merylliu1994@gmail.com</a>
              {' / '}
              <a
                href='https://www.linkedin.com/in/mingyue-liu-22b37612a/'
                target='_blank'
                rel='noopener noreferrer'
              >
                LinkedIn
              </a>
            </p>
          </div>
        </Card.Body>
      </Card>
      <AppToast {...toast} />
    </div>
  );
}

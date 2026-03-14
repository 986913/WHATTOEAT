import { Card } from 'react-bootstrap';
import '../../styles/pages/feedback.css';

export default function Feedback() {
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

          <div className='feedback-options'>
            <a
              href='mailto:merylliu1994@gmail.com?subject=MealDice Feedback'
              className='feedback-option'
            >
              <div className='feedback-option-icon'>
                <i className='fa-regular fa-envelope'></i>
              </div>
              <div className='feedback-option-content'>
                <h4>Email</h4>
                <p>merylliu1994@gmail.com</p>
              </div>
              <i className='fa-solid fa-arrow-right feedback-arrow'></i>
            </a>

            <a
              href='https://www.linkedin.com/in/mingyue-liu-22b37612a/'
              target='_blank'
              rel='noopener noreferrer'
              className='feedback-option'
            >
              <div className='feedback-option-icon'>
                <i className='fa-brands fa-linkedin'></i>
              </div>
              <div className='feedback-option-content'>
                <h4>LinkedIn</h4>
                <p>Connect with me</p>
              </div>
              <i className='fa-solid fa-arrow-right feedback-arrow'></i>
            </a>
          </div>

          <div className='feedback-footer'>
            <p>Thank you for helping make MealDice better!</p>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

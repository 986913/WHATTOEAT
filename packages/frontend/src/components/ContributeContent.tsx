export default function ContributeContent() {
  return (
    <>
      <div className='today-modal-icon'>🍳</div>
      <h2>Create Your Own Meal</h2>
      <p className='today-modal-desc'>
        We're building a way for you to contribute your favorite recipes.
        Once added, your meals will join the shuffle rotation — so you'll
        never run out of ideas.
      </p>
      <div className='today-modal-features'>
        <div className='today-modal-feature'>
          <i className='fa-solid fa-utensils'></i>
          <span>Add your own recipes with ingredients</span>
        </div>
        <div className='today-modal-feature'>
          <i className='fa-solid fa-shuffle'></i>
          <span>Your meals join the shuffle rotation</span>
        </div>
        <div className='today-modal-feature'>
          <i className='fa-solid fa-video'></i>
          <span>Attach cooking videos for reference</span>
        </div>
      </div>
      <div className='today-modal-status'>
        <span className='today-modal-status-dot'></span>
        Currently in development — launching soon
      </div>
    </>
  );
}

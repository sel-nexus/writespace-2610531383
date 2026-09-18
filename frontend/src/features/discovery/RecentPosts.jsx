import PropTypes from 'prop-types';

import useRemoteResource from './useRemoteResource.js';

/** Render bounded public post previews and recoverable resource states. */
export default function RecentPosts({ loader, onSelect }) {
  const { data, phase, error, retry } = useRemoteResource(loader);
  const posts = Array.isArray(data) ? data.slice(0, 3) : [];

  return (
    <section className="recent-posts" aria-labelledby="recent-posts-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">From the reading table</p>
          <h2 id="recent-posts-title">Recent notes, held lightly.</h2>
        </div>
        {data !== null && (
          <button className="text-button" type="button" onClick={retry} disabled={phase === 'refreshing'}>
            {phase === 'refreshing' ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>

      {phase === 'loading' && <p className="resource-status" role="status" aria-live="polite">Gathering recent writing…</p>}
      {phase === 'error' && (
        <div className="resource-status resource-error" role="alert" aria-live="assertive">
          <p>{error?.message || 'Unable to load recent writing.'}</p>
          <button className="secondary-button" type="button" onClick={retry}>Try again</button>
        </div>
      )}
      {data !== null && posts.length === 0 && <p className="resource-status" role="status">No notes have been published yet. Please return soon.</p>}
      {posts.length > 0 && (
        <div className="post-grid" aria-label="Recent post previews">
          {posts.map((post) => (
            <article className="post-preview" key={post.id}>
              <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString()}</time>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <button className="preview-link" type="button" onClick={() => onSelect(post.id)} aria-label={`Read ${post.title}`}>
                Read the note <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </div>
      )}
      {data !== null && error && (
        <div className="refresh-error" role="alert" aria-live="assertive">
          <span>{error.message || 'Unable to refresh recent writing.'}</span>
          <button className="text-button" type="button" onClick={retry}>Try again</button>
        </div>
      )}
    </section>
  );
}

RecentPosts.propTypes = {
  loader: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
};

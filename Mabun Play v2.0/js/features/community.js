import { showModal } from '../utils/modal.js';
import { apiClient } from '../core/api.js';
import { timeAgo } from '../utils/formatters.js';

document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    postInput: document.getElementById('postInput'),
    uploadImageBtn: document.getElementById('uploadImageBtn'),
    createPostBtn: document.getElementById('createPostBtn'),
    feedTabs: document.querySelectorAll('.feed-tab'),
    postsFeed: document.getElementById('postsFeed'),
    feedLoader: document.getElementById('feedLoader'),
    feedEnd: document.getElementById('feedEnd'),
    backToTopBtn: document.getElementById('backToTopBtn')
  };

  let currentFeed = 'latest';
  let page = 1;
  let loading = false;
  let hasMore = true;

  loadPosts(currentFeed, 1);

  elements.feedTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.feedTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFeed = tab.dataset.feed;
      page = 1;
      hasMore = true;
      elements.postsFeed.innerHTML = '';
      loadPosts(currentFeed, page);
    });
  });

  window.addEventListener('scroll', () => {
    if (loading || !hasMore) return;
    const scrollY = window.scrollY;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollY > height - 200) {
      loadPosts(currentFeed, page + 1);
    }
  });

  elements.createPostBtn.addEventListener('click', async () => {
    const content = elements.postInput.value.trim();
    if (!content) {
      await showModal({ title: 'Empty Post', message: 'Please write something.', confirmText: 'OK' });
      return;
    }

    try {
      elements.createPostBtn.disabled = true;
      const newPost = await apiClient('/community/posts', {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      const postEl = createPostElement(newPost);
      elements.postsFeed.prepend(postEl);
      elements.postInput.value = '';
    } catch (error) {
      await showModal({ title: 'Error', message: error.message, confirmText: 'OK' });
    } finally {
      elements.createPostBtn.disabled = false;
    }
  });

  elements.uploadImageBtn.addEventListener('click', () => {
    alert('Image upload not implemented in this demo.');
  });

  elements.backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  async function loadPosts(feed, pageNum) {
    if (loading || !hasMore) return;
    loading = true;
    elements.feedLoader.style.display = 'block';

    try {
      const data = await apiClient(`/community/feed?type=${feed}&page=${pageNum}`);
      const posts = data.posts || [];
      hasMore = data.hasMore;
      page = pageNum;

      if (posts.length === 0 && pageNum === 1) {
        elements.postsFeed.innerHTML = '<div class="empty-state">No posts yet. Be the first!</div>';
      } else {
        posts.forEach(post => {
          elements.postsFeed.appendChild(createPostElement(post));
        });
      }

      elements.feedEnd.style.display = hasMore ? 'none' : 'block';
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      loading = false;
      elements.feedLoader.style.display = 'none';
    }
  }

  function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post-card';
    div.innerHTML = `
      <div class="post-header">
        <img src="${post.avatar || 'assets/images/default-avatar.png'}" alt="" class="post-avatar">
        <div class="post-meta">
          <span class="post-author">${post.author}</span>
          <span class="post-time">${timeAgo(post.createdAt)}</span>
        </div>
      </div>
      <div class="post-content">${post.content}</div>
      ${post.image ? `<img src="${post.image}" alt="" class="post-image">` : ''}
      <div class="post-actions">
        <button class="post-action like-btn" data-id="${post.id}">
          <iconify-icon icon="solar:heart-linear"></iconify-icon>
          <span>${post.likes || 0}</span>
        </button>
        <button class="post-action comment-btn" data-id="${post.id}">
          <iconify-icon icon="solar:chat-round-linear"></iconify-icon>
          <span>${post.comments || 0}</span>
        </button>
        <button class="post-action share-btn" data-id="${post.id}">
          <iconify-icon icon="solar:share-linear"></iconify-icon>
        </button>
      </div>
    `;

    const likeBtn = div.querySelector('.like-btn');
    likeBtn.addEventListener('click', async () => {
      try {
        const result = await apiClient(`/community/posts/${post.id}/like`, { method: 'POST' });
        const countSpan = likeBtn.querySelector('span');
        countSpan.textContent = result.likes;
        const icon = likeBtn.querySelector('iconify-icon');
        icon.setAttribute('icon', result.liked ? 'solar:heart-bold' : 'solar:heart-linear');
      } catch (error) {
        console.error('Like failed:', error);
      }
    });

    return div;
  }
});
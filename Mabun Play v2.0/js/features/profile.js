// profile.js – Profile page with follow/unfollow, avatar upload, and editing
// All data fetched via apiClient.

import { showModal } from '../utils/modal.js';
import { formatCurrency } from '../utils/formatters.js';
import { getQueryParam } from '../utils/helpers.js';
import { apiClient } from '../core/api.js';

// ========== DOM Elements ==========
const elements = {
  avatarImg: document.getElementById('avatarImg'),
  avatarUploadBtn: document.getElementById('avatarUploadBtn'),
  profileName: document.getElementById('profileName'),
  userIdSpan: document.getElementById('userId'),
  statWinnings: document.getElementById('statWinnings'),
  statPlayed: document.getElementById('statPlayed'),
  statRank: document.getElementById('statRank'),
  accountUsername: document.getElementById('accountUsername'),
  accountEmail: document.getElementById('accountEmail'),
  accountPhone: document.getElementById('accountPhone'),
  displayUsername: document.getElementById('displayUsername'),
  displayEmail: document.getElementById('displayEmail'),
  editUsernameLink: document.getElementById('editUsername'),
  editEmailLink: document.getElementById('editEmail'),
  usernameDisplay: document.getElementById('usernameDisplay'),
  emailDisplay: document.getElementById('emailDisplay'),
  editProfileContainer: document.getElementById('editProfileContainer'),
  editProfileBtn: document.getElementById('editProfileBtn'),
  backBtn: document.getElementById('backBtn'),
  viewAllAchievements: document.getElementById('viewAllAchievements'),
  achievementsList: document.getElementById('achievementsList'),
  followersCount: document.getElementById('followersCount'),
  followingCount: document.getElementById('followingCount'),
  followBtn: document.getElementById('followBtn'),
};

// ========== State ==========
let profileUser = null;
let currentUser = null;
let isOwnProfile = false;

// ========== Helper: Show Toast (SweetAlert2) ==========
function showToast(title, message, icon = 'success') {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: icon,
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
}

// ========== Helper: Show Loading ==========
let loadingSwal = null;
function setLoading(isLoading) {
  if (isLoading) {
    loadingSwal = Swal.fire({
      title: 'Loading...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
  } else {
    if (loadingSwal) {
      Swal.close();
      loadingSwal = null;
    }
  }
}

// ========== Fetch Current User ==========
async function fetchCurrentUser() {
  try {
    return await apiClient('/auth/me');
  } catch (err) {
    console.error('Error fetching current user:', err);
    if (err.status === 401) {
      window.location.href = '/login.html';
      return null;
    }
    showToast('Error', 'Could not verify login status. Please refresh.', 'error');
    return null;
  }
}

// ========== Fetch Profile Data ==========
async function fetchProfile(userId = null) {
  setLoading(true);
  try {
    const endpoint = userId ? `/users/${userId}` : '/user/profile';
    return await apiClient(endpoint);
  } catch (err) {
    console.error('Error fetching profile:', err);
    if (err.status === 404) {
      showToast('Error', 'User not found.', 'error');
      setTimeout(() => { window.location.href = '/profile.html'; }, 1500);
    } else {
      showToast('Error', 'Could not load profile. Please refresh.', 'error');
    }
    return null;
  } finally {
    setLoading(false);
  }
}

// ========== Fetch Follow Stats ==========
async function fetchFollowStats(userId) {
  try {
    return await apiClient(`/users/${userId}/follow-stats`);
  } catch (err) {
    console.error('Error fetching follow stats:', err);
    return { followers: 0, following: 0 };
  }
}

// ========== Check if Current User Follows Profile ==========
async function checkFollowing(profileId) {
  if (!currentUser) return false;
  try {
    const data = await apiClient(`/users/${currentUser.id}/following/${profileId}`);
    return data.isFollowing;
  } catch (err) {
    console.error('Error checking follow status:', err);
    return false;
  }
}

// ========== Render Profile ==========
function renderProfile() {
  if (!profileUser) return;

  elements.profileName.textContent = profileUser.username;
  elements.userIdSpan.textContent = `User ID: ${profileUser.userId || profileUser.id}`;
  elements.avatarImg.src = profileUser.avatar || '/assets/images/default-avatar.png';
  elements.statWinnings.textContent = formatCurrency(profileUser.winnings || 0, true);
  elements.statPlayed.textContent = profileUser.played || 0;
  elements.statRank.textContent = '#' + (profileUser.rank || 0);
  elements.accountPhone.textContent = profileUser.phone || '—';
  elements.displayUsername.textContent = profileUser.username;
  elements.displayEmail.textContent = profileUser.email || '—';

  if (isOwnProfile) {
    elements.accountUsername.textContent = profileUser.username;
    elements.accountEmail.textContent = profileUser.email || '—';
    elements.editUsernameLink.style.display = 'flex';
    elements.editEmailLink.style.display = 'flex';
    elements.usernameDisplay.style.display = 'none';
    elements.emailDisplay.style.display = 'none';
    elements.editProfileContainer.style.display = 'block';
    elements.avatarUploadBtn.style.display = 'flex';
  } else {
    elements.editUsernameLink.style.display = 'none';
    elements.editEmailLink.style.display = 'none';
    elements.usernameDisplay.style.display = 'flex';
    elements.emailDisplay.style.display = 'flex';
    elements.editProfileContainer.style.display = 'none';
    elements.avatarUploadBtn.style.display = 'none';
  }

  if (elements.achievementsList) {
    if (profileUser.achievements && profileUser.achievements.length) {
      elements.achievementsList.innerHTML = profileUser.achievements.map(ach => `
        <div class="achievement-badge">
          <div class="badge-icon ${ach.iconClass || ''}">
            <iconify-icon icon="${ach.icon}"></iconify-icon>
          </div>
          <span>${ach.name}</span>
        </div>
      `).join('');
    } else {
      elements.achievementsList.innerHTML = '<p class="text-muted">No achievements yet.</p>';
    }
  }

  fetchFollowStats(profileUser.id).then(stats => {
    elements.followersCount.textContent = stats.followers;
    elements.followingCount.textContent = stats.following;
  });

  if (!isOwnProfile && currentUser) {
    elements.followBtn.style.display = 'block';
    checkFollowing(profileUser.id).then(isFollowing => {
      elements.followBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';
      elements.followBtn.className = isFollowing ? 'btn btn-primary' : 'btn btn-outline';
    });
  } else {
    elements.followBtn.style.display = 'none';
  }
}

// ========== Follow/Unfollow ==========
async function handleFollow() {
  if (!currentUser || !profileUser) return;

  const isFollowing = elements.followBtn.textContent === 'Unfollow';
  const method = isFollowing ? 'DELETE' : 'POST';

  elements.followBtn.disabled = true;

  try {
    await apiClient(`/users/${profileUser.id}/follow`, { method });
    elements.followBtn.textContent = isFollowing ? 'Follow' : 'Unfollow';
    elements.followBtn.className = isFollowing ? 'btn btn-outline' : 'btn btn-primary';

    const stats = await fetchFollowStats(profileUser.id);
    elements.followersCount.textContent = stats.followers;
    showToast('Success', isFollowing ? 'Unfollowed' : 'Following', 'success');
  } catch (err) {
    console.error(err);
    showToast('Error', `Could not ${isFollowing ? 'unfollow' : 'follow'} user.`, 'error');
  } finally {
    elements.followBtn.disabled = false;
  }
}

// ========== Avatar Upload ==========
async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const data = await apiClient('/user/avatar', {
      method: 'POST',
      body: formData
    });
    profileUser.avatar = data.avatarUrl;
    elements.avatarImg.src = data.avatarUrl;
    showToast('Success', 'Avatar updated!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Error', 'Could not upload avatar.', 'error');
  }
}

// ========== Update Profile Field ==========
async function updateProfileField(field, value) {
  try {
    const updatedUser = await apiClient('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify({ [field]: value })
    });
    profileUser = { ...profileUser, ...updatedUser };
    if (currentUser && currentUser.id === profileUser.id) {
      currentUser = profileUser;
    }
    renderProfile();
    showToast('Success', `${field} updated!`, 'success');
  } catch (err) {
    console.error(err);
    showToast('Error', `Could not update ${field}.`, 'error');
  }
}

// ========== Event Listeners ==========
function setupAvatarUpload() {
  elements.avatarUploadBtn.addEventListener('click', async () => {
    const { value: file } = await Swal.fire({
      title: 'Upload Profile Picture',
      input: 'file',
      inputAttributes: { accept: 'image/*' },
      showCancelButton: true,
      confirmButtonText: 'Upload',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) return 'Please select an image.';
      },
    });
    if (file) await uploadAvatar(file);
  });
}

function setupEditUsername() {
  elements.editUsernameLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const { value: newUsername } = await Swal.fire({
      title: 'Edit Username',
      input: 'text',
      inputLabel: 'New username',
      inputValue: profileUser.username,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return 'Username cannot be empty.';
        if (value.length < 3) return 'Username must be at least 3 characters.';
      },
    });
    if (newUsername && newUsername !== profileUser.username) {
      await updateProfileField('username', newUsername);
    }
  });
}

function setupEditEmail() {
  elements.editEmailLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const { value: newEmail } = await Swal.fire({
      title: 'Edit Email',
      input: 'email',
      inputLabel: 'New email address',
      inputValue: profileUser.email || '',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return 'Email cannot be empty.';
        if (!/^\S+@\S+\.\S+$/.test(value)) return 'Please enter a valid email.';
      },
    });
    if (newEmail && newEmail !== profileUser.email) {
      await updateProfileField('email', newEmail);
    }
  });
}

function setupEditProfile() {
  elements.editProfileBtn.addEventListener('click', async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Profile',
      html: `
        <input id="swal-username" class="swal2-input" placeholder="Username" value="${profileUser.username}">
        <input id="swal-email" class="swal2-input" placeholder="Email" value="${profileUser.email || ''}">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const username = document.getElementById('swal-username').value;
        const email = document.getElementById('swal-email').value;
        if (!username) {
          Swal.showValidationMessage('Username cannot be empty');
          return false;
        }
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
          Swal.showValidationMessage('Please enter a valid email');
          return false;
        }
        return { username, email };
      },
    });

    if (formValues) {
      if (formValues.username !== profileUser.username) {
        await updateProfileField('username', formValues.username);
      }
      if (formValues.email !== profileUser.email) {
        await updateProfileField('email', formValues.email);
      }
    }
  });
}

function setupBackButton() {
  elements.backBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.history.back();
  });
}

function setupAchievements() {
  elements.viewAllAchievements.addEventListener('click', (e) => {
    e.preventDefault();
    const userIdParam = !isOwnProfile ? `?userId=${profileUser.id}` : '';
    window.location.href = `achievements.html${userIdParam}`;
  });
}

function setupFollow() {
  elements.followBtn.addEventListener('click', handleFollow);
}

// ========== Initialize ==========
(async function init() {
  currentUser = await fetchCurrentUser();
  if (!currentUser) return;

  const profileUserId = getQueryParam('userId');
  isOwnProfile = !profileUserId || profileUserId === currentUser.id;
  const targetId = isOwnProfile ? null : profileUserId;

  profileUser = await fetchProfile(targetId);
  if (!profileUser) return;

  renderProfile();

  if (isOwnProfile) {
    setupAvatarUpload();
    setupEditUsername();
    setupEditEmail();
    setupEditProfile();
  }
  setupBackButton();
  setupAchievements();
  setupFollow();
})();
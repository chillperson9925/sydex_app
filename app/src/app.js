// DOM Elements
const boardList = document.getElementById('board-list');
const columnsContainer = document.getElementById('columns-container');
const activeBoardTitle = document.getElementById('active-board-title');
const boardView = document.getElementById('board-view');
const settingsView = document.getElementById('settings-view');
const homeView = document.getElementById('home-view');
const homeNavBtn = document.getElementById('home-nav-btn');

// Auth Elements
const authScreen = document.getElementById('auth-screen');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');

// Modals
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-input');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

const confirmOverlay = document.getElementById('confirm-overlay');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

// Buttons
const addBoardBtn = document.getElementById('add-board-btn');
const addFolderBtn = document.getElementById('add-folder-btn');
const addColumnBtn = document.getElementById('add-column-btn');
const statsBtn = document.getElementById('stats-btn');
const collaboratorsBtn = document.getElementById('collaborators-btn');
const editBoardTitleBtn = document.getElementById('edit-board-title-btn');
const settingsBtn = document.getElementById('settings-btn');

// Inline Edit Elements
const boardTitleDisplay = document.getElementById('board-title-display');
const boardTitleEdit = document.getElementById('board-title-edit');
const boardTitleInput = document.getElementById('board-title-input');
const saveBoardTitleBtn = document.getElementById('save-board-title-btn');
const cancelBoardTitleBtn = document.getElementById('cancel-board-title-btn');

let modalAction = null; // To keep track of what the modal is saving
let currentActionContext = null; // Store ID context for modal
let draggedTask = null; // Reference to currently dragged task
let draggedColumn = null; // Reference to currently dragged column

function updateSidebarProfile() {
  const sidebarUsername = document.getElementById('sidebar-username');
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  
  try {
    const userStr = localStorage.getItem('sydex_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.username) {
        sidebarUsername.textContent = user.username;
        if (user.avatar) {
          sidebarAvatar.textContent = '';
          sidebarAvatar.style.backgroundImage = `url(${user.avatar})`;
        } else {
          sidebarAvatar.textContent = user.username.charAt(0).toUpperCase();
          sidebarAvatar.style.backgroundImage = 'none';
        }
      }
    }
  } catch(e) {
    console.error('Failed to parse sydex_user', e);
  }
}

function updateHomeGreeting(forceWelcomeBack = false) {
  const greetingTitle = document.getElementById('home-greeting-title');
  if (!greetingTitle) return;

  let username = 'User';
  try {
    const userStr = localStorage.getItem('sydex_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.username) {
        username = user.username;
      }
    }
  } catch(e) {
    // Ignore parse error
  }

  let greeting = 'Good evening';
  if (forceWelcomeBack) {
    greeting = 'Welcome Back!';
  } else {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      greeting = 'Good morning';
    } else if (hour >= 12 && hour < 18) {
      greeting = 'Good afternoon';
    }
  }

  // If greeting is Welcome Back!, we don't need a comma. So we format differently.
  if (forceWelcomeBack) {
    greetingTitle.textContent = `${greeting} ${username}`;
  } else {
    greetingTitle.textContent = `${greeting}, ${username}`;
  }
}

// Avatar Crop Logic
const avatarInput = document.getElementById('avatar-upload-input');
const sidebarAvatar = document.getElementById('sidebar-avatar');
const avatarWrapper = document.getElementById('avatar-wrapper');

const cropOverlay = document.getElementById('crop-overlay');
const cropCloseBtn = document.getElementById('crop-close-btn');
const cropCancelBtn = document.getElementById('crop-cancel-btn');
const cropSaveBtn = document.getElementById('crop-save-btn');
const cropImage = document.getElementById('crop-image');
const cropContainer = document.getElementById('crop-container');
const cropZoomSlider = document.getElementById('crop-zoom-slider');

let cropState = {
  scale: 1,
  panX: 0,
  panY: 0,
  isDragging: false,
  startX: 0,
  startY: 0
};

function updateCropTransform() {
  if (!cropImage) return;

  const maskRadius = 120;
  const imgW = cropImage.naturalWidth * cropState.scale;
  const imgH = cropImage.naturalHeight * cropState.scale;

  const maxX = Math.max(0, (imgW / 2) - maskRadius);
  const maxY = Math.max(0, (imgH / 2) - maskRadius);

  if (cropState.panX > maxX) cropState.panX = maxX;
  if (cropState.panX < -maxX) cropState.panX = -maxX;
  if (cropState.panY > maxY) cropState.panY = maxY;
  if (cropState.panY < -maxY) cropState.panY = -maxY;

  cropImage.style.transform = `translate(calc(-50% + ${cropState.panX}px), calc(-50% + ${cropState.panY}px)) scale(${cropState.scale})`;
}

if (avatarWrapper && avatarInput && cropOverlay) {
  avatarWrapper.addEventListener('click', () => {
    avatarInput.click();
  });

  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      cropImage.onload = () => {
        // Reset state
        cropState = { scale: 1, panX: 0, panY: 0, isDragging: false, startX: 0, startY: 0 };
        
        // Min scale ensures image completely covers the 240x240 mask
        const minScale = Math.max(240 / cropImage.naturalWidth, 240 / cropImage.naturalHeight);
        cropState.scale = minScale;
        
        cropZoomSlider.min = minScale;
        cropZoomSlider.max = minScale * 3;
        cropZoomSlider.step = "0.01";
        cropZoomSlider.value = minScale;

        updateCropTransform();
        cropOverlay.classList.remove('hidden');
      };
      cropImage.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
    avatarInput.value = ''; // Reset input
  });

  // Dragging logic
  cropContainer.addEventListener('mousedown', (e) => {
    e.preventDefault(); // prevent native image dragging
    cropState.isDragging = true;
    cropState.startX = e.clientX - cropState.panX;
    cropState.startY = e.clientY - cropState.panY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!cropState.isDragging) return;
    cropState.panX = e.clientX - cropState.startX;
    cropState.panY = e.clientY - cropState.startY;
    updateCropTransform();
  });

  window.addEventListener('mouseup', () => {
    cropState.isDragging = false;
  });

  // Zoom slider
  cropZoomSlider.addEventListener('input', (e) => {
    cropState.scale = parseFloat(e.target.value);
    updateCropTransform();
  });

  // Close/Cancel
  const closeCrop = () => cropOverlay.classList.add('hidden');
  cropCloseBtn.addEventListener('click', closeCrop);
  cropCancelBtn.addEventListener('click', closeCrop);

  // Save
  cropSaveBtn.addEventListener('click', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    const maskSize = 240;
    const scale = cropState.scale;
    const imgW = cropImage.naturalWidth * scale;
    const imgH = cropImage.naturalHeight * scale;

    const cx = cropContainer.clientWidth / 2;
    const cy = cropContainer.clientHeight / 2;

    const imgLeft = cx - (imgW / 2) + cropState.panX;
    const imgTop = cy - (imgH / 2) + cropState.panY;

    const extractX = cx - (maskSize / 2);
    const extractY = cy - (maskSize / 2);

    const sourceX = (extractX - imgLeft) / scale;
    const sourceY = (extractY - imgTop) / scale;
    const sourceSize = maskSize / scale;

    // Fill background black just in case
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 300, 300);
    ctx.drawImage(cropImage, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 300, 300);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    try {
      cropSaveBtn.disabled = true;
      cropSaveBtn.textContent = 'Saving...';
      await window.api.updateAvatar(dataUrl);
      updateSidebarProfile();
      updateHomeGreeting();
      closeCrop();
    } catch (err) {
      console.error(err);
      alert('Failed to save profile picture: ' + err.message);
    } finally {
      cropSaveBtn.disabled = false;
      cropSaveBtn.textContent = 'Save';
    }
  });
}

async function init() {
  updateSidebarProfile();
  await store.load();

  if (!window.api.token) {
    authScreen.classList.remove('hidden');
  } else {
    loadPermissions();
  }

  // Apply startup location preference
  const startupPref = localStorage.getItem('sydex-startup-location') || 'home';
  if (startupPref === 'home') {
    store.setActiveBoard(null);
  } else if (startupPref === 'last') {
    const lastBoardId = localStorage.getItem('sydex-last-board-id');
    if (lastBoardId && store.getBoards().find(b => b.id === lastBoardId)) {
      store.setActiveBoard(lastBoardId);
    } else {
      store.setActiveBoard(null);
    }
  }

  renderBoards();
  renderActiveBoard();

  // Save current board on window close for "Last Location" startup
  window.addEventListener('beforeunload', () => {
    const activeId = store.data.activeBoardId || '';
    localStorage.setItem('sydex-last-board-id', activeId);
  });

  // Real-time WebSocket sync for collaboration
  if (window.api && window.api.token) {
    window.api.connectSocket();

    // Track if a deferred sync is pending
    window._pendingSync = false;

    window.api.onBoardUpdated((data) => {
      const currentActiveId = store.data.activeBoardId;

      // Use the board data pushed directly from the server (no re-fetch needed)
      if (data.boardData) {
        const newData = data.boardData;
        if (!newData.folders) newData.folders = [];

        // Check if user is actively editing something
        const isEditing = document.querySelector('.inline-new-task') ||
                          document.querySelector('.inline-new-column') ||
                          document.querySelector('.inline-join-board') ||
                          document.querySelector('.inline-new-board') ||
                          document.querySelector('.inline-new-folder') ||
                          document.querySelector('.task-card.editing') ||
                          (boardTitleEdit && !boardTitleEdit.classList.contains('hidden'));

        // Always update the store data silently
        store.data = newData;
        store.data.activeBoardId = currentActiveId;

        if (isEditing) {
          // Defer re-render until editing is done
          window._pendingSync = true;
        } else {
          window._pendingSync = false;
          renderBoards();
          renderActiveBoard();
        }
      }
    });
  }

  // Loading Screen Logic
  const loadingScreen = document.getElementById('loading-screen');
  const progressBar = document.getElementById('loading-progress-bar');
  const statusText = document.getElementById('loading-status');
  
  if (loadingScreen && progressBar && statusText) {
    const startNormalLoading = () => {
      const statuses = [
        'Initializing core systems...',
        'Loading boards...',
        'Syncing tasks...',
        'Applying preferences...',
        'Almost ready...'
      ];
      
      progressBar.style.transition = 'none'; // Use JS for perfect smoothness
      
      const totalDuration = 3000; // 3 seconds total smooth loading
      let elapsed = 0;
      let lastTime = performance.now();
      let isFrozen = false;
      
      // Pick 3 random percentages to freeze at
      const freezePoints = [
        Math.random() * 20 + 20, // freeze somewhere between 20-40%
        Math.random() * 20 + 50, // freeze somewhere between 50-70%
        Math.random() * 10 + 85  // freeze somewhere between 85-95%
      ];
      
      function updateProgress(currentTime) {
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        
        if (!isFrozen) {
          elapsed += deltaTime;
        }
        
        let progress = (elapsed / totalDuration) * 100;
        if (progress >= 100) progress = 100;
        
        progressBar.style.width = `${progress}%`;
        const statusIndex = Math.floor((progress / 100) * statuses.length);
        statusText.textContent = statuses[Math.min(statusIndex, statuses.length - 1)];
        
        if (progress >= 100) {
          statusText.textContent = 'Welcome to Sydex!';
          setTimeout(() => {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.visibility = 'hidden';
            setTimeout(() => {
              loadingScreen.remove();
            }, 500);
          }, 750);
          return;
        }
        
        // Trigger freeze if we cross a freeze point
        if (freezePoints.length > 0 && progress >= freezePoints[0]) {
          freezePoints.shift(); // remove used point
          isFrozen = true;
          setTimeout(() => {
            isFrozen = false;
            lastTime = performance.now(); // reset delta so it doesn't jump
          }, 200); // Freeze for exactly 200ms
        }
        
        requestAnimationFrame(updateProgress);
      }
      
      // Start animation loop
      requestAnimationFrame((t) => { lastTime = t; updateProgress(t); });
    };

    if (window.electronAPI && window.electronAPI.checkForUpdates) {
      statusText.textContent = 'Checking for updates...';
      progressBar.style.width = '10%';
      
      window.electronAPI.checkForUpdates().then(result => {
        if (result && result.available) {
          statusText.textContent = 'Downloading update...';
          progressBar.style.transition = 'width 0.2s';
          progressBar.style.width = '0%';
          
          window.electronAPI.onUpdateProgress((percent) => {
            progressBar.style.width = `${percent}%`;
            statusText.textContent = `Downloading update... ${Math.round(percent)}%`;
          });

          window.electronAPI.onUpdateDownloaded(() => {
            statusText.textContent = 'Update downloaded! Restarting...';
            progressBar.style.width = '100%';
            setTimeout(() => {
              window.electronAPI.installUpdate();
            }, 1000);
          });

          window.electronAPI.downloadUpdate();
        } else {
          startNormalLoading();
        }
      }).catch(err => {
        console.error('Update error:', err);
        startNormalLoading();
      });
    } else {
      startNormalLoading();
    }
  }
}

// --- RENDERING ---

function renderBoards() {
  // FLIP: capture old positions
  const oldPositions = {};
  boardList.querySelectorAll('.board-item').forEach(el => {
    const id = el.dataset?.boardId;
    if (id) oldPositions[id] = el.getBoundingClientRect();
  });

  boardList.innerHTML = '';
  const sharedBoardList = document.getElementById('shared-board-list');
  if (sharedBoardList) sharedBoardList.innerHTML = '';

  const folders = store.data.folders || [];
  const allBoards = store.getBoards();
  const ownedBoards = allBoards.filter(b => !b.isShared);
  const sharedBoards = allBoards.filter(b => b.isShared);

  const sharedBoardsContainer = document.getElementById('shared-boards-container');
  if (sharedBoardsContainer) {
    if (sharedBoards.length > 0) {
      sharedBoardsContainer.style.display = 'flex';
      const savedHeight = localStorage.getItem('sydex-top-list-height');
      if (savedHeight) boardList.style.flex = `0 0 ${savedHeight}`;
    } else {
      sharedBoardsContainer.style.display = 'none';
      boardList.style.flex = '1';
    }
  }

  // 1. Render Folders
  folders.forEach(folder => {
    const folderEl = document.createElement('li');
    folderEl.className = 'folder-item';
    folderEl.dataset.folderId = folder.id;
    folderEl.style.marginBottom = '2px';
    folderEl.style.borderRadius = 'var(--radius-sm)';
    folderEl.innerHTML = `
      <div class="folder-title" style="display: flex; align-items: center; justify-content: space-between; width: 100%; cursor: pointer; padding: 8px 15px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="folder-icon" style="transform: ${folder.expanded ? 'rotate(90deg)' : 'rotate(0)'}; transition: transform 0.2s;">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">${folder.name}</span>
        </div>
        <div style="display: flex; gap: 2px;">
          <button class="icon-btn add-nested-board-btn tooltip-btn" data-tooltip="Add Board" style="opacity: 0; transition: opacity 0.2s;" title=""><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
          <button class="icon-btn delete-folder-btn tooltip-btn" data-tooltip="Delete Folder" style="opacity: 0; transition: opacity 0.2s;" title=""><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>
      </div>
    `;

    folderEl.addEventListener('dragover', (e) => { e.preventDefault(); folderEl.style.background = 'rgba(255,255,255,0.05)'; });
    folderEl.addEventListener('dragleave', (e) => folderEl.style.background = '');
    folderEl.addEventListener('drop', (e) => {
      e.preventDefault(); folderEl.style.background = '';
      if (draggedBoardId) { store.moveBoardToFolder(draggedBoardId, folder.id); renderBoards(); }
    });

    const folderTitle = folderEl.querySelector('.folder-title');
    const deleteBtn = folderEl.querySelector('.delete-folder-btn');
    const addNestedBtn = folderEl.querySelector('.add-nested-board-btn');

    folderEl.onmouseenter = () => {
      deleteBtn.style.opacity = '1';
      addNestedBtn.style.opacity = '1';
    };
    folderEl.onmouseleave = () => {
      deleteBtn.style.opacity = '0';
      addNestedBtn.style.opacity = '0';
    };

    addNestedBtn.onclick = (e) => {
      e.stopPropagation();
      if (!folder.expanded) { 
        store.toggleFolder(folder.id); 
        folderBoardsWrapper.classList.add('expanded');
        folderEl.querySelector('.folder-icon').style.transform = 'rotate(90deg)';
      }
      createInlineBoard(folder.id);
    };

    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      openConfirmModal(
        'Delete Folder',
        `Are you sure you want to delete folder "${folder.name}"?`,
        () => {
          const snap = store.createSnapshot();
          store.deleteFolder(folder.id, true);
          renderBoards();
          renderActiveBoard();
          notify('Folder and its boards deleted', 'warning', 5000, { text: 'Undo', onClick: () => { store.restoreSnapshot(snap); renderBoards(); renderActiveBoard(true); } });
        },
        'Delete Folder Only',
        () => {
          const snap = store.createSnapshot();
          store.deleteFolder(folder.id, false);
          renderBoards();
          renderActiveBoard();
          notify('Folder deleted', 'warning', 5000, { text: 'Undo', onClick: () => { store.restoreSnapshot(snap); renderBoards(); renderActiveBoard(true); } });
        }
      );
      confirmYesBtn.textContent = 'Delete with Boards';
    };

    const folderBoardsWrapper = document.createElement('div');
    folderBoardsWrapper.className = `folder-boards-wrapper ${folder.expanded ? 'expanded' : ''}`;
    const folderBoardsList = document.createElement('ul');
    folderBoardsList.className = 'folder-boards-list';
    
    ownedBoards.filter(b => b.folderId === folder.id).forEach(board => {
      folderBoardsList.appendChild(createBoardItem(board, true));
    });
    
    folderBoardsWrapper.appendChild(folderBoardsList);
    folderEl.appendChild(folderBoardsWrapper);

    folderTitle.onclick = () => { 
      store.toggleFolder(folder.id); 
      const isExpanded = store.data.folders.find(f => f.id === folder.id).expanded;
      const icon = folderEl.querySelector('.folder-icon');
      if (isExpanded) {
        folderBoardsWrapper.classList.add('expanded');
        icon.style.transform = 'rotate(90deg)';
      } else {
        folderBoardsWrapper.classList.remove('expanded');
        icon.style.transform = 'rotate(0)';
      }
    };
    
    boardList.appendChild(folderEl);
  });

  // Divider between folders and uncategorized
  if (folders.length > 0) {
    const divider = document.createElement('li');
    divider.className = 'sidebar-divider';
    const hasUncategorized = ownedBoards.some(b => !b.folderId);
    if (hasUncategorized) {
      divider.innerHTML = '<div class="divider-line"></div><span class="divider-label">Uncategorized</span><div class="divider-line"></div>';
    } else {
      divider.innerHTML = '<div class="divider-line"></div>';
    }
    boardList.appendChild(divider);

    // Drop box - only visible during drag
    const dropBox = document.createElement('li');
    dropBox.className = 'uncategorized-drop-box';
    dropBox.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Drop here to uncategorize';
    dropBox.addEventListener('dragover', (e) => { e.preventDefault(); dropBox.classList.add('drop-box-active'); });
    dropBox.addEventListener('dragleave', () => dropBox.classList.remove('drop-box-active'));
    dropBox.addEventListener('drop', (e) => {
      e.preventDefault(); dropBox.classList.remove('drop-box-active');
      if (draggedBoardId) { store.moveBoardToFolder(draggedBoardId, null); renderBoards(); }
    });
    boardList.appendChild(dropBox);
  }

  // 2. Render Root Boards
  ownedBoards.filter(b => !b.folderId).forEach(board => boardList.appendChild(createBoardItem(board, false)));

  // 3. Render Shared Boards
  if (sharedBoardList) {
    sharedBoards.forEach(board => {
      const el = createBoardItem(board, false);
      // Optional: Add owner name indicator
      const nameSpan = el.querySelector('.board-name');
      if (nameSpan && board.ownerName) {
        nameSpan.innerHTML = `${board.name} <span style="font-size: 10px; color: var(--primary-color); opacity: 0.8; margin-left: 5px; border: 1px solid var(--primary-color); padding: 1px 4px; border-radius: 4px;">@${board.ownerName}</span>`;
      }
      sharedBoardList.appendChild(el);
    });
  }

  // FLIP: animate to new positions
  boardList.querySelectorAll('.board-item').forEach(el => {
    const id = el.dataset?.boardId;
    if (id && oldPositions[id]) {
      const newRect = el.getBoundingClientRect();
      const deltaY = oldPositions[id].top - newRect.top;
      if (Math.abs(deltaY) > 1) {
        el.style.transform = `translateY(${deltaY}px)`;
        el.style.transition = 'none';
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)';
          el.style.transform = '';
        });
      }
    }
  });
}

let draggedBoardId = null;

function createBoardItem(board, isNested) {
  const li = document.createElement('li');
  li.className = `board-item ${board.id === store.data.activeBoardId ? 'active' : ''}`;
  li.dataset.boardId = board.id;
  li.textContent = board.name;
  if (isNested) {
    li.style.marginLeft = '15px';
    li.style.width = 'auto';
  }

  li.draggable = true;
  li.addEventListener('dragstart', (e) => {
    draggedBoardId = board.id;
    e.dataTransfer.setData('text/plain', board.id);
    setTimeout(() => li.style.opacity = '0.5', 0);
    // Show drop box
    const dropBox = boardList.querySelector('.uncategorized-drop-box');
    if (dropBox) { dropBox.style.visibility = 'visible'; dropBox.style.maxHeight = '50px'; dropBox.style.padding = '12px'; dropBox.style.marginTop = '4px'; dropBox.style.marginBottom = '4px'; }
  });
  li.addEventListener('dragend', () => {
    draggedBoardId = null;
    li.style.opacity = '1';
    boardList.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    // Hide drop box
    const dropBox = boardList.querySelector('.uncategorized-drop-box');
    if (dropBox) { dropBox.style.visibility = 'hidden'; dropBox.style.maxHeight = '0'; dropBox.style.padding = '0 12px'; dropBox.style.marginTop = '0'; dropBox.style.marginBottom = '0'; dropBox.classList.remove('drop-box-active'); }
  });

  li.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedBoardId || draggedBoardId === board.id) return;
    // Clear others
    boardList.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    li.classList.add('drop-target');
  });

  li.addEventListener('dragleave', () => {
    li.classList.remove('drop-target');
  });

  li.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    boardList.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    if (!draggedBoardId || draggedBoardId === board.id) return;
    const draggedBoard = store.getBoards().find(b => b.id === draggedBoardId);
    if (!draggedBoard) return;

    // If different folder, move to target's folder first
    if ((draggedBoard.folderId || null) !== (board.folderId || null)) {
      store.moveBoardToFolder(draggedBoardId, board.folderId);
    }
    // Then reorder next to the target
    store.reorderBoard(draggedBoardId, board.id);
    renderBoards();
  });

  li.onclick = () => {
    store.setActiveBoard(board.id);
    renderBoards();
    renderActiveBoard(true); // Animate on board switch
  };

  li.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, board);
  });

  return li;
}

function renderActiveBoard(animate = false, oldPositions = null) {
  const board = store.getActiveBoard();
  columnsContainer.innerHTML = '';
  
  if (animate) {
    columnsContainer.classList.remove('board-animate-in');
    void columnsContainer.offsetWidth; // Trigger reflow
    columnsContainer.classList.add('board-animate-in');
  }

  if (settingsView) {
    settingsView.classList.add('hidden');
    if (settingsBtn) settingsBtn.classList.remove('settings-active');
  }

  if (!board) {
    // Show Home View when no board is selected
    if (homeView) homeView.classList.remove('hidden');
    if (homeNavBtn) homeNavBtn.classList.add('active');
    
    updateHomeGreeting();
    
    boardTitleDisplay.classList.remove('hidden');
    boardTitleEdit.classList.add('hidden');
    activeBoardTitle.textContent = 'Home Dashboard';
    boardView.classList.add('hidden');
    editBoardTitleBtn.classList.add('hidden');
    if (addColumnBtn) addColumnBtn.classList.add('hidden');
    if (statsBtn) statsBtn.classList.add('hidden');
    const extrasBtn = document.getElementById('extras-btn');
    if (extrasBtn) extrasBtn.classList.add('hidden');
    if (collaboratorsBtn) collaboratorsBtn.classList.add('hidden');
    return;
  }

  // A board is selected, hide Home View
  if (homeView) homeView.classList.add('hidden');
  if (homeNavBtn) homeNavBtn.classList.remove('active');

  boardTitleDisplay.classList.remove('hidden');
  boardTitleEdit.classList.add('hidden');
  activeBoardTitle.textContent = board.name;
  boardView.classList.remove('hidden');
  
  // Apply Board Background
  if (board.background) {
    boardView.style.background = board.background;
  } else {
    boardView.style.background = ''; // reset to default
  }

  editBoardTitleBtn.classList.remove('hidden');
  if (addColumnBtn) addColumnBtn.classList.remove('hidden');
  if (statsBtn) statsBtn.classList.remove('hidden');
  const extrasBtn = document.getElementById('extras-btn');
  if (extrasBtn) extrasBtn.classList.remove('hidden');
  
  if (collaboratorsBtn) {
    if (board.hasCollaborators && !board.isShared) {
      collaboratorsBtn.classList.remove('hidden');
      collaboratorsBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      `;
      collaboratorsBtn.title = 'Manage Collaborators';
    } else {
      collaboratorsBtn.classList.add('hidden');
    }
  }

  const existingEmpty = boardView.querySelector('.board-empty-state');
  if (existingEmpty) existingEmpty.remove();
  const existingStats = boardView.querySelector('.board-stats-view');
  if (existingStats) existingStats.remove();
  if (statsBtn) statsBtn.classList.remove('settings-active');

  if (board.columns.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'board-empty-state';
    emptyState.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 20px; opacity: 0.2;">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="9" y1="21" x2="9" y2="9"></line>
      </svg>
      <h2>This board is empty</h2>
      <p>Click the <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; background: rgba(255,255,255,0.05); border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); font-weight: 600; vertical-align: middle; margin: 0 2px; transform: translateY(-1px);">+</span> icon in the top right to add your first category.</p>
    `;
    boardView.appendChild(emptyState);
  } else {
    board.columns.forEach(col => {
      const colEl = createColumnElement(col);
      columnsContainer.appendChild(colEl);
    });
  }

  // FLIP: animate to new positions
  if (oldPositions) {
    columnsContainer.querySelectorAll('.column').forEach(col => {
      const id = col.dataset?.id;
      if (id && oldPositions[id]) {
        const newRect = col.getBoundingClientRect();
        const deltaX = oldPositions[id].left - newRect.left;
        // Also check deltaY if columns wrap
        const deltaY = oldPositions[id].top - newRect.top;
        
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
          col.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          col.style.transition = 'none';
          requestAnimationFrame(() => {
            col.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)';
            col.style.transform = '';
          });
        }
      }
    });
  }

}

// --- COLUMN DRAG & DROP EVENTS ---
columnsContainer.addEventListener('dragover', (e) => {
  if (!draggedColumn) return;
  e.preventDefault();
  const afterElement = getDragAfterColumn(columnsContainer, e.clientX);
  
  // Create or find column drop placeholder
  let placeholder = document.getElementById('column-drop-placeholder');
  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.id = 'column-drop-placeholder';
    placeholder.className = 'column drop-placeholder';
    placeholder.style.height = draggedColumn.offsetHeight + 'px';
  }

  if (afterElement == null) {
    if (columnsContainer.lastElementChild !== placeholder) {
      columnsContainer.appendChild(placeholder);
    }
  } else {
    if (placeholder.nextElementSibling !== afterElement) {
      columnsContainer.insertBefore(placeholder, afterElement);
    }
  }
});

columnsContainer.addEventListener('dragleave', (e) => {
  // Only remove placeholder if we actually leave the container entirely
  if (!columnsContainer.contains(e.relatedTarget)) {
    const placeholder = document.getElementById('column-drop-placeholder');
    if (placeholder) placeholder.remove();
  }
});

columnsContainer.addEventListener('drop', (e) => {
  if (!draggedColumn) return;
  e.preventDefault();
  
  const placeholder = document.getElementById('column-drop-placeholder');
  let targetColId = null;
  
  if (placeholder) {
    const nextSibling = placeholder.nextElementSibling;
    if (nextSibling && nextSibling.dataset.id) {
      targetColId = nextSibling.dataset.id;
    }
    placeholder.remove();
  }
  
  const draggedId = draggedColumn.dataset.id;
  if (draggedId !== targetColId) {
    store.reorderColumn(draggedId, targetColId);
    renderActiveBoard();
  }
});

function createColumnElement(column) {
  const div = document.createElement('div');
  div.className = 'column';
  div.dataset.id = column.id;
  div.draggable = false; // Initially false, toggled by header

  div.addEventListener('dragstart', (e) => {
    if (e.target !== div) return; // Prevent tasks from triggering column drag
    draggedColumn = div;
    setTimeout(() => div.classList.add('dragging'), 0);
  });

  div.addEventListener('dragend', (e) => {
    if (e.target !== div) return;
    div.classList.remove('dragging');
    draggedColumn = null;
    div.draggable = false; // Reset to false after drag
    const placeholder = document.getElementById('column-drop-placeholder');
    if (placeholder) placeholder.remove();
  });

  const header = document.createElement('div');
  header.className = 'column-header';

  // Only allow column dragging when grabbing the header
  header.addEventListener('mousedown', () => {
    div.draggable = true;
  });
  
  header.addEventListener('mouseup', () => {
    div.draggable = false;
  });
  
  header.addEventListener('mouseleave', () => {
    if (!draggedColumn) div.draggable = false;
  });

  const title = document.createElement('h3');
  title.textContent = column.name;

  // Inline rename on double-click
  const startRename = () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = column.name;
    input.maxLength = 30;
    input.className = 'inline-rename-input';
    input.style.cssText = 'width:100%; font-size:inherit; font-weight:inherit; padding:2px 4px; background:transparent; border:none; border-bottom:2px solid var(--primary-color); outline:none; color:var(--text-main);';

    title.replaceWith(input);
    input.focus();
    input.select();

    let saved = false;
    const save = () => {
      if (saved) return;
      saved = true;
      const newName = input.value.trim();
      if (newName && newName !== column.name) {
        const oldName = column.name;
        store.renameColumn(column.id, newName);
        title.textContent = newName;
        notify('Category renamed', 'info', 4000, {
          text: 'Undo',
          onClick: () => {
            store.renameColumn(column.id, oldName);
            title.textContent = oldName;
          }
        });
      }
      input.replaceWith(title);
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      if (e.key === 'Escape') { saved = true; input.replaceWith(title); }
    });
    input.addEventListener('blur', () => setTimeout(save, 100));
  };

  title.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    startRename();
  });

  // Rename button
  const renameBtn = document.createElement('button');
  renameBtn.className = 'icon-btn tooltip-btn tooltip-top';
  renameBtn.dataset.tooltip = 'Rename';
  renameBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
  renameBtn.onclick = (e) => {
    e.stopPropagation();
    startRename();
  };

  let colDeleteConfirmState = false;
  let colDeleteTimer = null;
  const originalColDeleteIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-btn tooltip-btn tooltip-top';
  deleteBtn.dataset.tooltip = 'Delete Category';
  deleteBtn.innerHTML = originalColDeleteIcon;
  deleteBtn.onclick = () => {
    if (!colDeleteConfirmState) {
      colDeleteConfirmState = true;
      deleteBtn.innerHTML = '<span style="font-size:12px; font-weight:600; margin-right:4px;">Are you sure?</span>' + originalColDeleteIcon;
      deleteBtn.style.color = 'var(--danger-color)';
      deleteBtn.style.width = 'auto';
      deleteBtn.style.padding = '0 6px';
      deleteBtn.dataset.tooltip = 'Click to confirm';
      
      colDeleteTimer = setTimeout(() => {
        colDeleteConfirmState = false;
        deleteBtn.innerHTML = originalColDeleteIcon;
        deleteBtn.style.color = '';
        deleteBtn.style.width = '';
        deleteBtn.style.padding = '';
        deleteBtn.dataset.tooltip = 'Delete Category';
      }, 3000);
    } else {
      clearTimeout(colDeleteTimer);
      
      const oldPositions = {};
      columnsContainer.querySelectorAll('.column').forEach(c => {
        if (c.dataset.id) oldPositions[c.dataset.id] = c.getBoundingClientRect();
      });
      
      // Animate deletion
      div.style.transition = 'all 0.2s ease';
      div.style.opacity = '0';
      div.style.transform = 'scale(0.95)';
      
      setTimeout(() => {
        const snap = store.createSnapshot();
        store.deleteColumn(column.id);
        renderActiveBoard(false, oldPositions);
        notify('Category deleted', 'warning', 5000, {
          text: 'Undo',
          onClick: () => {
            // 1. Record current positions before undo
            const colElements = Array.from(document.querySelectorAll('.column:not(.inline-new-column)'));
            const currentRects = new Map();
            colElements.forEach(el => {
              if (el.dataset.id) currentRects.set(el.dataset.id, el.getBoundingClientRect());
            });

            // 2. Restore and render without full board animation
            store.restoreSnapshot(snap);
            renderActiveBoard(false);

            // 3. Find elements again and animate
            const newElements = Array.from(document.querySelectorAll('.column:not(.inline-new-column)'));
            newElements.forEach(newEl => {
              const id = newEl.dataset.id;
              if (currentRects.has(id)) {
                // Existing column, apply FLIP
                const oldRect = currentRects.get(id);
                const newRect = newEl.getBoundingClientRect();
                const deltaX = oldRect.left - newRect.left;
                if (deltaX !== 0) {
                  newEl.style.transform = `translateX(${deltaX}px)`;
                  newEl.style.transition = 'none';
                  requestAnimationFrame(() => {
                    newEl.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
                    newEl.style.transform = 'translateX(0)';
                    setTimeout(() => {
                      newEl.style.transition = '';
                      newEl.style.transform = '';
                    }, 300);
                  });
                }
              } else {
                // Restored column! Animate it popping in
                newEl.style.opacity = '0';
                newEl.style.transform = 'scale(0.9) translateX(-15px)';
                newEl.style.transition = 'none';
                requestAnimationFrame(() => {
                  newEl.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                  newEl.style.opacity = '1';
                  newEl.style.transform = 'scale(1) translateX(0)';
                  setTimeout(() => {
                    newEl.style.transition = '';
                    newEl.style.transform = '';
                  }, 300);
                });
              }
            });
          }
        });
      }, 200);
    }
  };

  let clearConfirmState = false;
  let clearTimer = null;
  const originalClearIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  const confirmClearIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  const clearBtn = document.createElement('button');
  clearBtn.className = 'icon-btn tooltip-btn tooltip-top';
  clearBtn.dataset.tooltip = 'Clear Tasks';
  clearBtn.innerHTML = originalClearIcon;
  clearBtn.onclick = () => {
    if (column.tasks.length === 0) return;
    
    if (!clearConfirmState) {
      // Step 1: Change to checkmark for confirmation
      clearConfirmState = true;
      clearBtn.innerHTML = confirmClearIcon;
      clearBtn.style.color = 'var(--danger-color)';
      clearBtn.dataset.tooltip = 'Confirm Clear';
      
      // Auto-reset if user doesn't click within 3 seconds
      clearTimer = setTimeout(() => {
        clearConfirmState = false;
        clearBtn.innerHTML = originalClearIcon;
        clearBtn.style.color = '';
        clearBtn.dataset.tooltip = 'Clear Tasks';
      }, 3000);
    } else {
      // Step 2: Execute clear
      clearTimeout(clearTimer);
      const snap = store.createSnapshot();
      store.clearColumnTasks(column.id);
      renderActiveBoard();
      notify('Tasks cleared', 'warning', 5000, { text: 'Undo', onClick: () => { store.restoreSnapshot(snap); renderActiveBoard(true); } });
    }
  };

  const actionsDiv = document.createElement('div');
  actionsDiv.style.display = 'flex';
  actionsDiv.style.gap = '4px';
  actionsDiv.appendChild(renameBtn);
  actionsDiv.appendChild(clearBtn);
  actionsDiv.appendChild(deleteBtn);

  header.appendChild(title);
  header.appendChild(actionsDiv);

  const taskList = document.createElement('div');
  taskList.className = 'task-list';
  taskList.dataset.columnId = column.id;

  // Drag and Drop Events for Task List
  taskList.addEventListener('dragover', handleDragOver);
  taskList.addEventListener('drop', handleDrop);
  taskList.addEventListener('dragleave', handleDragLeave);

  if (column.tasks.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-column-msg';
    emptyState.textContent = 'No tasks here';
    taskList.appendChild(emptyState);
  } else {
    column.tasks.forEach(task => {
      const taskEl = createTaskElement(task, column.id);
      taskList.appendChild(taskEl);
    });
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'add-task-btn';
  addBtn.innerHTML = '+ Add Task';
  addBtn.onclick = () => createInlineTask(column.id, taskList);

  div.appendChild(header);
  div.appendChild(addBtn);
  div.appendChild(taskList);

  return div;
}

function createTaskElement(task, columnId) {
  const div = document.createElement('div');
  div.className = 'task-card';
  div.textContent = task.text;
  div.draggable = true;
  div.dataset.id = task.id;
  div.dataset.columnId = columnId;

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-task-btn';
  editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
  editBtn.onclick = (e) => {
    e.stopPropagation();
    startEditTask(div, task, columnId);
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-task-btn';
  deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    
    // 1. First, record the positions of ALL tasks before deletion
    const taskElements = Array.from(document.querySelectorAll('.task-card:not(.inline-new-task)'));
    const initialRects = new Map();
    taskElements.forEach(el => {
      if (el.dataset.id) {
        initialRects.set(el.dataset.id, el.getBoundingClientRect());
      }
    });

    // 2. Animate out the deleted task
    div.style.transition = 'all 0.2s ease-in';
    div.style.opacity = '0';
    div.style.transform = 'scale(0.9) translateY(-10px)';
    
    setTimeout(() => {
      // 3. Delete and re-render
      const snap = store.createSnapshot();
      store.deleteTask(columnId, task.id);
      renderActiveBoard();
      notify('Task deleted', 'warning', 5000, {
        text: 'Undo',
        onClick: () => {
          // 1. Record current positions before undo
          const taskElements = Array.from(document.querySelectorAll('.task-card:not(.inline-new-task)'));
          const currentRects = new Map();
          taskElements.forEach(el => {
            if (el.dataset.id) currentRects.set(el.dataset.id, el.getBoundingClientRect());
          });

          // 2. Restore and render without full board animation
          store.restoreSnapshot(snap);
          renderActiveBoard(false);

          // 3. Find elements again and animate
          const newElements = Array.from(document.querySelectorAll('.task-card:not(.inline-new-task)'));
          newElements.forEach(newEl => {
            const id = newEl.dataset.id;
            if (currentRects.has(id)) {
              // Existing task, apply FLIP
              const oldRect = currentRects.get(id);
              const newRect = newEl.getBoundingClientRect();
              const deltaY = oldRect.top - newRect.top;
              const deltaX = oldRect.left - newRect.left;
              if (deltaY !== 0 || deltaX !== 0) {
                newEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                newEl.style.transition = 'none';
                requestAnimationFrame(() => {
                  newEl.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
                  newEl.style.transform = 'translate(0, 0)';
                  setTimeout(() => {
                    newEl.style.transition = '';
                    newEl.style.transform = '';
                  }, 300);
                });
              }
            } else {
              // Restored task! Animate it popping in
              newEl.style.opacity = '0';
              newEl.style.transform = 'scale(0.9) translateY(-10px)';
              newEl.style.transition = 'none';
              requestAnimationFrame(() => {
                newEl.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                newEl.style.opacity = '1';
                newEl.style.transform = 'scale(1) translateY(0)';
                setTimeout(() => {
                  newEl.style.transition = '';
                  newEl.style.transform = '';
                }, 300);
              });
            }
          });
        }
      });

      // 4. Find new elements and apply FLIP animation
      const newElements = Array.from(document.querySelectorAll('.task-card:not(.inline-new-task)'));
      newElements.forEach(newEl => {
        const id = newEl.dataset.id;
        if (initialRects.has(id)) {
          const oldRect = initialRects.get(id);
          const newRect = newEl.getBoundingClientRect();
          
          const deltaY = oldRect.top - newRect.top;
          const deltaX = oldRect.left - newRect.left;
          
          // If the task moved, animate it from its old position
          if (deltaY !== 0 || deltaX !== 0) {
            newEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            newEl.style.transition = 'none';
            
            // Force reflow and start animation
            requestAnimationFrame(() => {
              newEl.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
              newEl.style.transform = 'translate(0, 0)';
              
              // Clean up inline styles after animation
              setTimeout(() => {
                newEl.style.transition = '';
                newEl.style.transform = '';
              }, 300);
            });
          }
        }
      });
    }, 200);
  };

  div.appendChild(editBtn);
  div.appendChild(deleteBtn);

  // Drag Events
  div.addEventListener('dragstart', () => {
    draggedTask = div;
    setTimeout(() => div.classList.add('dragging'), 0);
  });

  div.addEventListener('dragend', () => {
    div.classList.remove('dragging');
    draggedTask = null;
  });

  return div;
}

function startEditTask(div, task, columnId) {
  if (div.classList.contains('editing')) return;
  div.classList.add('editing');
  div.draggable = false;

  const currentText = task.text;

  // Clear the card and build edit UI
  div.textContent = '';
  div.style.padding = '8px';
  div.style.cursor = 'default';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.gap = '6px';

  const textarea = document.createElement('textarea');
  textarea.className = 'inline-edit-input';
  textarea.value = currentText;
  textarea.maxLength = 600;
  textarea.style.cssText = 'width:100%; font-size:14px; padding:0; background:transparent; border:none; outline:none; color:var(--text-main); resize:none; overflow:hidden; min-height:20px; transition: height 0.15s ease;';

  // Set initial height
  textarea.style.height = '20px';
  requestAnimationFrame(() => {
    textarea.style.height = textarea.scrollHeight + 'px';
  });

  // Auto-resize
  textarea.addEventListener('input', function() {
    this.style.height = '20px';
    this.style.height = this.scrollHeight + 'px';
  });

  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = 'display:flex; flex-direction:column; gap:4px;';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'icon-btn';
  saveBtn.style.cssText = 'color:var(--primary-color);';
  saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'icon-btn';
  cancelBtn.style.cssText = 'color:var(--text-muted);';
  cancelBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  actionsDiv.appendChild(saveBtn);
  actionsDiv.appendChild(cancelBtn);
  div.appendChild(textarea);
  div.appendChild(actionsDiv);

  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  let finished = false;
  const saveEdit = () => {
    if (finished) return;
    finished = true;
    const newText = textarea.value.trim();
    if (newText && newText !== currentText) {
      store.editTask(columnId, task.id, newText);
    }
    renderActiveBoard();
  };

  const cancelEdit = () => {
    if (finished) return;
    finished = true;
    renderActiveBoard();
  };

  saveBtn.addEventListener('click', (e) => { e.stopPropagation(); saveEdit(); });
  cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); cancelEdit(); });

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      cancelEdit();
    }
  });
}

// --- DRAG AND DROP ---

function handleDragOver(e) {
  e.preventDefault();
  const taskList = e.currentTarget;
  taskList.style.background = 'rgba(255, 255, 255, 0.05)';

  const afterElement = getDragAfterElement(taskList, e.clientY);
  const draggable = document.querySelector('.dragging');
  if (draggable) {
    if (afterElement == null) {
      if (taskList.lastElementChild !== draggable) {
        taskList.appendChild(draggable);
      }
    } else {
      if (draggable.nextElementSibling !== afterElement) {
        taskList.insertBefore(draggable, afterElement);
      }
    }
  }
}

function handleDragLeave(e) {
  e.currentTarget.style.background = '';
}

function handleDrop(e) {
  e.preventDefault();
  const taskList = e.currentTarget;
  taskList.style.background = '';

  if (!draggedTask) return;

  const sourceColId = draggedTask.dataset.columnId;
  const targetColId = taskList.dataset.columnId;
  const taskId = draggedTask.dataset.id;

  // Find index in target col
  const children = [...taskList.querySelectorAll('.task-card')];
  const targetIndex = children.indexOf(draggedTask);

  if (sourceColId !== targetColId || targetIndex !== -1) {
    store.moveTask(sourceColId, targetColId, taskId, targetIndex);
    // Render to sync IDs and state properly
    renderActiveBoard();
  }
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function getDragAfterColumn(container, x) {
  const draggableElements = [...container.querySelectorAll('.column:not(.dragging):not(.drop-placeholder)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// --- MODALS AND ACTIONS ---

function openModal(title, action, context = null) {
  modalTitle.textContent = title;
  modalAction = action;
  currentActionContext = context;
  modalInput.value = '';
  modalInput.maxLength = action === 'task' ? 600 : 30;
  modalOverlay.classList.remove('hidden');
  modalInput.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalAction = null;
  currentActionContext = null;
}

function handleSaveModal() {
  const value = modalInput.value.trim();
  if (!value) return;

  if (modalAction === 'board') {
    store.addBoard(value, currentActionContext);
    renderBoards();
    renderActiveBoard();
  } else if (modalAction === 'folder') {
    store.addFolder(value);
    renderBoards();
  } else if (modalAction === 'column') {
    store.addColumn(value);
    renderActiveBoard();
  } else if (modalAction === 'task') {
    store.addTask(currentActionContext, value);
    renderActiveBoard();
  }

  closeModal();
}

// Event Listeners
if (addBoardBtn) addBoardBtn.onclick = () => createInlineBoard(null);
if (addFolderBtn) addFolderBtn.onclick = () => createInlineFolder();
if (addColumnBtn) addColumnBtn.onclick = () => createInlineColumn();

// --- STATS VIEW LOGIC ---
let statsOpen = false;

const CHART_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f43f5e', '#84cc16', '#6366f1', '#14b8a6'
];

function buildStatsView(board) {
  const totalTasks = board.columns.reduce((sum, col) => sum + col.tasks.length, 0);

  // Build donut chart data
  const segments = board.columns.map((col, i) => ({
    name: col.name,
    count: col.tasks.length,
    color: CHART_COLORS[i % CHART_COLORS.length],
    percent: totalTasks > 0 ? (col.tasks.length / totalTasks) * 100 : 0
  }));

  // SVG donut chart
  const radius = 80;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  let segmentsSVG = '';
  if (totalTasks === 0) {
    segmentsSVG = `<circle cx="100" cy="100" r="${radius}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${strokeWidth}" />`;
  } else {
    segments.forEach((seg, i) => {
      const dashLen = (seg.percent / 100) * circumference;
      const dashGap = circumference - dashLen;
      segmentsSVG += `<circle
        cx="100" cy="100" r="${radius}"
        fill="none"
        stroke="${seg.color}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${dashLen} ${dashGap}"
        stroke-dashoffset="${-currentOffset}"
        stroke-linecap="round"
        class="donut-segment-visual"
        data-index="${i}"
        style="animation: donutGrow 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.08}s both; pointer-events: none;"
      />`;
      currentOffset += dashLen;
    });
  }

  // Legend items
  const legendHTML = segments.map((seg, i) => `
    <div class="stats-legend-item" data-index="${i}" data-name="${seg.name}" data-count="${seg.count}" data-color="${seg.color}">
      <span class="stats-legend-dot" style="background: ${seg.color};"></span>
      <span class="stats-legend-name">${seg.name}</span>
      <span class="stats-legend-count">${seg.count}</span>
    </div>
  `).join('');

  const statsView = document.createElement('div');
  statsView.className = 'board-stats-view';
  statsView.innerHTML = `
    <div class="stats-chart-wrapper">
      <svg viewBox="0 0 200 200" class="donut-chart">
        ${segmentsSVG}
      </svg>
      <div class="donut-center-label">
        <span class="donut-total-number">${totalTasks}</span>
        <span class="donut-total-text">${totalTasks === 1 ? 'Task' : 'Tasks'}</span>
      </div>
      <div class="donut-tooltip">
        <span class="donut-tooltip-dot"></span>
        <span class="donut-tooltip-name"></span>
        <span class="donut-tooltip-count"></span>
      </div>
    </div>
    <div class="stats-legend">
      <h3 class="stats-legend-title">Categories</h3>
      ${legendHTML || '<p class="stats-legend-empty">No categories yet.</p>'}
    </div>
  `;

  // Wire up hover tooltips
  const chartWrapper = statsView.querySelector('.stats-chart-wrapper');
  const tooltip = statsView.querySelector('.donut-tooltip');
  const tooltipDot = tooltip.querySelector('.donut-tooltip-dot');
  const tooltipName = tooltip.querySelector('.donut-tooltip-name');
  const tooltipCount = tooltip.querySelector('.donut-tooltip-count');
  const visuals = statsView.querySelectorAll('.donut-segment-visual');

  function highlightSegment(index) {
    const seg = segments[index];
    if (!seg) return;
    tooltipDot.style.background = seg.color;
    tooltipName.textContent = seg.name;
    tooltipCount.textContent = seg.count + ' tasks';
    tooltip.classList.add('visible');
    visuals.forEach(v => {
      v.style.opacity = v.getAttribute('data-index') === String(index) ? '1' : '0.25';
    });
  }

  function resetSegments() {
    tooltip.classList.remove('visible');
    visuals.forEach(v => { v.style.opacity = '1'; });
  }

  // Angle-based hover detection on the chart wrapper
  function getSegmentAtAngle(e) {
    const rect = chartWrapper.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const outerR = rect.width / 2;
    const innerR = outerR * 0.55;

    // Check if mouse is within the donut ring area
    if (dist < innerR || dist > outerR) return -1;

    // Calculate angle from top (12 o'clock), clockwise
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    // Find which segment this angle belongs to
    let cumulative = 0;
    for (let i = 0; i < segments.length; i++) {
      cumulative += segments[i].percent * 3.6; // percent to degrees
      if (angle < cumulative) return i;
    }
    return segments.length - 1;
  }

  let activeIndex = -1;
  chartWrapper.addEventListener('mousemove', (e) => {
    if (totalTasks === 0) return;
    const idx = getSegmentAtAngle(e);
    if (idx >= 0) {
      if (idx !== activeIndex) {
        activeIndex = idx;
        highlightSegment(idx);
      }
      const rect = chartWrapper.getBoundingClientRect();
      tooltip.style.left = (e.clientX - rect.left + 14) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 24) + 'px';
      chartWrapper.style.cursor = 'pointer';
    } else {
      if (activeIndex !== -1) {
        activeIndex = -1;
        resetSegments();
      }
      chartWrapper.style.cursor = '';
    }
  });

  chartWrapper.addEventListener('mouseleave', () => {
    activeIndex = -1;
    resetSegments();
    chartWrapper.style.cursor = '';
  });

  // Legend item hover
  statsView.querySelectorAll('.stats-legend-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      const idx = parseInt(item.getAttribute('data-index'));
      highlightSegment(idx);
      tooltip.style.left = '50%';
      tooltip.style.top = '-10px';
    });
    item.addEventListener('mouseleave', resetSegments);
  });

  return statsView;
}

if (statsBtn) {
  statsBtn.onclick = () => {
    const board = store.getActiveBoard();
    if (!board) return;

    if (statsOpen) {
      statsOpen = false;
      statsBtn.classList.remove('settings-active');
      renderActiveBoard(true);
    } else {
      statsOpen = true;
      statsBtn.classList.add('settings-active');
      columnsContainer.innerHTML = '';

      const emptyState = boardView.querySelector('.board-empty-state');
      if (emptyState) emptyState.remove();
      const existingStats = boardView.querySelector('.board-stats-view');
      if (existingStats) existingStats.remove();

      boardView.appendChild(buildStatsView(board));
    }
  };
}

// --- HOME VIEW LOGIC ---
if (homeNavBtn) {
  homeNavBtn.onclick = () => {
    store.setActiveBoard(null);
    renderBoards();
    renderActiveBoard();
  };
}

// --- SETTINGS VIEW LOGIC ---
if (settingsBtn) {
  settingsBtn.onclick = () => {
    const isCurrentlyOpen = !settingsView.classList.contains('hidden');
    
    if (isCurrentlyOpen) {
      // Close settings
      settingsView.classList.add('hidden');
      settingsBtn.classList.remove('settings-active');
      renderActiveBoard();
    } else {
      // Open settings
      if (boardView) boardView.classList.add('hidden');
      if (homeView) homeView.classList.add('hidden');
      if (homeNavBtn) homeNavBtn.classList.remove('active');
      
      store.setActiveBoard(null);
      renderBoards();
      
      settingsView.classList.remove('hidden');
      settingsBtn.classList.add('settings-active');
      
      boardTitleDisplay.classList.remove('hidden');
      boardTitleEdit.classList.add('hidden');
      activeBoardTitle.textContent = 'Settings';
      editBoardTitleBtn.classList.add('hidden');
      if (addColumnBtn) addColumnBtn.classList.add('hidden');
      if (statsBtn) statsBtn.classList.add('hidden');
    }
  };
}

// Settings Password Logic
const settingsNewPasswordInput = document.getElementById('settings-new-password');
const settingsPasswordError = document.getElementById('settings-password-error');
const btnChangePassword = document.getElementById('btn-change-password');

if (settingsNewPasswordInput) {
  settingsNewPasswordInput.addEventListener('input', () => {
    validateInput(settingsNewPasswordInput, settingsPasswordError, /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+={}\[\]:;"'<>,.?/\\|~`\-]).{8,}$/);
  });
}

if (btnChangePassword) {
  btnChangePassword.onclick = async () => {
    const currentPassword = document.getElementById('settings-current-password').value;
    const newPassword = settingsNewPasswordInput.value;
    
    if (!currentPassword || !newPassword) {
      return notify('Please fill in all password fields', 'warning');
    }
    
    const isNewPasswordValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+={}\[\]:;"'<>,.?/\\|~`\-]).{8,}$/.test(newPassword);
    if (!isNewPasswordValid) {
      return notify('New password does not meet the requirements', 'error');
    }
    
    btnChangePassword.textContent = 'Updating...';
    try {
      await window.api.changePassword(currentPassword, newPassword);
      notify('Password updated successfully', 'success');
      document.getElementById('settings-current-password').value = '';
      settingsNewPasswordInput.value = '';
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      btnChangePassword.textContent = 'Update Password';
    }
  };
}

// Custom Theme Dropdown Logic
const themeDropdown = document.getElementById('theme-dropdown');
const themeSelected = document.getElementById('theme-selected');
const themeOptions = document.getElementById('theme-options');

if (themeDropdown && themeSelected && themeOptions) {
  themeSelected.onclick = (e) => {
    e.stopPropagation();
    themeDropdown.classList.toggle('open');
  };

  const options = themeOptions.querySelectorAll('.dropdown-option');
  options.forEach(option => {
    option.onclick = () => {
      // Update active class
      options.forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      
      // Update selected text
      themeSelected.querySelector('span').textContent = option.textContent;
      
      // Close dropdown
      themeDropdown.classList.remove('open');
      
      // (Optional) Here you would apply the actual theme change
      // console.log('Theme changed to:', option.dataset.value);
    };
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!themeDropdown.contains(e.target)) {
      themeDropdown.classList.remove('open');
    }
  });
}

// Custom Startup Location Dropdown Logic
const startupDropdown = document.getElementById('startup-dropdown');
const startupSelected = document.getElementById('startup-selected');
const startupOptionsEl = document.getElementById('startup-options');

if (startupDropdown && startupSelected && startupOptionsEl) {
  // Load saved preference
  const savedStartup = localStorage.getItem('sydex-startup-location') || 'home';
  const startupOpts = startupOptionsEl.querySelectorAll('.dropdown-option');
  startupOpts.forEach(o => {
    o.classList.toggle('active', o.dataset.value === savedStartup);
    if (o.dataset.value === savedStartup) {
      startupSelected.querySelector('span').textContent = o.textContent;
    }
  });

  startupSelected.onclick = (e) => {
    e.stopPropagation();
    startupDropdown.classList.toggle('open');
  };

  startupOpts.forEach(option => {
    option.onclick = () => {
      startupOpts.forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      startupSelected.querySelector('span').textContent = option.textContent;
      startupDropdown.classList.remove('open');
      localStorage.setItem('sydex-startup-location', option.dataset.value);
      notify('Startup location updated', 'success', 2000);
    };
  });

  document.addEventListener('click', (e) => {
    if (!startupDropdown.contains(e.target)) {
      startupDropdown.classList.remove('open');
    }
  });
}

// Hardware Acceleration Toggle Logic
const hwAccelToggle = document.getElementById('settings-hardware-accel');
if (hwAccelToggle) {
  if (window.electronAPI && window.electronAPI.getSettings) {
    // Load initial state safely
    window.electronAPI.getSettings()
      .then(settings => {
        hwAccelToggle.checked = settings.hardwareAcceleration !== false; // true by default
      })
      .catch(err => console.warn('Failed to load settings:', err));

    hwAccelToggle.addEventListener('change', async (e) => {
      const isEnabled = e.target.checked;
      try {
        await window.electronAPI.saveSettings({ hardwareAcceleration: isEnabled });
        openConfirmModal(
          'Restart Required',
          'Hardware acceleration settings have changed. The application needs to restart to apply these rendering changes.',
          () => window.electronAPI.relaunchApp(),
          null, null,
          'Restart Now',
          'Restart Later'
        );
      } catch (err) {
        console.error('Failed to save hardware acceleration settings:', err);
      }
    });
  } else {
    // Fallback if preload script hasn't updated yet (requires full app restart first)
    hwAccelToggle.addEventListener('change', (e) => {
      e.preventDefault();
      // Revert the toggle visually
      hwAccelToggle.checked = !e.target.checked;
      openConfirmModal(
        'Update Required',
        'Hardware acceleration module was just installed. You must restart the app completely (close and reopen) to use this feature for the first time.',
        () => {
          if (window.electronAPI && window.electronAPI.relaunchApp) {
            window.electronAPI.relaunchApp();
          } else {
            notify('Please close and reopen the app manually.', 'warning', 5000);
          }
        },
        null, null,
        'Got it',
        'Cancel'
      );
    });
  }
}

// Permissions Toggle Logic
const permEmailsToggle = document.getElementById('settings-perm-emails');
const permTelemetryToggle = document.getElementById('settings-perm-telemetry');

async function loadPermissions() {
  if (!window.api.token) return;
  try {
    const perms = await window.api.getPermissions();
    if (permEmailsToggle) permEmailsToggle.checked = perms.permEmails === 1;
    if (permTelemetryToggle) permTelemetryToggle.checked = perms.permTelemetry === 1;
  } catch (err) {
    console.warn('Failed to load permissions:', err);
  }
}

if (permEmailsToggle) {
  permEmailsToggle.addEventListener('change', async (e) => {
    try {
      await window.api.updatePermissions({ permEmails: e.target.checked ? 1 : 0 });
      notify(e.target.checked ? 'Commercial emails enabled' : 'Commercial emails disabled', 'success');
    } catch (err) {
      e.target.checked = !e.target.checked;
      notify('Failed to update preference', 'error');
    }
  });
}

if (permTelemetryToggle) {
  permTelemetryToggle.addEventListener('change', async (e) => {
    try {
      await window.api.updatePermissions({ permTelemetry: e.target.checked ? 1 : 0 });
      notify(e.target.checked ? 'Telemetry enabled' : 'Telemetry disabled', 'success');
    } catch (err) {
      e.target.checked = !e.target.checked;
      notify('Failed to update preference', 'error');
    }
  });
}

function createInlineColumn() {
  const existing = columnsContainer.querySelector('.inline-new-column');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.className = 'column inline-new-column';
  div.style.padding = '15px';
  div.style.animation = 'inlineSlideIn 0.2s ease-out';
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.gap = '10px';
  div.style.height = 'max-content';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-edit-input';
  input.placeholder = 'Category name...';
  input.maxLength = 30;
  input.style.cssText = 'width:100%; font-size:15px; font-weight:500; padding:4px 0; background:transparent; border:none; border-bottom:2px solid var(--primary-color); outline:none; color:var(--text-main);';

  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = 'display:flex; gap:8px; align-items:center; margin-top:5px;';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'primary-btn';
  saveBtn.style.padding = '6px 12px';
  saveBtn.textContent = 'Add Category';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'icon-btn';
  cancelBtn.style.color = 'var(--text-muted)';
  cancelBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  actionsDiv.appendChild(saveBtn);
  actionsDiv.appendChild(cancelBtn);

  div.appendChild(input);
  div.appendChild(actionsDiv);
  
  columnsContainer.appendChild(div);
  
  // Scroll to the right
  const boardView = document.getElementById('board-view');
  boardView.scrollLeft = boardView.scrollWidth;
  
  input.focus();

  let saved = false;
  const saveInlineCol = () => {
    if (saved) return;
    saved = true;
    const text = input.value.trim();
    if (text) {
      div.style.transition = 'all 0.2s ease';
      div.style.opacity = '0';
      div.style.transform = 'scale(0.95)';
      setTimeout(() => {
        div.remove();
        store.addColumn(text);
        
        // Animate empty state out before re-rendering
        const emptyState = boardView.querySelector('.board-empty-state');
        if (emptyState) {
          // Must clear the CSS animation first (forwards fill-mode overrides inline styles)
          emptyState.style.animation = 'none';
          emptyState.style.opacity = '1';
          void emptyState.offsetWidth; // Force reflow
          emptyState.style.transition = 'all 0.3s ease-in';
          emptyState.style.opacity = '0';
          emptyState.style.transform = 'translate(-50%, -50%) scale(0.9)';
          setTimeout(() => {
            emptyState.remove();
            renderActiveBoard();
          }, 300);
        } else {
          renderActiveBoard();
        }
      }, 180);
    } else {
      cancelInline();
    }
  };

  const cancelInline = () => {
    saved = true;
    div.style.animation = 'inlineFadeOut 0.15s ease forwards';
    setTimeout(() => {
      div.remove();
      if (window._pendingSync) {
        window._pendingSync = false;
        renderBoards();
        renderActiveBoard();
      }
    }, 150);
  };

  saveBtn.onclick = (e) => { e.stopPropagation(); saveInlineCol(); };
  cancelBtn.onclick = (e) => { e.stopPropagation(); cancelInline(); };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { 
      e.preventDefault(); 
      saveInlineCol(); 
    }
    if (e.key === 'Escape') cancelInline();
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!saved) saveInlineCol();
    }, 150);
  });
}

function createInlineBoard(folderId) {
  const existing = boardList.querySelector('.inline-new-board');
  if (existing) existing.remove();

  const li = document.createElement('li');
  li.className = 'board-item inline-new-board';
  if (folderId) {
    li.style.marginLeft = '15px';
    li.style.width = 'auto';
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex; align-items:center; gap:8px; width:100%;';

  const dot = document.createElement('div');
  dot.style.cssText = 'width:6px; height:6px; border-radius:50%; background:var(--primary-color); flex-shrink:0;';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-edit-input';
  input.placeholder = 'Board name...';
  input.maxLength = 20;
  input.style.cssText = 'width:100%; font-size:14px; padding:0; background:transparent; border-bottom:1px solid var(--primary-color) !important;';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'icon-btn';
  saveBtn.style.cssText = 'flex-shrink:0; color:var(--primary-color);';
  saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'icon-btn';
  cancelBtn.style.cssText = 'flex-shrink:0; color:var(--text-muted);';
  cancelBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  wrapper.appendChild(dot);
  wrapper.appendChild(input);
  wrapper.appendChild(saveBtn);
  wrapper.appendChild(cancelBtn);
  li.appendChild(wrapper);

  // Insert at top or after folder's last board
  if (folderId) {
    const targetFolder = boardList.querySelector(`.folder-item[data-folder-id="${folderId}"]`);
    if (targetFolder) {
      const nestedList = targetFolder.querySelector('.folder-boards-list');
      if (nestedList) {
        nestedList.appendChild(li);
      } else {
        boardList.appendChild(li); // Fallback
      }
    } else {
      boardList.appendChild(li); // Fallback
    }
  } else {
    boardList.insertBefore(li, boardList.firstChild);
  }

  input.focus();

  let saved = false;
  const saveInlineBoard = () => {
    if (saved) return;
    saved = true;
    const name = input.value.trim();
    if (name) {
      // Animate out first, then create
      li.style.transition = 'all 0.2s ease';
      li.style.opacity = '0';
      li.style.transform = 'scale(0.95)';
      setTimeout(() => {
        li.remove();
        const newBoard = store.addBoard(name, folderId);
        renderBoards();
        renderActiveBoard();
        // Find and animate the new board item
        const newItem = boardList.querySelector('.board-item.active');
        if (newItem) {
          newItem.classList.add('board-just-created');
          setTimeout(() => newItem.classList.remove('board-just-created'), 500);
        }
      }, 180);
    } else {
      li.style.animation = 'inlineFadeOut 0.15s ease forwards';
      setTimeout(() => li.remove(), 150);
    }
  };

  const cancelInline = () => {
    saved = true;
    li.style.animation = 'inlineFadeOut 0.15s ease forwards';
    setTimeout(() => li.remove(), 150);
  };

  saveBtn.onclick = (e) => { e.stopPropagation(); saveInlineBoard(); };
  cancelBtn.onclick = (e) => { e.stopPropagation(); cancelInline(); };

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveInlineBoard(); }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cancelInline();
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!saved) saveInlineBoard();
    }, 150);
  });
}

function createInlineFolder() {
  const existing = boardList.querySelector('.inline-new-folder');
  if (existing) existing.remove();

  const li = document.createElement('li');
  li.className = 'folder-item inline-new-folder';
  li.style.padding = '8px 15px';
  li.style.animation = 'inlineSlideIn 0.2s ease-out';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex; align-items:center; gap:8px; width:100%;';

  const icon = document.createElement('div');
  icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
  icon.style.cssText = 'flex-shrink:0; display:flex;';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-edit-input';
  input.placeholder = 'Folder name...';
  input.maxLength = 20;
  input.style.cssText = 'width:100%; font-size:13px; padding:0; background:transparent; font-weight:600; border-bottom:1px solid var(--primary-color) !important;';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'icon-btn';
  saveBtn.style.cssText = 'flex-shrink:0; color:var(--primary-color);';
  saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'icon-btn';
  cancelBtn.style.cssText = 'flex-shrink:0; color:var(--text-muted);';
  cancelBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  wrapper.appendChild(icon);
  wrapper.appendChild(input);
  wrapper.appendChild(saveBtn);
  wrapper.appendChild(cancelBtn);
  li.appendChild(wrapper);

  boardList.insertBefore(li, boardList.firstChild);
  input.focus();

  let saved = false;
  const saveInlineFolder = () => {
    if (saved) return;
    saved = true;
    const name = input.value.trim();
    if (name) {
      li.style.transition = 'all 0.2s ease';
      li.style.opacity = '0';
      li.style.transform = 'scale(0.95)';
      setTimeout(() => {
        li.remove();
        store.addFolder(name);
        renderBoards();
      }, 180);
    } else {
      li.style.animation = 'inlineFadeOut 0.15s ease forwards';
      setTimeout(() => li.remove(), 150);
    }
  };

  const cancelInline = () => {
    saved = true;
    li.style.animation = 'inlineFadeOut 0.15s ease forwards';
    setTimeout(() => li.remove(), 150);
  };

  saveBtn.onclick = (e) => { e.stopPropagation(); saveInlineFolder(); };
  cancelBtn.onclick = (e) => { e.stopPropagation(); cancelInline(); };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveInlineFolder();
    if (e.key === 'Escape') cancelInline();
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!saved) saveInlineFolder();
    }, 150);
  });
}

function createInlineJoinBoard() {
  const existing = boardList.querySelector('.inline-join-board');
  if (existing) existing.remove();

  const li = document.createElement('li');
  li.className = 'board-item inline-join-board';
  li.style.padding = '8px 15px';
  li.style.animation = 'inlineSlideIn 0.2s ease-out';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex; align-items:center; gap:8px; width:100%;';

  const icon = document.createElement('div');
  icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>';
  icon.style.cssText = 'flex-shrink:0; display:flex;';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-edit-input';
  input.placeholder = 'Invite Code...';
  input.maxLength = 10;
  input.style.cssText = 'width:100%; font-size:13px; padding:0; background:transparent; font-weight:600; border-bottom:1px solid var(--primary-color) !important;';

  const joinBtn = document.createElement('button');
  joinBtn.className = 'icon-btn tooltip-btn';
  joinBtn.dataset.tooltip = 'Join';
  joinBtn.style.cssText = 'flex-shrink:0; color:var(--primary-color);';
  joinBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'icon-btn tooltip-btn';
  cancelBtn.dataset.tooltip = 'Cancel';
  cancelBtn.style.cssText = 'flex-shrink:0; color:var(--text-muted);';
  cancelBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  wrapper.appendChild(icon);
  wrapper.appendChild(input);
  wrapper.appendChild(joinBtn);
  wrapper.appendChild(cancelBtn);
  li.appendChild(wrapper);

  boardList.insertBefore(li, boardList.firstChild);
  input.focus();

  let processing = false;
  const submitJoin = () => {
    if (processing) return;
    processing = true;
    const code = input.value.trim();
    if (code) {
      input.disabled = true;
      icon.innerHTML = '<div class="spinner" style="width:14px; height:14px; border:2px solid var(--primary-color); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></div>';
      
      window.api.joinBoard(code).then(res => {
        notify('Successfully joined board!', 'success');
        return store.load();
      }).then(() => {
        li.remove();
        renderBoards();
        renderActiveBoard();
      }).catch(err => {
        notify(err.message || 'Failed to join board', 'error');
        input.disabled = false;
        processing = false;
        icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>';
        input.focus();
      });
    } else {
      li.style.animation = 'inlineFadeOut 0.15s ease forwards';
      setTimeout(() => li.remove(), 150);
    }
  };

  const cancelInline = () => {
    processing = true;
    li.style.animation = 'inlineFadeOut 0.15s ease forwards';
    setTimeout(() => li.remove(), 150);
  };

  joinBtn.onclick = (e) => { e.stopPropagation(); submitJoin(); };
  cancelBtn.onclick = (e) => { e.stopPropagation(); cancelInline(); };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitJoin();
    if (e.key === 'Escape') cancelInline();
  });
}

function createInlineTask(columnId, taskList) {
  // Remove existing if any
  const existing = taskList.querySelector('.inline-new-task');
  if (existing) existing.remove();
  
  // Remove empty state message if it exists
  const emptyMsg = taskList.querySelector('.empty-column-msg');
  if (emptyMsg) emptyMsg.style.display = 'none';

  const div = document.createElement('div');
  div.className = 'task-card inline-new-task';
  div.style.padding = '8px';
  div.style.animation = 'inlineSlideIn 0.2s ease-out';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.gap = '6px';

  const input = document.createElement('textarea');
  input.className = 'inline-edit-input';
  input.placeholder = 'Task description...';
  input.maxLength = 600;
  input.style.cssText = 'width:100%; font-size:14px; padding:0; background:transparent; border:none; outline:none; color:var(--text-main); resize:none; overflow:hidden; min-height:20px; height:20px; transition: height 0.15s ease;';
  
  // Auto-resize textarea with animation
  input.addEventListener('input', function() {
    const currentHeight = this.style.height;
    this.style.transition = 'none';
    this.style.height = '20px';
    const newHeight = this.scrollHeight + 'px';
    this.style.height = currentHeight;
    this.offsetHeight; // Force reflow
    this.style.transition = 'height 0.15s ease';
    this.style.height = newHeight;
  });

  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = 'display:flex; flex-direction:column; gap:4px;';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'icon-btn';
  saveBtn.style.cssText = 'color:var(--primary-color);';
  saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'icon-btn';
  cancelBtn.style.cssText = 'color:var(--text-muted);';
  cancelBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  actionsDiv.appendChild(saveBtn);
  actionsDiv.appendChild(cancelBtn);

  div.appendChild(input);
  div.appendChild(actionsDiv);
  taskList.prepend(div);
  
  // Scroll to top
  taskList.scrollTop = 0;
  
  input.focus();

  let saved = false;
  const saveInlineTask = () => {
    if (saved) return;
    saved = true;
    const text = input.value.trim();
    if (text) {
      div.style.transition = 'all 0.2s ease';
      div.style.opacity = '0';
      div.style.transform = 'scale(0.95)';
      setTimeout(() => {
        div.remove();
        store.addTask(columnId, text);
        renderActiveBoard();
      }, 180);
    } else {
      cancelInline();
    }
  };

  const cancelInline = () => {
    saved = true;
    div.style.animation = 'inlineFadeOut 0.15s ease forwards';
    setTimeout(() => {
      div.remove();
      if (emptyMsg && taskList.querySelectorAll('.task-card').length === 0) {
        emptyMsg.style.display = '';
      }
      // Apply deferred sync if pending
      if (window._pendingSync) {
        window._pendingSync = false;
        renderBoards();
        renderActiveBoard();
      }
    }, 150);
  };

  saveBtn.onclick = (e) => { e.stopPropagation(); saveInlineTask(); };
  cancelBtn.onclick = (e) => { e.stopPropagation(); cancelInline(); };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      saveInlineTask(); 
    }
    if (e.key === 'Escape') cancelInline();
  });
}

editBoardTitleBtn.onclick = () => {
  const board = store.getActiveBoard();
  if (board) {
    boardTitleDisplay.classList.add('hidden');
    boardTitleEdit.classList.remove('hidden');
    boardTitleInput.value = board.name;
    boardTitleInput.focus();
  }
};

activeBoardTitle.onclick = editBoardTitleBtn.onclick;
activeBoardTitle.style.cursor = 'text';

saveBoardTitleBtn.onclick = () => {
  const board = store.getActiveBoard();
  const newName = boardTitleInput.value.trim();
  if (board && newName) {
    store.updateBoardName(board.id, newName);
    renderBoards();
    renderActiveBoard();
  }
};

cancelBoardTitleBtn.onclick = () => {
  boardTitleDisplay.classList.remove('hidden');
  boardTitleEdit.classList.add('hidden');
};

boardTitleInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveBoardTitleBtn.onclick();
});

boardTitleInput.addEventListener('blur', () => {
  setTimeout(() => {
    if (!boardTitleEdit.classList.contains('hidden')) {
      saveBoardTitleBtn.onclick();
    }
  }, 150);
});

const confirmAltYesBtn = document.getElementById('confirm-alt-yes-btn');

let confirmActionCallback = null;
let confirmAltActionCallback = null;

function openConfirmModal(title, message, callback, altText = null, altCallback = null, confirmText = 'Delete', cancelText = 'Cancel') {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmActionCallback = callback;
  confirmYesBtn.textContent = confirmText;
  confirmCancelBtn.textContent = cancelText;

  if (altText && altCallback) {
    confirmAltYesBtn.textContent = altText;
    confirmAltYesBtn.classList.remove('hidden');
    confirmAltActionCallback = altCallback;
  } else {
    confirmAltYesBtn.classList.add('hidden');
    confirmAltActionCallback = null;
  }

  confirmOverlay.classList.remove('hidden');
}

function closeConfirmModal() {
  confirmOverlay.classList.add('hidden');
  confirmActionCallback = null;
  confirmAltActionCallback = null;
}

confirmCancelBtn.onclick = closeConfirmModal;
confirmYesBtn.onclick = () => {
  if (confirmActionCallback) confirmActionCallback();
  closeConfirmModal();
};
confirmAltYesBtn.onclick = () => {
  if (confirmAltActionCallback) confirmAltActionCallback();
  closeConfirmModal();
};

modalCancelBtn.onclick = closeModal;
modalSaveBtn.onclick = handleSaveModal;

modalInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSaveModal();
});

// Sidebar resizing logic removed as sidebar is now fixed width

// --- PROFILE MENU ---
const profileMenuBtn = document.getElementById('profile-menu-btn');
const profilePopup = document.getElementById('profile-popup');

profileMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  profilePopup.classList.toggle('hidden');
  const extrasMenu = document.getElementById('extras-menu');
  if (extrasMenu && !extrasMenu.classList.contains('hidden')) {
    extrasMenu.classList.add('hidden');
  }
  const bgPickerPopup = document.getElementById('bg-picker-popup');
  if (bgPickerPopup && !bgPickerPopup.classList.contains('hidden')) {
    bgPickerPopup.classList.add('hidden');
  }
});

document.addEventListener('click', () => {
  profilePopup.classList.add('hidden');
});

profilePopup.addEventListener('click', (e) => {
  e.stopPropagation();
  profilePopup.classList.add('hidden');
});

// --- EXTRAS MENU & BACKGROUND PICKER ---
const extrasBtn = document.getElementById('extras-btn');
const extrasMenu = document.getElementById('extras-menu');
const showBgPickerBtn = document.getElementById('show-bg-picker-btn');
const bgPickerPopup = document.getElementById('bg-picker-popup');

if (extrasBtn && extrasMenu && bgPickerPopup) {
  const bgOptions = bgPickerPopup.querySelectorAll('.bg-option');
  const extrasAddCollabBtn = document.getElementById('extras-add-collab-btn');

  const updateActiveBgUI = (bg) => {
    bgOptions.forEach(btn => {
      if (btn.dataset.bg === bg) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  };

  extrasBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    extrasMenu.classList.toggle('hidden');
    bgPickerPopup.classList.add('hidden');
    
    const activeBoard = store.getActiveBoard();
    const extrasBannedBtn = document.getElementById('extras-banned-btn');

    if (extrasAddCollabBtn) {
      if (activeBoard && !activeBoard.isShared) {
        extrasAddCollabBtn.style.display = 'flex';
        extrasAddCollabBtn.previousElementSibling.style.display = 'block';
      } else {
        extrasAddCollabBtn.style.display = 'none';
        extrasAddCollabBtn.previousElementSibling.style.display = 'none';
      }
    }

    // Show Banned Users button only for owned boards that have bans
    if (extrasBannedBtn) {
      extrasBannedBtn.style.display = 'none';
      if (activeBoard && !activeBoard.isShared) {
        try {
          const data = await window.api.getBannedUsers(activeBoard.id);
          if (data.bannedUsers && data.bannedUsers.length > 0) {
            extrasBannedBtn.style.display = 'flex';
          }
        } catch (e) { /* ignore */ }
      }
    }

    if (!profilePopup.classList.contains('hidden')) {
      profilePopup.classList.add('hidden');
    }
  });

  if (extrasAddCollabBtn) {
    extrasAddCollabBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      extrasMenu.classList.add('hidden');
      const activeBoard = store.getActiveBoard();
      if (activeBoard && !activeBoard.isShared) {
        window.openInviteModal(activeBoard.id);
      }
    });
  }

  // Banned Users button click
  const extrasBannedBtn = document.getElementById('extras-banned-btn');
  if (extrasBannedBtn) {
    extrasBannedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      extrasMenu.classList.add('hidden');
      const activeBoard = store.getActiveBoard();
      if (activeBoard && !activeBoard.isShared) {
        window.openManageCollaboratorsModal(activeBoard.id);
      }
    });
  }

  if (showBgPickerBtn) {
    showBgPickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      extrasMenu.classList.add('hidden');
      const activeBoard = store.getActiveBoard();
      if (activeBoard) {
        updateActiveBgUI(activeBoard.background || '');
      }
      bgPickerPopup.classList.remove('hidden');
    });
  }

  document.addEventListener('click', () => {
    extrasMenu.classList.add('hidden');
    bgPickerPopup.classList.add('hidden');
  });

  extrasMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  bgPickerPopup.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  bgOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      const bg = btn.dataset.bg;
      const activeBoard = store.getActiveBoard();
      if (activeBoard) {
        store.setBoardBackground(activeBoard.id, bg);
        boardView.style.background = bg;
        updateActiveBgUI(bg);
      }
    });
  });
}

// --- NOTIFICATION SYSTEM ---
const notifyContainer = document.getElementById('notify-container');

const NOTIFY_ICONS = {
  success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
};

function notify(message, type = 'info', duration = 2500, action = null) {
  const toast = document.createElement('div');
  toast.className = `notify-toast notify-${type}`;
  toast.innerHTML = `${NOTIFY_ICONS[type] || NOTIFY_ICONS.info}<span>${message}</span>`;
  
  if (action) {
    const btn = document.createElement('button');
    btn.className = 'notify-action-btn';
    btn.textContent = action.text;
    btn.onclick = (e) => {
      e.stopPropagation();
      action.onClick();
      // Instantly remove toast after action
      toast.classList.add('notify-out');
      toast.addEventListener('animationend', () => toast.remove());
    };
    toast.appendChild(btn);
  }
  
  notifyContainer.appendChild(toast);

  let timeoutId = setTimeout(() => {
    toast.classList.add('notify-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
  
  // Pause timeout on hover if it has an action
  if (action) {
    toast.addEventListener('mouseenter', () => clearTimeout(timeoutId));
    toast.addEventListener('mouseleave', () => {
      timeoutId = setTimeout(() => {
        toast.classList.add('notify-out');
        toast.addEventListener('animationend', () => toast.remove());
      }, duration);
    });
  }

  // Right-click to dismiss
  toast.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    clearTimeout(timeoutId);
    toast.classList.add('notify-out');
    toast.addEventListener('animationend', () => toast.remove());
  });
}

// Ctrl+R refresh with notification
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    sessionStorage.setItem('sydex-refreshed', '1');
    location.reload();
  }
});

// Show refresh notification after reload
if (sessionStorage.getItem('sydex-refreshed')) {
  sessionStorage.removeItem('sydex-refreshed');
  setTimeout(() => notify('Application refreshed', 'success', 2500), 300);
}

// --- AUTH UI CAROUSEL LOGIC ---
const carouselSlides = document.querySelectorAll('.carousel-slide');
let currentSlide = 0;

if (carouselSlides.length > 0) {
  setInterval(() => {
    carouselSlides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % carouselSlides.length;
    carouselSlides[currentSlide].classList.add('active');
  }, 12000);
}

// --- AUTH UI LOGIC ---

const authTabsContainer = document.querySelector('.auth-tabs-container');
const registerUsernameInput = document.getElementById('register-username');
const usernameLiveError = document.getElementById('username-live-error');
const registerEmailInput = document.getElementById('register-email');
const emailLiveError = document.getElementById('email-live-error');
const registerPasswordInput = document.getElementById('register-password');
const passwordLiveError = document.getElementById('password-live-error');

// Password toggle functionality
const togglePasswordVisibility = (btn) => {
  const input = btn.previousElementSibling.previousElementSibling; // The input is before the label, which is before the button
  const eyeOpen = btn.querySelector('.eye-open');
  const eyeClosed = btn.querySelector('.eye-closed');
  
  if (input.type === 'password') {
    input.type = 'text';
    eyeOpen.classList.add('hidden');
    eyeClosed.classList.remove('hidden');
  } else {
    input.type = 'password';
    eyeOpen.classList.remove('hidden');
    eyeClosed.classList.add('hidden');
  }
};

document.querySelectorAll('.password-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => togglePasswordVisibility(btn));
});

const validateInput = (input, errorEl, regex) => {
  const value = input.value;
  if (value === '' || regex.test(value)) {
    errorEl.classList.add('hidden');
    input.parentElement.classList.remove('has-error');
    return true;
  } else {
    errorEl.classList.remove('hidden');
    input.parentElement.classList.add('has-error');
    return false;
  }
};

if (registerUsernameInput) {
  registerUsernameInput.addEventListener('input', () => {
    validateInput(registerUsernameInput, usernameLiveError, /^[a-zA-Z0-9]{8,}$/);
  });
}

if (registerEmailInput) {
  registerEmailInput.addEventListener('input', () => {
    validateInput(registerEmailInput, emailLiveError, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
}

if (registerPasswordInput) {
  registerPasswordInput.addEventListener('input', () => {
    validateInput(registerPasswordInput, passwordLiveError, /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+={}\[\]:;"'<>,.?/\\|~`\-]).{8,}$/);
  });
}

tabLogin.onclick = () => {
  if (authTabsContainer) authTabsContainer.classList.remove('register-active');
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  formLogin.classList.remove('auth-hidden');
  formRegister.classList.add('auth-hidden');
};

tabRegister.onclick = () => {
  if (authTabsContainer) authTabsContainer.classList.add('register-active');
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  formRegister.classList.remove('auth-hidden');
  formLogin.classList.add('auth-hidden');
};

btnLogin.onclick = async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  if (!email || !password) return notify('Please fill all fields', 'warning');

  btnLogin.textContent = 'Signing In...';
  try {
    await window.api.login(email, password);
    authScreen.style.opacity = '0';
    setTimeout(() => {
      authScreen.classList.add('hidden');
      authScreen.style.opacity = '1';
    }, 500);
    await store.load();
    renderBoards();
    renderActiveBoard();
    updateSidebarProfile();
    updateHomeGreeting(true);
    notify('Logged in successfully', 'success');
    loadPermissions();
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    btnLogin.textContent = 'Sign In';
  }
};

btnRegister.onclick = async () => {
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  if (!username || !email || !password) return notify('Please fill all fields', 'warning');

  const isUsernameValid = /^[a-zA-Z0-9]{8,}$/.test(username);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+={}\[\]:;"'<>,.?/\\|~`\-]).{8,}$/.test(password);

  if (!isUsernameValid || !isEmailValid || !isPasswordValid) {
    return notify('Please fix the errors in the form before submitting', 'error');
  }

  // Check if user already exists before proceeding to setup
  btnRegister.textContent = 'Checking...';
  btnRegister.disabled = true;
  try {
    await window.api.checkUser(username, email);
    // User is available, show setup screen
    showSetupScreen({ username, email, password });
    authScreen.classList.add('hidden');
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    btnRegister.textContent = 'Sign Up';
    btnRegister.disabled = false;
  }
};

// --- Setup Screen Logic ---
function showSetupScreen(pendingCredentials) {
  const setupScreen = document.getElementById('setup-screen');
  if (!setupScreen) return;
  setupScreen.classList.remove('hidden');

  let selectedTheme = 'dark';

  const step1 = document.getElementById('setup-step-1');
  const step2 = document.getElementById('setup-step-2');
  const stepDots = setupScreen.querySelectorAll('.setup-step-dot');
  const stepLine = setupScreen.querySelector('.setup-step-line');

  // Reset to step 1
  step1.classList.remove('hidden');
  step2.classList.add('hidden');
  stepDots[0].classList.add('active');
  stepDots[0].classList.remove('done');
  stepDots[1].classList.remove('active');
  stepLine.classList.remove('done');

  // Reset theme selection
  const themeCards = setupScreen.querySelectorAll('.setup-theme-card');
  themeCards.forEach(c => c.classList.remove('selected'));
  setupScreen.querySelector('[data-theme="dark"]').classList.add('selected');

  // Reset checkboxes
  const permEmailsCb = document.getElementById('setup-perm-emails');
  const permTelemetryCb = document.getElementById('setup-perm-telemetry');
  const tosCb = document.getElementById('setup-perm-tos');
  if (permEmailsCb) permEmailsCb.checked = false;
  if (permTelemetryCb) permTelemetryCb.checked = false;
  if (tosCb) tosCb.checked = false;

  // Reset continue button
  const continueBtn = document.getElementById('setup-continue-btn');
  if (continueBtn) {
    continueBtn.disabled = true;
    continueBtn.textContent = 'Get Started';
  }
  const tosWarning = document.getElementById('setup-tos-warning');
  if (tosWarning) tosWarning.classList.add('hidden');

  // --- Step 1: Theme Selection ---
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      themeCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedTheme = card.dataset.theme;
    });
  });

  const nextBtn = document.getElementById('setup-next-btn');
  if (nextBtn) {
    nextBtn.onclick = () => {
      // Save theme
      localStorage.setItem('sydex-theme', selectedTheme);

      // Sync the settings dropdown
      const themeMap = { dark: 'Dark Mode', light: 'Light Mode', system: 'System Default' };
      const themeSelectedEl = document.getElementById('theme-selected');
      const themeOptionsEl = document.getElementById('theme-options');
      if (themeSelectedEl && themeOptionsEl) {
        themeSelectedEl.querySelector('span').textContent = themeMap[selectedTheme] || 'Dark Mode';
        const opts = themeOptionsEl.querySelectorAll('.dropdown-option');
        opts.forEach(o => {
          o.classList.remove('active');
          if (o.dataset.value === selectedTheme) o.classList.add('active');
        });
      }

      // Transition to step 2
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      stepDots[0].classList.remove('active');
      stepDots[0].classList.add('done');
      stepLine.classList.add('done');
      stepDots[1].classList.add('active');
    };
  }

  // --- Step 2: Permissions ---
  const backBtn = document.getElementById('setup-back-btn');
  const tosCheckbox = tosCb;

  if (backBtn) {
    backBtn.onclick = () => {
      step2.classList.add('hidden');
      step1.classList.remove('hidden');
      stepDots[1].classList.remove('active');
      stepLine.classList.remove('done');
      stepDots[0].classList.remove('done');
      stepDots[0].classList.add('active');
    };
  }

  if (tosCheckbox && continueBtn) {
    tosCheckbox.addEventListener('change', () => {
      continueBtn.disabled = !tosCheckbox.checked;
      if (tosCheckbox.checked) {
        tosWarning.classList.add('hidden');
      }
    });

    continueBtn.onclick = async () => {
      if (!tosCheckbox.checked) {
        tosWarning.classList.remove('hidden');
        notify('You must accept the Terms of Service to continue', 'error');
        return;
      }

      // Save permissions to localStorage
      const permEmailsVal = document.getElementById('setup-perm-emails').checked ? 1 : 0;
      const permTelemetryVal = document.getElementById('setup-perm-telemetry').checked ? 1 : 0;

      localStorage.setItem('sydex-theme', selectedTheme);
      localStorage.setItem('sydex-perm-emails', permEmailsVal);
      localStorage.setItem('sydex-perm-telemetry', permTelemetryVal);
      localStorage.setItem('sydex-perm-tos', true);

      // Now create the account with preferences
      continueBtn.disabled = true;
      continueBtn.textContent = 'Creating Account...';
      try {
        await window.api.register(pendingCredentials.username, pendingCredentials.email, pendingCredentials.password, {
          theme: selectedTheme,
          permEmails: permEmailsVal,
          permTelemetry: permTelemetryVal
        });

        // Fade out setup screen and enter main app
        setupScreen.style.opacity = '0';
        setTimeout(async () => {
          setupScreen.classList.add('hidden');
          setupScreen.style.opacity = '1';
          
          await store.load();
          renderBoards();
          renderActiveBoard();
          updateSidebarProfile();
          updateHomeGreeting(true);
          notify('Account created successfully', 'success');
        }, 500);
      } catch (err) {
        notify(err.message, 'error');
        continueBtn.disabled = false;
        continueBtn.textContent = 'Get Started';
      }
    };
  }
}

// Relaunch App Logic
const relaunchBtn = document.getElementById('relaunch-btn');
if (relaunchBtn) {
  relaunchBtn.onclick = () => {
    location.reload();
  };
}

// Logout Logic
const logoutBtn = profilePopup.querySelector('.context-menu-danger');
if (logoutBtn) {
  logoutBtn.onclick = () => {
    window.api.setToken(null);
    store.data = { boards: [], folders: [], activeBoardId: null };
    renderBoards();
    renderActiveBoard();

    // Reset auth form
    const inputs = authScreen.querySelectorAll('.auth-input');
    inputs.forEach(i => { i.value = ''; });
    const liveErrors = authScreen.querySelectorAll('.live-error-msg');
    liveErrors.forEach(e => e.classList.add('hidden'));
    const inputGroups = authScreen.querySelectorAll('.input-group');
    inputGroups.forEach(g => g.classList.remove('has-error', 'valid'));

    // Switch to Login tab
    if (tabLogin && tabRegister && formLogin && formRegister) {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.classList.remove('auth-hidden');
      formRegister.classList.add('auth-hidden');
      if (authTabsContainer) authTabsContainer.classList.remove('register-active');
    }

    authScreen.classList.remove('hidden');
    notify('Logged out', 'info');
  };
}

// Init
init();

// --- CONTEXT MENU ---
const contextMenu = document.getElementById('context-menu');
const moveOutItem = contextMenu.querySelector('[data-action="move-out"]');
const deleteItem = contextMenu.querySelector('[data-action="delete"]');
const originalDeleteHTML = deleteItem.innerHTML;
let ctxDeleteConfirmState = false;
let ctxDeleteTimer = null;
let contextBoardId = null;

function showContextMenu(x, y, board) {
  contextBoardId = board.id;

  const renameItem = contextMenu.querySelector('[data-action="rename"]');
  const duplicateItem = contextMenu.querySelector('[data-action="duplicate"]');
  const addCategoryItem = contextMenu.querySelector('[data-action="add-category"]');
  const addCollaboratorItem = contextMenu.querySelector('[data-action="add-collaborator"]');

  if (board.isShared) {
    if (renameItem) renameItem.style.display = 'none';
    if (duplicateItem) duplicateItem.style.display = 'none';
    if (addCategoryItem) addCategoryItem.style.display = 'none';
    if (addCollaboratorItem) addCollaboratorItem.style.display = 'none';
  } else {
    if (renameItem) renameItem.style.display = 'flex';
    if (duplicateItem) duplicateItem.style.display = 'flex';
    if (addCategoryItem) addCategoryItem.style.display = 'flex';
    if (addCollaboratorItem) addCollaboratorItem.style.display = 'flex';
  }

  // Show/hide "Remove from Folder" based on whether board is in a folder
  if (board.folderId) {
    moveOutItem.classList.remove('hidden');
  } else {
    moveOutItem.classList.add('hidden');
  }
  
  // Reset delete button state
  clearTimeout(ctxDeleteTimer);
  ctxDeleteConfirmState = false;
  if (board.isShared) {
    deleteItem.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> Leave Board`;
  } else {
    deleteItem.innerHTML = originalDeleteHTML;
  }
  deleteItem.style.color = '';
  deleteItem.style.background = '';

  contextMenu.classList.remove('hidden');

  // Position: make sure it doesn't overflow the window
  const menuW = contextMenu.offsetWidth;
  const menuH = contextMenu.offsetHeight;
  if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8;
  if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;

  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
}

function hideContextMenu() {
  contextMenu.classList.add('hidden');
  contextBoardId = null;
}

document.addEventListener('click', hideContextMenu);
document.addEventListener('contextmenu', (e) => {
  if (!e.target.closest('.board-item')) hideContextMenu();
});

contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    const action = item.dataset.action;
    if (!contextBoardId) return;

    const board = store.getBoards().find(b => b.id === contextBoardId);
    if (!board) return;

    switch (action) {
      case 'rename':
        store.setActiveBoard(board.id);
        renderBoards();
        renderActiveBoard();
        setTimeout(() => editBoardTitleBtn.onclick(), 50);
        break;
      case 'duplicate':
        store.duplicateBoard(board.id);
        renderBoards();
        renderActiveBoard();
        break;
      case 'add-category':
        store.setActiveBoard(board.id);
        renderBoards();
        renderActiveBoard();
        setTimeout(() => createInlineColumn(), 50);
        break;
      case 'view-stats':
        store.setActiveBoard(board.id);
        renderBoards();
        renderActiveBoard();
        setTimeout(() => {
          if (statsBtn && !statsBtn.classList.contains('active')) {
            statsBtn.click();
          }
        }, 50);
        break;
      case 'add-collaborator':
        if (!board.isShared) {
          window.openInviteModal(board.id);
        }
        break;
      case 'move-out':
        store.moveBoardToFolder(board.id, null);
        renderBoards();
        break;
      case 'delete':
        if (!ctxDeleteConfirmState) {
          ctxDeleteConfirmState = true;
          item.innerHTML = '<span style="font-size:13px; font-weight:600;">Are you sure?</span>';
          item.style.color = '#fff';
          item.style.background = 'var(--danger-color)';
          
          ctxDeleteTimer = setTimeout(() => {
            ctxDeleteConfirmState = false;
            item.innerHTML = originalDeleteHTML;
            item.style.color = '';
            item.style.background = '';
          }, 3000);
          return; // Skip hiding the menu so user can click again
        } else {
          clearTimeout(ctxDeleteTimer);
          const snap = store.createSnapshot();
          
          const boardEl = document.querySelector(`.board-item[data-board-id="${board.id}"]`);
          if (boardEl) {
            boardEl.style.transition = 'all 0.2s ease-in';
            boardEl.style.opacity = '0';
            boardEl.style.transform = 'scale(0.9) translateX(-10px)';
          }
          
          setTimeout(() => {
            if (board.isShared) {
              window.api.leaveBoard(board.id).then(() => {
                // Remove from local store explicitly
                store.data.boards = store.data.boards.filter(b => b.id !== board.id);
                if (store.data.activeBoardId === board.id) store.data.activeBoardId = null;
                renderBoards();
                renderActiveBoard();
                notify('Left shared board', 'success');
              }).catch(err => {
                notify('Failed to leave board', 'error');
                if (boardEl) {
                  boardEl.style.opacity = '1';
                  boardEl.style.transform = '';
                }
              });
            } else {
              store.deleteBoard(board.id);
              renderBoards();
              renderActiveBoard();
              notify('Board deleted', 'warning', 5000, { 
              text: 'Undo', 
              onClick: () => { 
                store.restoreSnapshot(snap); 
                renderBoards();
                
                const restoredEl = document.querySelector(`.board-item[data-board-id="${board.id}"]`);
                if (restoredEl) {
                  restoredEl.style.opacity = '0';
                  restoredEl.style.transform = 'scale(0.9) translateX(-10px)';
                  restoredEl.style.transition = 'none';
                  requestAnimationFrame(() => {
                    restoredEl.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    restoredEl.style.opacity = '1';
                    restoredEl.style.transform = 'scale(1) translateX(0)';
                    setTimeout(() => {
                      restoredEl.style.transition = '';
                      restoredEl.style.transform = '';
                    }, 300);
                  });
                }
                
                renderActiveBoard(true); 
              } 
            });
            } // Close the else block
          }, boardEl ? 200 : 0);
        }
        break;
    }
    hideContextMenu();
  });
});

// Sidebar Vertical Resizer Logic
const verticalResizer = document.getElementById('sidebar-vertical-resizer');
const topBoardList = document.getElementById('board-list');

if (verticalResizer && topBoardList) {
  let isVertResizing = false;
  let startY = 0;
  let startHeight = 0;

  verticalResizer.addEventListener('mousedown', (e) => {
    isVertResizing = true;
    startY = e.clientY;
    startHeight = topBoardList.getBoundingClientRect().height;
    verticalResizer.classList.add('resizing');
    document.body.style.cursor = 'ns-resize';
    e.preventDefault(); // Prevent text selection
  });

  document.addEventListener('mousemove', (e) => {
    if (!isVertResizing) return;
    const dy = e.clientY - startY;
    // Set min height to 50px, max height based on container
    const newHeight = Math.max(50, startHeight + dy); 
    topBoardList.style.flex = `0 0 ${newHeight}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isVertResizing) {
      isVertResizing = false;
      verticalResizer.classList.remove('resizing');
      document.body.style.cursor = '';
      localStorage.setItem('sydex-top-list-height', topBoardList.style.flexBasis);
    }
  });

  // Restore saved height on load
  const savedHeight = localStorage.getItem('sydex-top-list-height');
  if (savedHeight) {
    topBoardList.style.flex = `0 0 ${savedHeight}`;
  }
}

// Collaborators Button Click Handler — opens Manage Collaborators modal
if (collaboratorsBtn) {
  collaboratorsBtn.addEventListener('click', () => {
    const activeBoard = store.getActiveBoard();
    if (activeBoard && !activeBoard.isShared) {
      window.openManageCollaboratorsModal(activeBoard.id);
    }
  });
}

// Manage Collaborators Modal Logic
window.openManageCollaboratorsModal = async (boardId) => {
  const collabOverlay = document.getElementById('collab-overlay');
  const collabList = document.getElementById('collab-list');
  const bannedSection = document.getElementById('banned-section');
  const bannedList = document.getElementById('banned-list');
  if (!collabOverlay || !collabList) return;

  collabList.innerHTML = '<div style="text-align:center; padding:20px;"><div class="spinner" style="width:24px; height:24px; border:3px solid var(--primary-color); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto;"></div></div>';
  if (bannedSection) bannedSection.classList.add('hidden');
  collabOverlay.classList.remove('hidden');

  // --- Helper: create a user row ---
  function createUserRow(user, actions) {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);';

    const avatarEl = document.createElement('div');
    avatarEl.style.cssText = 'width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:center; font-weight:600; font-size:14px; color:var(--text-muted); flex-shrink:0; background-size:cover; background-position:center;';
    if (user.avatar) {
      avatarEl.style.backgroundImage = `url(${user.avatar})`;
    } else {
      avatarEl.textContent = user.username.charAt(0).toUpperCase();
    }

    const infoEl = document.createElement('div');
    infoEl.style.cssText = 'flex:1; min-width:0;';
    infoEl.innerHTML = `
      <div style="font-weight:600; font-size:13px; color:var(--text-main); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${user.username}</div>
      <div style="font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${user.email}</div>
    `;

    const actionsEl = document.createElement('div');
    actionsEl.style.cssText = 'display:flex; gap:4px; flex-shrink:0;';
    actions.forEach(a => actionsEl.appendChild(a));

    item.appendChild(avatarEl);
    item.appendChild(infoEl);
    item.appendChild(actionsEl);
    return item;
  }

  // --- Helper: animate remove ---
  function animateRemove(item, callback) {
    item.style.transition = 'opacity 0.2s ease, max-height 0.2s ease, padding 0.2s ease, margin 0.2s ease, border 0.2s ease';
    item.style.opacity = '0';
    item.style.maxHeight = '0px';
    item.style.padding = '0 12px';
    item.style.marginTop = '-4px';
    item.style.borderColor = 'transparent';
    setTimeout(() => {
      item.remove();
      if (callback) callback();
    }, 220);
  }

  // --- Helper: create icon button ---
  function createIconBtn(svgHTML, color, tooltip) {
    const btn = document.createElement('button');
    btn.className = 'icon-btn tooltip-btn tooltip-top';
    btn.dataset.tooltip = tooltip;
    btn.style.cssText = `flex-shrink:0; color:${color}; opacity:0.5; transition:opacity 0.15s; padding:4px;`;
    btn.innerHTML = svgHTML;
    btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
    btn.addEventListener('mouseleave', () => btn.style.opacity = '0.5');
    return btn;
  }

  const kickSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  const banSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>';
  const unbanSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>';
  const spinnerHTML = (color) => `<div style="width:14px; height:14px; border:2px solid ${color}; border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></div>`;

  // --- Load Banned Users ---
  async function loadBannedUsers() {
    if (!bannedSection || !bannedList) return;
    try {
      const data = await window.api.getBannedUsers(boardId);
      if (!data.bannedUsers || data.bannedUsers.length === 0) {
        bannedSection.classList.add('hidden');
        return;
      }
      bannedSection.classList.remove('hidden');
      bannedList.innerHTML = '';

      data.bannedUsers.forEach(user => {
        const unbanBtn = createIconBtn(unbanSvg, 'var(--primary-color)', 'Unban');
        unbanBtn.addEventListener('click', async () => {
          unbanBtn.disabled = true;
          unbanBtn.innerHTML = spinnerHTML('var(--primary-color)');
          try {
            await window.api.unbanUser(boardId, user.userId);
            const item = unbanBtn.closest('div');
            animateRemove(item.parentElement, () => {
              if (bannedList.children.length === 0) {
                bannedSection.classList.add('hidden');
              }
            });
            notify(`${user.username} unbanned`, 'success');
          } catch (err) {
            notify(err.message || 'Failed to unban', 'error');
            unbanBtn.disabled = false;
            unbanBtn.innerHTML = unbanSvg;
          }
        });

        const row = createUserRow(user, [unbanBtn]);
        row.style.maxHeight = '80px';
        bannedList.appendChild(row);
      });
    } catch (err) {
      console.error('Failed to load banned users:', err);
    }
  }

  // --- Load Collaborators ---
  try {
    const data = await window.api.getCollaborators(boardId);
    collabList.innerHTML = '';

    if (!data.collaborators || data.collaborators.length === 0) {
      collabList.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:13px; padding:15px 0;">No collaborators yet.</p>';
    } else {
      data.collaborators.forEach(collab => {
        // Kick button
        const kickBtn = createIconBtn(kickSvg, 'var(--danger-color)', 'Remove');
        kickBtn.addEventListener('click', async () => {
          kickBtn.disabled = true;
          kickBtn.innerHTML = spinnerHTML('var(--danger-color)');
          try {
            await window.api.kickCollaborator(boardId, collab.userId);
            const row = kickBtn.closest('div').parentElement;
            animateRemove(row, () => {
              if (collabList.querySelectorAll('div').length === 0) {
                collabList.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:13px; padding:15px 0;">No collaborators yet.</p>';
                store.load().then(() => { renderBoards(); renderActiveBoard(); });
              }
            });
            notify(`${collab.username} removed from board`, 'success');
          } catch (err) {
            notify(err.message || 'Failed to remove collaborator', 'error');
            kickBtn.disabled = false;
            kickBtn.innerHTML = kickSvg;
          }
        });

        // Ban button
        const banBtn = createIconBtn(banSvg, 'var(--warning-color)', 'Ban');
        banBtn.addEventListener('click', async () => {
          banBtn.disabled = true;
          banBtn.innerHTML = spinnerHTML('var(--warning-color)');
          try {
            await window.api.banCollaborator(boardId, collab.userId);
            const row = banBtn.closest('div').parentElement;
            animateRemove(row, () => {
              if (collabList.querySelectorAll('div').length === 0) {
                collabList.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:13px; padding:15px 0;">No collaborators yet.</p>';
                store.load().then(() => { renderBoards(); renderActiveBoard(); });
              }
              // Reload banned section
              loadBannedUsers();
            });
            notify(`${collab.username} banned from board`, 'success');
          } catch (err) {
            notify(err.message || 'Failed to ban collaborator', 'error');
            banBtn.disabled = false;
            banBtn.innerHTML = banSvg;
          }
        });

        const row = createUserRow(collab, [kickBtn, banBtn]);
        row.style.maxHeight = '80px';
        collabList.appendChild(row);
      });
    }

    // Load banned users section
    await loadBannedUsers();
  } catch (err) {
    collabList.innerHTML = '<p style="text-align:center; color:var(--danger-color); font-size:13px; padding:15px 0;">Failed to load collaborators.</p>';
    console.error(err);
  }
};

// Collab modal close
const collabOverlay = document.getElementById('collab-overlay');
const collabCloseBtn = document.getElementById('collab-close-btn');
if (collabCloseBtn && collabOverlay) {
  collabCloseBtn.addEventListener('click', () => collabOverlay.classList.add('hidden'));
  collabOverlay.addEventListener('click', (e) => {
    if (e.target === collabOverlay) collabOverlay.classList.add('hidden');
  });
}

// Collaboration Modals Logic
const inviteOverlay = document.getElementById('invite-overlay');
const inviteCloseBtn = document.getElementById('invite-close-btn');
const inviteCopyBtn = document.getElementById('invite-copy-btn');
const inviteNewBtn = document.getElementById('invite-new-btn');
const inviteTimerDisplay = document.getElementById('invite-timer');
const joinBoardBtn = document.getElementById('join-board-btn');

let inviteTimerInterval;
let currentInviteBoardId = null;

if (inviteCloseBtn && inviteOverlay) {
  inviteCloseBtn.addEventListener('click', () => {
    inviteOverlay.classList.add('hidden');
    clearInterval(inviteTimerInterval);
  });
}

window.openInviteModal = (boardId, forceNew = false) => {
  currentInviteBoardId = boardId;
  clearInterval(inviteTimerInterval);
  
  const inviteCodeDisplay = document.getElementById('invite-code-display');
  if (inviteCodeDisplay) inviteCodeDisplay.innerHTML = '<div class="spinner" style="width:24px; height:24px; border:3px solid var(--primary-color); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></div>';
  if (inviteTimerDisplay) inviteTimerDisplay.textContent = '--:--';
  if (inviteNewBtn) inviteNewBtn.disabled = true;
  
  if (inviteOverlay) inviteOverlay.classList.remove('hidden');

  window.api.generateInvite(boardId, forceNew).then(res => {
    if (inviteCodeDisplay) inviteCodeDisplay.textContent = res.code;
    if (inviteNewBtn) inviteNewBtn.disabled = false;
    
    if (res.expiresAt) {
      const expires = new Date(res.expiresAt).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const distance = expires - now;
        
        if (distance < 0) {
          clearInterval(inviteTimerInterval);
          if (inviteTimerDisplay) inviteTimerDisplay.textContent = 'Expired';
          if (inviteCodeDisplay) inviteCodeDisplay.style.opacity = '0.5';
          return;
        }
        
        if (inviteCodeDisplay) inviteCodeDisplay.style.opacity = '1';
        
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        if (inviteTimerDisplay) {
          inviteTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
      };
      
      updateTimer();
      inviteTimerInterval = setInterval(updateTimer, 1000);
    }
  }).catch(err => {
    notify(err.message || 'Failed to generate invite', 'error');
    if (inviteOverlay) inviteOverlay.classList.add('hidden');
  });
};

if (inviteNewBtn) {
  inviteNewBtn.addEventListener('click', () => {
    if (currentInviteBoardId) {
      window.openInviteModal(currentInviteBoardId, true);
    }
  });
}

if (inviteCopyBtn) {
  inviteCopyBtn.addEventListener('click', () => {
    const codeDisplay = document.getElementById('invite-code-display');
    if (codeDisplay && codeDisplay.textContent !== '------') {
      const textToCopy = codeDisplay.textContent;
      const originalHTML = inviteCopyBtn.innerHTML;
      
      const setSuccessState = () => {
        inviteCopyBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        notify('Code copied to clipboard!', 'success');
        setTimeout(() => {
          inviteCopyBtn.innerHTML = originalHTML;
        }, 2000);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(setSuccessState).catch(err => {
          fallbackCopyTextToClipboard(textToCopy, setSuccessState);
        });
      } else {
        fallbackCopyTextToClipboard(textToCopy, setSuccessState);
      }
    }
  });
}

function fallbackCopyTextToClipboard(text, successCallback) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      successCallback();
    } else {
      notify('Failed to copy code', 'error');
    }
  } catch (err) {
    notify('Failed to copy code', 'error');
  }

  document.body.removeChild(textArea);
}

if (joinBoardBtn) {
  joinBoardBtn.addEventListener('click', () => {
    createInlineJoinBoard();
  });
}

// --- ABOUT MODAL ---
const aboutBtn = document.getElementById('about-btn');
const aboutOverlay = document.getElementById('about-overlay');
const aboutCloseBtn = document.getElementById('about-close-btn');

if (aboutBtn && aboutOverlay && aboutCloseBtn) {
  const fetchAboutInfo = async () => {
    try {
      const response = await fetch('src/assets/about.txt');
      if (!response.ok) throw new Error('Failed to load about.txt');
      const text = await response.text();
      
      const lines = text.split('\n');
      const data = {};
      lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          data[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
      });
      
      document.getElementById('about-app-name').textContent = data.app_version_name || 'Unknown App';
      document.getElementById('about-app-version').textContent = `Version ${data.app_version || 'Unknown'}`;
      document.getElementById('about-app-desc').textContent = data.app_description || '';
    } catch (err) {
      console.error('Error fetching about info:', err);
      document.getElementById('about-app-name').textContent = 'CanbanApp';
      document.getElementById('about-app-version').textContent = 'Version 1.0.0';
      document.getElementById('about-app-desc').textContent = 'Task Management Tool';
    }
  };

  aboutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profilePopup.classList.add('hidden');
    aboutOverlay.classList.remove('hidden');
    fetchAboutInfo();
  });

  aboutCloseBtn.addEventListener('click', () => {
    aboutOverlay.classList.add('hidden');
  });

  aboutOverlay.addEventListener('click', (e) => {
    if (e.target === aboutOverlay) {
      aboutOverlay.classList.add('hidden');
    }
  });
}

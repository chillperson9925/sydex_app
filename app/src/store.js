class Store {
  constructor() {
    this.data = { boards: [], folders: [], activeBoardId: null };
  }

  async load() {
    if (window.api && window.api.token) {
      try {
        const cloudData = await window.api.getBoardData();
        // If user is brand new or has no data, it returns default {}
        if (Object.keys(cloudData).length > 0 && cloudData.boards) {
          this.data = cloudData;
        } else {
          this.data = { boards: [], folders: [], activeBoardId: null };
        }
      } catch (err) {
        console.error("Failed to load cloud data", err);
        if (typeof notify === 'function') {
          notify('Failed to load your boards. Please check your connection.', 'error', 5000);
        }
        this.data = { boards: [], folders: [], activeBoardId: null };
      }
    } else {
      this.data = { boards: [], folders: [], activeBoardId: null };
    }

    if (!this.data.folders) this.data.folders = [];
    const folderIds = new Set(this.data.folders.map(f => f.id));
    this.data.boards.forEach(b => {
      if (!b.folderId || !folderIds.has(b.folderId)) b.folderId = null;
    });
  }

  async save() {
    if (window.api && window.api.token) {
      try {
        await window.api.saveBoardData(this.data);
      } catch (err) {
        console.error("Failed to save cloud data", err);
        if (typeof notify === 'function') {
          notify('Failed to save changes. Your data may not be synced.', 'error', 5000);
        }
      }
    }
  }

  getBoards() { return this.data.boards; }
  
  getActiveBoard() { 
    return this.data.boards.find(b => b.id === this.data.activeBoardId) || null; 
  }

  addBoard(name, folderId = null) {
    const newBoard = { id: 'b' + Date.now().toString(), name, folderId, columns: [] };
    this.data.boards.push(newBoard);
    this.data.activeBoardId = newBoard.id;
    this.save();
    return newBoard;
  }

  deleteBoard(id) {
    this.data.boards = this.data.boards.filter(b => b.id !== id);
    if (this.data.activeBoardId === id) {
      this.data.activeBoardId = this.data.boards.length > 0 ? this.data.boards[0].id : null;
    }
    this.save();
  }

  addFolder(name) {
    const newFolder = { id: 'f' + Date.now().toString(), name, expanded: true };
    this.data.folders.push(newFolder);
    this.save();
    return newFolder;
  }

  deleteFolder(id, deleteBoards = false) {
    this.data.folders = this.data.folders.filter(f => f.id !== id);
    if (deleteBoards) {
      this.data.boards = this.data.boards.filter(b => b.folderId !== id);
      if (this.data.activeBoardId && !this.data.boards.find(b => b.id === this.data.activeBoardId)) {
        this.data.activeBoardId = this.data.boards.length > 0 ? this.data.boards[0].id : null;
      }
    } else {
      this.data.boards.forEach(b => {
        if (b.folderId === id) b.folderId = null;
      });
    }
    this.save();
  }

  toggleFolder(id) {
    const folder = this.data.folders.find(f => f.id === id);
    if (folder) {
      folder.expanded = !folder.expanded;
      this.save();
    }
  }

  moveBoardToFolder(boardId, folderId) {
    const board = this.data.boards.find(b => b.id === boardId);
    if (board) {
      board.folderId = folderId || null;
      this.save();
    }
  }

  setActiveBoard(id) {
    this.data.activeBoardId = id;
    this.save();
  }

  updateBoardName(id, newName) {
    const board = this.data.boards.find(b => b.id === id);
    if (board) {
      board.name = newName;
      this.save();
    }
  }

  setBoardBackground(id, background) {
    const board = this.data.boards.find(b => b.id === id);
    if (board) {
      board.background = background;
      this.save();
    }
  }

  reorderBoard(draggedId, targetId) {
    const boards = this.data.boards;
    const draggedIdx = boards.findIndex(b => b.id === draggedId);
    const targetIdx = boards.findIndex(b => b.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return;
    const [dragged] = boards.splice(draggedIdx, 1);
    const newTargetIdx = boards.findIndex(b => b.id === targetId);
    boards.splice(newTargetIdx, 0, dragged);
    this.save();
  }

  duplicateBoard(id) {
    const board = this.data.boards.find(b => b.id === id);
    if (board) {
      const clone = JSON.parse(JSON.stringify(board));
      clone.id = 'b' + Date.now().toString();
      clone.name = board.name + ' (Copy)';
      clone.columns.forEach(col => {
        col.id = 'c' + Date.now().toString() + Math.random().toString(36).substr(2, 4);
        col.tasks.forEach(t => t.id = 't' + Date.now().toString() + Math.random().toString(36).substr(2, 4));
      });
      this.data.boards.push(clone);
      this.data.activeBoardId = clone.id;
      this.save();
      return clone;
    }
  }

  addColumn(name) {
    const board = this.getActiveBoard();
    if (board) {
      const newCol = { id: 'c' + Date.now().toString(), name, tasks: [] };
      board.columns.push(newCol);
      this.save();
      return newCol;
    }
  }

  deleteColumn(colId) {
    const board = this.getActiveBoard();
    if (board) {
      board.columns = board.columns.filter(c => c.id !== colId);
      this.save();
    }
  }

  renameColumn(colId, newName) {
    const board = this.getActiveBoard();
    if (board) {
      const col = board.columns.find(c => c.id === colId);
      if (col) {
        col.name = newName;
        this.save();
      }
    }
  }

  reorderColumn(draggedColId, targetColId) {
    const board = this.getActiveBoard();
    if (!board) return;

    const sourceIndex = board.columns.findIndex(c => c.id === draggedColId);
    if (sourceIndex === -1) return;
    
    const [draggedColumn] = board.columns.splice(sourceIndex, 1);
    
    if (!targetColId) {
      // Drop at the end
      board.columns.push(draggedColumn);
    } else {
      const targetIndex = board.columns.findIndex(c => c.id === targetColId);
      board.columns.splice(targetIndex, 0, draggedColumn);
    }
    
    this.save();
  }

  addTask(colId, text) {
    const board = this.getActiveBoard();
    if (board) {
      const col = board.columns.find(c => c.id === colId);
      if (col) {
        const newTask = { id: 't' + Date.now().toString(), text };
        col.tasks.unshift(newTask);
        this.save();
        return newTask;
      }
    }
  }

  editTask(colId, taskId, newText) {
    const board = this.getActiveBoard();
    if (board) {
      const col = board.columns.find(c => c.id === colId);
      if (col) {
        const task = col.tasks.find(t => t.id === taskId);
        if (task) {
          task.text = newText;
          this.save();
          return task;
        }
      }
    }
  }

  deleteTask(colId, taskId) {
    const board = this.getActiveBoard();
    if (board) {
      const col = board.columns.find(c => c.id === colId);
      if (col) {
        col.tasks = col.tasks.filter(t => t.id !== taskId);
        this.save();
      }
    }
  }

  clearColumnTasks(colId) {
    const board = this.getActiveBoard();
    if (board) {
      const col = board.columns.find(c => c.id === colId);
      if (col) {
        col.tasks = [];
        this.save();
      }
    }
  }

  moveTask(sourceColId, targetColId, taskId, targetIndex) {
    const board = this.getActiveBoard();
    if (!board) return;

    const sourceCol = board.columns.find(c => c.id === sourceColId);
    const targetCol = board.columns.find(c => c.id === targetColId);

    if (!sourceCol || !targetCol) return;

    const taskIndex = sourceCol.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const [task] = sourceCol.tasks.splice(taskIndex, 1);
    
    if (targetIndex !== undefined && targetIndex !== -1) {
       targetCol.tasks.splice(targetIndex, 0, task);
    } else {
       targetCol.tasks.push(task);
    }
    
    this.save();
  }

  createSnapshot() {
    return JSON.stringify(this.data);
  }

  restoreSnapshot(snapshotString) {
    try {
      this.data = JSON.parse(snapshotString);
      this.save();
    } catch (e) {
      console.error("Failed to restore snapshot", e);
    }
  }
}

const store = new Store();

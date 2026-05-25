const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // Sidebar Headers
  { match: '<h2>Home</h2>', replace: '<h2 data-i18n="nav.home">Home</h2>' },
  { match: 'Home\r\n      </button>', replace: '<span data-i18n="nav.home">Home</span>\r\n      </button>' },
  { match: 'Home\n      </button>', replace: '<span data-i18n="nav.home">Home</span>\n      </button>' },
  { match: '<h2 style="color: var(--primary-color); font-size: 16px;">My Boards</h2>', replace: '<h2 style="color: var(--primary-color); font-size: 16px;" data-i18n="nav.myBoards">My Boards</h2>' },
  { match: '>Shared\r\n            with me</h2>', replace: ' data-i18n="nav.shared">Shared\r\n            with me</h2>' },
  { match: '>Shared\n            with me</h2>', replace: ' data-i18n="nav.shared">Shared\n            with me</h2>' },

  // Profile Menu
  { match: 'Relaunch App', replace: '<span data-i18n="menu.relaunch">Relaunch App</span>' },
  { match: 'About\r\n              </button>', replace: '<span data-i18n="menu.about">About</span>\r\n              </button>' },
  { match: 'About\n              </button>', replace: '<span data-i18n="menu.about">About</span>\n              </button>' },
  { match: 'Check for Updates\r\n              </button>', replace: '<span data-i18n="menu.update">Check for Updates</span>\r\n              </button>' },
  { match: 'Check for Updates\n              </button>', replace: '<span data-i18n="menu.update">Check for Updates</span>\n              </button>' },
  { match: 'Log Out\r\n              </button>', replace: '<span data-i18n="menu.logout">Log Out</span>\r\n              </button>' },
  { match: 'Log Out\n              </button>', replace: '<span data-i18n="menu.logout">Log Out</span>\n              </button>' },
  { match: '<span><span data-i18n="menu.relaunch">Relaunch App</span></span>', replace: '<span data-i18n="menu.relaunch">Relaunch App</span>' },

  // Context Menus
  { match: 'Rename\r\n    </button>', replace: '<span data-i18n="context.rename">Rename</span>\r\n    </button>' },
  { match: 'Rename\n    </button>', replace: '<span data-i18n="context.rename">Rename</span>\n    </button>' },
  { match: 'Duplicate\r\n    </button>', replace: '<span data-i18n="context.duplicate">Duplicate</span>\r\n    </button>' },
  { match: 'Duplicate\n    </button>', replace: '<span data-i18n="context.duplicate">Duplicate</span>\n    </button>' },
  { match: 'Remove from Folder\r\n    </button>', replace: '<span data-i18n="context.removeFromFolder">Remove from Folder</span>\r\n    </button>' },
  { match: 'Remove from Folder\n    </button>', replace: '<span data-i18n="context.removeFromFolder">Remove from Folder</span>\n    </button>' },
  { match: 'Add Category\r\n    </button>', replace: '<span data-i18n="context.addCategory">Add Category</span>\r\n    </button>' },
  { match: 'Add Category\n    </button>', replace: '<span data-i18n="context.addCategory">Add Category</span>\n    </button>' },
  { match: 'View Statistics\r\n    </button>', replace: '<span data-i18n="context.viewStats">View Statistics</span>\r\n    </button>' },
  { match: 'View Statistics\n    </button>', replace: '<span data-i18n="context.viewStats">View Statistics</span>\n    </button>' },
  { match: 'Add Collaborators\r\n    </button>', replace: '<span data-i18n="context.addCollaborators">Add Collaborators</span>\r\n    </button>' },
  { match: 'Add Collaborators\n    </button>', replace: '<span data-i18n="context.addCollaborators">Add Collaborators</span>\n    </button>' },
  { match: 'Delete\r\n    </button>', replace: '<span data-i18n="context.delete">Delete</span>\r\n    </button>' },
  { match: 'Delete\n    </button>', replace: '<span data-i18n="context.delete">Delete</span>\n    </button>' },

  // Extras Menu
  { match: 'Change Background\r\n              </button>', replace: '<span data-i18n="extras.changeBackground">Change Background</span>\r\n              </button>' },
  { match: 'Change Background\n              </button>', replace: '<span data-i18n="extras.changeBackground">Change Background</span>\n              </button>' },
  { match: 'Add Collaborators\r\n              </button>', replace: '<span data-i18n="extras.addCollaborators">Add Collaborators</span>\r\n              </button>' },
  { match: 'Add Collaborators\n              </button>', replace: '<span data-i18n="extras.addCollaborators">Add Collaborators</span>\n              </button>' },
  { match: 'Banned Users\r\n              </button>', replace: '<span data-i18n="extras.bannedUsers">Banned Users</span>\r\n              </button>' },
  { match: 'Banned Users\n              </button>', replace: '<span data-i18n="extras.bannedUsers">Banned Users</span>\n              </button>' }
];

for (const r of replacements) {
  content = content.replace(r.match, r.replace);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished updating index.html');

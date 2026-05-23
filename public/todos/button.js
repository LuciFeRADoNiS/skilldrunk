/**
 * tÖdÜs Button — Self-contained script
 * Add to any page: <script src="/todos/button.js"></script>
 * Or: <script src="https://skilldrunk.com/todos/button.js"></script>
 */
(function() {
  'use strict';

  // Config
  var TARGET_URL = '/todos/';
  var POSITION = 'bottom-right'; // bottom-right, bottom-left, top-right, top-left

  // Create styles
  var style = document.createElement('style');
  style.textContent = [
    '@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&display=swap");',
    '#todos-btn-container {',
    '  position: fixed;',
    '  z-index: 99999;',
    '  ' + (POSITION.includes('bottom') ? 'bottom: 24px;' : 'top: 24px;'),
    '  ' + (POSITION.includes('right') ? 'right: 24px;' : 'left: 24px;'),
    '  font-family: "Playfair Display", Georgia, serif;',
    '}',
    '#todos-btn {',
    '  display: flex; align-items: center; gap: 8px;',
    '  padding: 12px 22px;',
    '  background: linear-gradient(135deg, #f0a030, #ffd700, #f0a030);',
    '  background-size: 200% 200%;',
    '  border: 2px solid rgba(255,215,0,0.6);',
    '  border-radius: 50px;',
    '  color: #07090f;',
    '  font-family: "Playfair Display", Georgia, serif;',
    '  font-weight: 900;',
    '  font-size: 16px;',
    '  letter-spacing: 2px;',
    '  cursor: pointer;',
    '  text-decoration: none;',
    '  box-shadow: 0 4px 24px rgba(240,160,48,0.4), 0 0 40px rgba(240,160,48,0.15), inset 0 1px 0 rgba(255,255,255,0.3);',
    '  animation: todos-pulse 2.5s ease-in-out infinite, todos-gradient 4s ease-in-out infinite;',
    '  transition: all 0.3s ease;',
    '  position: relative;',
    '  overflow: hidden;',
    '}',
    '#todos-btn::before {',
    '  content: "";',
    '  position: absolute;',
    '  top: -50%; left: -50%;',
    '  width: 200%; height: 200%;',
    '  background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);',
    '  animation: todos-shine 3s ease-in-out infinite;',
    '}',
    '#todos-btn:hover {',
    '  transform: scale(1.08);',
    '  box-shadow: 0 6px 32px rgba(240,160,48,0.5), 0 0 60px rgba(240,160,48,0.25);',
    '}',
    '#todos-btn .crown { font-size: 18px; filter: drop-shadow(0 0 4px rgba(255,215,0,0.5)); }',
    '@keyframes todos-pulse {',
    '  0%, 100% { box-shadow: 0 4px 24px rgba(240,160,48,0.4), 0 0 40px rgba(240,160,48,0.15); }',
    '  50% { box-shadow: 0 4px 30px rgba(240,160,48,0.55), 0 0 60px rgba(240,160,48,0.25); }',
    '}',
    '@keyframes todos-gradient {',
    '  0%, 100% { background-position: 0% 50%; }',
    '  50% { background-position: 100% 50%; }',
    '}',
    '@keyframes todos-shine {',
    '  0%, 100% { transform: translateX(-100%) rotate(25deg); }',
    '  50% { transform: translateX(100%) rotate(25deg); }',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // Create button
  var container = document.createElement('div');
  container.id = 'todos-btn-container';

  var btn = document.createElement('a');
  btn.id = 'todos-btn';
  btn.href = TARGET_URL;
  btn.innerHTML = '<span class="crown">👑</span> tÖdÜs';
  btn.title = 'tÖdÜs — Brain System';

  container.appendChild(btn);

  // Wait for DOM
  if (document.body) {
    document.body.appendChild(container);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.appendChild(container);
    });
  }
})();

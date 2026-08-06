'use strict';

const assert = require('node:assert/strict');
const { parse } = require('node-html-parser');
const commonConfig = require('../../data/commonConfig.json');
const { test } = require('node:test');

const duplicateCommentMarkup = `
  <div class="comments-panel expanded">
    <div class="aui-comment" data-selected="false">
      <textarea name="content"></textarea>
      <div class="commentBtns"><button>Save hidden</button></div>
    </div>
    <div class="aui-comment" data-selected="true">
      <textarea name="content"></textarea>
      <div class="commentBtns"><button>Save selected</button></div>
    </div>
  </div>
`;

test('Save locator selects the selected comment when duplicate editors exist', () => {
  const document = parse(duplicateCommentMarkup);
  const oldSelector = '.comments-panel.expanded textarea[name="content"] ~ .commentBtns > button:first-child';
  const buttons = document.querySelectorAll(commonConfig.saveButton);
  const oldButtons = document.querySelectorAll(oldSelector);

  assert.equal(oldButtons.length, 2);
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].textContent.trim(), 'Save selected');
});

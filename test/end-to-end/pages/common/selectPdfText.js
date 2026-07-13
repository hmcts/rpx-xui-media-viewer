'use strict';

module.exports = async function (I) {
  return I.executeScript(() => {
    const textSpans = Array.from(document.querySelectorAll('.textLayer span'))
      .filter((element) => element.textContent && element.textContent.trim().length > 3);

    const matchingElement = textSpans.find((element) => element.getClientRects().length > 0);
    if (!matchingElement) {
      throw new Error('Unable to find selectable PDF text in the rendered text layer.');
    }

    const range = document.createRange();
    range.selectNodeContents(matchingElement);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    const rect = matchingElement.getBoundingClientRect();
    matchingElement.dispatchEvent(new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + (rect.width / 2),
      clientY: rect.top + (rect.height / 2)
    }));

    return matchingElement.textContent.trim();
  });
};

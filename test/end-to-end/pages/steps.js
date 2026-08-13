'use strict';

const requireDirectory = require('require-directory');
const steps = requireDirectory(module);

module.exports = () => {
  return actor({
    authenticateWithIdam: steps.idam.signIn,
    chooseNextStep: steps.nextStep.nextStep,
    uploadPdfDoc: steps.dmStore.uploadPdfDocument,
    uploadImage: steps.dmStore.uploadImageJpeg,
    uploadWordDoc: steps.dmStore.uploadWordDocument,
    openCaseDocumentsInMV: steps.openCaseDocsInMv.openCaseDocsInMV,
    downloadPdfDocument: steps.printAndDownload.mvDownload,
    mvPrintDocument: steps.printAndDownload.mvPrint,
    clearBookMarks: steps.bookMarks.clearBookmarkss,
    openBookmarksPanel: steps.bookMarks.openBookmarksPanel,
    mvAudioScenario: steps.multiMedia.multiMediaAudio,
    clickCommentsPanel: steps.annotationsAndComments.clickCommentsPanel,
    clickRedactMenu: steps.redact.clickRedactMenu,
    redactTextUsingDrawBox: steps.redact.redactTextUsingDrawBox,
    clearAllRedactions: steps.redact.clearAllRedactions,
    redactionsPreview: steps.redact.redactionsPreview,
    verifyWhetherTheRedactionAreVisibleOrNot: steps.redact.verifyWhetherTheRedactionAreVisibleOrNot,
    redactText: steps.redact.redactText,
    markContentForRedaction: steps.redact.markContentForRedaction,
    redactFirstPage: steps.redact.redactFirstPage,
    redactMultiplePages: steps.redact.redactMultiplePages,
    redactContentUsingRedactText: steps.redact.redactContentUsingRedactText,
    navigateIndexBundleDocument: steps.indexAndOutline.navigateIndexBundleDocument,
    navigateIndexNestedDocument: steps.indexAndOutline.navigateIndexNestedDocument,
    CreateRedactionsUsingDrawboxAndRedactText: steps.redact.CreateRedactionsUsingDrawboxAndRedactText,
    redactTextAndThenRemoveRedaction: steps.redact.redactTextAndThenRemoveRedaction,
    previewAllRedactions: steps.redact.previewAllRedactions,
    saveAllRedactions: steps.redact.saveAllRedactions,
    highlightOnImage: steps.annotationsAndComments.highlightOnImage,
    nonTextualHighlightAndComment: steps.annotationsAndComments.nonTextualHighlightAndComment,
    updateNonTextualComments: steps.annotationsAndComments.updateNonTextualComments,
    deleteAllExistingNonTextualHighlights: steps.annotationsAndComments.deleteAllExistingNonTextualHighlights,
    redactSearchAndRedactAll: steps.redact.redactSearchAndRedactAll,
    clickSearchFrom: steps.redact.clickSearchFrom,
    redactFillSearchInput: steps.redact.redactFillSearchInput,
    clickRedactSearchButton: steps.redact.clickRedactSearchButton,
    clickRedactAllButton: steps.redact.clickRedactAllButton,
    openImage: steps.imageViewer.openImage,
    loadDocumentAndCheckSuccessLoad: steps.indexAndOutline.loadDocumentAndCheckSuccessLoad,
  });
};

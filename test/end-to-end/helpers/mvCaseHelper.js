const { mvData } = require("../pages/common/constants");
const testConfig = require('./../../config');
const commonConfig = require('../data/commonConfig.json');
const {
  defaultFixturePath,
  uploadDocument
} = require('../../../scripts/local-aat-document-fixtures');

async function loginTest(I) {
  await I.authenticateWithIdam();
}

async function submittedState(I, caseId) {
  await I.authenticateWithIdam();
  await I.amOnPage('/case-details/' + caseId);
}

async function uploadPdf(I, caseId, eventName) {
  await uploadDocumentEvent(I, caseId, eventName);
  await I.uploadPdfDoc();
}

async function uploadJpeg(I, caseId, eventName) {
  await uploadDocumentEvent(I, caseId, eventName);
  await I.uploadImage();
}

async function uploadWorDoc(I, caseId, eventName) {
  await uploadDocumentEvent(I, caseId, eventName);
  await I.uploadWordDoc();
}

async function loadNewDocument(I, caseId, mediaType, newCaseId) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.loadDocumentAndCheckSuccessLoad(newCaseId)
}

async function downloadPdfDocFromMVTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.downloadPdfDocument();
}

async function printDocumentFromMVTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.mvPrintDocument();
}

async function createBookmarkTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.clearBookMarks();
  await I.createBookMark();
}

async function multiMediaAudioTest(I, caseId, mediaType) {
  await openCaseDocumentsInMediaViewer(I, caseId, mediaType);
  await I.mvAudioScenario();
}

async function multiMediaAudioPauseAndRewindTest(I, caseId, mediaType) {
  await openCaseDocumentsInMediaViewer(I, caseId, mediaType);
  await I.clearBookMarks();
}

async function highlightTextTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.highlightPdfText();
}

async function addCommentAndRotateTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.addCommentAndRotate();
}

async function addCommentTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.addComments(commonConfig.firstComment1);
}

async function deleteHighlightsTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.highlightPdfText();
  await I.deleteAllExistingTextHighlights();
}

async function annotateFromSearchTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.deleteAllExistingTextHighlights();
  await I.annotateFromSearch();
}

async function collateCommentsTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.clickCommentsPanel();
  await I.collateComments();
}

async function collateCommentsNotBlankTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.clickCommentsPanel();
  await I.deleteAllExistingComments();
  await I.addMultipleComments();
  await I.collateComments();
  await I.collateCommentsNotBlank();
}

async function addMultipleCommentsTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.addMultipleComments();
}

async function markContentForRedactionUsingDrawBoxTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.markContentForRedaction();
}

async function redactContentUsingRedactTextTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.redactContentUsingRedactText();
}

async function redactSearchAndRedactAllTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.redactSearchAndRedactAll();
}

async function createRedactionsUsingDrawBoxAndRedactText(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.CreateRedactionsUsingDrawboxAndRedactText();
}

async function redactTextAndThenRemovingRedactionTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.redactTextAndThenRemoveRedaction();
}

async function redactFirstPageTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.redactFirstPage();
}

async function redactMultiplePagesTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.redactMultiplePages();
}

async function previewAllRedactionsTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.previewAllRedactions();
}

async function saveAllRedactionsTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.saveAllRedactions();
}

async function navigateBundleDocsUsingPageIndexTest(I, caseId, mediaType, bundlePageName, bundlePageNumber, assertBundlePage) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.navigateIndexBundleDocument(bundlePageName, bundlePageNumber, assertBundlePage);
}

async function navigateNestedDocsUsingIndexTest(I, caseId, mediaType, nestedPageName, nestedPageNumber, pageContent) {
  await executeTestsOnPreview(I, caseId, mediaType)
  await I.navigateIndexNestedDocument(nestedPageName, nestedPageNumber, pageContent);
}

async function nonTextualHighlightAndAddACommentTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.openImage();
  await I.nonTextualHighlightAndComment();
}

async function nonTextualHighlightUsingDrawBoxTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.openImage();
  await I.deleteAllExistingNonTextualHighlights();
  await I.openImage();
  await I.highlightOnImage(900, 900, 900, 900, ['mousedown', 'mousemove', 'mouseup'], 'box-highlight', 0);
}

async function updateNonTextualCommentTest(I, caseId, mediaType, comment, updatedComment) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.openImage();
  await I.updateNonTextualComments();
}

async function deleteNonTextualCommentTest(I, caseId, mediaType) {
  await executeTestsOnPreview(I, caseId, mediaType);
  await I.openImage();
  await I.deleteAllExistingNonTextualHighlights();
}


async function openCaseDocumentsInMediaViewer(I, caseId, mediaType) {
  await I.authenticateWithIdam();
  console.log('mvCaseHelper', await I.grabCurrentUrl());
  await I.amOnPage('/case-details/' + caseId);
  if (mediaType === mvData.PDF_DOCUMENT) {
    await I.openCaseDocumentsInMV(mediaType);
  }
}

async function previewEnv() {
  return process.env.TEST_URL.includes(mvData.PREVIEW_ENV);
}

async function executeTestsOnPreview(I, caseId, mediaType) {
  await I.amOnPage(testConfig.TestUrl, testConfig.PageLoadTime);
  if (process.env.TEST_URL && process.env.TEST_URL.includes('localhost')) {
    const documentType = mediaType === mvData.IMAGE_DOCUMENT ? 'image' : 'pdf';
    const documentId = await resolveLocalDocumentId(documentType);
    const localCaseId = process.env.MV_SMOKE_CASE_ID || `local-aat-${documentId}`;
    const viewerSelector = documentType === 'image' ? 'mv-image-viewer' : commonConfig.mvpdfviewer;
    await I.waitForText('Change document details', testConfig.TestTimeToWaitForText);
    if (documentType === 'image') {
      await I.click(commonConfig.imageTabButton);
    }
    await I.click('Change document details');
    await I.fillField(commonConfig.uploadDocumentUrl, `/documents/${documentId}/binary`);
    await I.fillField('#documentType', documentType);
    await I.fillField('#caseId', localCaseId);
    await I.click('Load document');
    await I.waitForElement(viewerSelector, testConfig.PageLoadTime);
    if (documentType === 'pdf') {
      await I.waitForElement(commonConfig.pageNumber, testConfig.PageLoadTime);
      await I.waitForElement('div.page[data-page-number="1"]', testConfig.PageLoadTime);
    }
    await I.waitForElement(commonConfig.moreOptionsButton, testConfig.PageLoadTime);
    return;
  }
  await I.waitForText(commonConfig.assertEnvTestData, testConfig.TestTimeToWaitForText);
  console.log('mvCaseHelper2', await I.grabCurrentUrl());
}

async function resolveLocalDocumentId(documentType) {
  if (process.env.MV_CREATE_DOCUMENT_PER_SCENARIO === 'true') {
    const documentId = await uploadDocument(defaultFixturePath(documentType));
    process.env.MV_CURRENT_DOCUMENT_ID = documentId;
    return documentId;
  }

  const documentId = documentType === 'image'
    ? process.env.MV_SMOKE_IMAGE_DOCUMENT_ID || '69fb7313-5338-42c4-b94d-0ceb3b6ed18b'
    : process.env.MV_SMOKE_PDF_DOCUMENT_ID || '04666097-eb32-4b2b-9bec-8e9ce8057560';
  process.env.MV_CURRENT_DOCUMENT_ID = documentId;
  return documentId;
}

async function uploadDocumentEvent(I, caseId, eventName) {
  await I.authenticateWithIdam();
  await I.amOnPage('/case-details/' + caseId);
  await I.chooseNextStep(eventName, 3)
}

module.exports = {
  loginTest,
  submittedState,
  uploadPdf,
  uploadJpeg,
  uploadWorDoc,
  downloadPdfDocFromMVTest,
  printDocumentFromMVTest,
  createBookmarkTest,
  multiMediaAudioTest,
  multiMediaAudioPauseAndRewindTest,
  highlightTextTest,
  addCommentAndRotateTest,
  addCommentTest,
  deleteHighlightsTest,
  collateCommentsTest,
  collateCommentsNotBlankTest,
  addMultipleCommentsTest,
  markContentForRedactionUsingDrawBoxTest,
  redactContentUsingRedactTextTest,
  navigateBundleDocsUsingPageIndexTest,
  navigateNestedDocsUsingIndexTest,
  redactTextAndThenRemovingRedactionTest,
  redactFirstPageTest,
  redactMultiplePagesTest,
  createRedactionsUsingDrawBoxAndRedactText,
  previewAllRedactionsTest,
  saveAllRedactionsTest,
  nonTextualHighlightAndAddACommentTest,
  nonTextualHighlightUsingDrawBoxTest,
  updateNonTextualCommentTest,
  deleteNonTextualCommentTest,
  redactSearchAndRedactAllTest,
  annotateFromSearchTest,
  loadNewDocument
}

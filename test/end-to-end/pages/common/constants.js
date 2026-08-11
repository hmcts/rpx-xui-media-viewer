const ccdEvents = {
  UPLOAD_DOCUMENT: 'Upload Document'
};

const states = {
  SUBMITTED: 'Submitted',
  ACCEPTED: 'Accepted'
};

const mvData = {
  "CASE_ID": '1668060663599319',
  "IMAGE_VIEWER_CASE": "1653642705436811",
  "PDF_DOCUMENT": 'example.pdf',
  "IMAGE_DOCUMENT": 'Quote.jpg',
  "AUDIO_MP3": "nicemelody.mp3",
  "BOOKMARK_UPDATE": 'Bookmark update',
  "UPDATED_COMMENT": 'Phani Perla',
  "DELETE_ANNOTATION": "Comment1",
  "ASSERT_COMMENTS_SEARCH_COUNT": 'Showing 1 of 1',
  "REDACT_CONTENT1": 'continues to disrupt the peace of Verona, a city in northern Italy. A brawl between the',
  "BUNDLE_DOCUMENT_NAME_TO_NAVIGATE": 'Index Page',
  "OUTLINE_PAGE_NUMBER_TO_NAVIGATE": '2',
  "ASSERT_BUNDLE_DOC_NAME": 'INDEX',
  "NESTED_DOCUMENT_NAME_TO_NAVIGATE": 'Prepared Discharge Final Order',
  "NESTED_PAGE_NUMBER_TO_NAVIGATE": '8',
  "NESTED_PAGE_CONTENT": 'Children',
  "EXUI_PR_ENV": 'xui',
  "PREVIEW_ENV": 'xui-media-viewer-pr',
  "LOCAL_ENV": 'local',
  "STAGING_ENV": 'xui-media-viewer-staging',
  // Note: If someone removed document (with documentID below) then that will fail 'Load new document with no outlines' test
  "NO_OUTLINE_CASE_ID": '291b1dd0-1627-43d8-beb0-a9cb171dc0b6',
};

module.exports = {
  ccdEvents,
  states,
  mvData
};

import { mediaAssets } from './mediaAssets';

export type AnnotationFixture = {
  id: string;
  [key: string]: unknown;
};

export type AnnotationSetFixture = {
  documentId: string;
  annotations: AnnotationFixture[];
  [key: string]: unknown;
};

export const commentsAnnotationSet: AnnotationSetFixture = {
  id: 'pw-comments-annotation-set',
  documentId: mediaAssets.pdf.url,
  annotations: [
    {
      id: 'pw-comment-annotation',
      annotationSetId: 'pw-comments-annotation-set',
      page: 1,
      type: 'highlight',
      color: 'FFFF00',
      tags: [],
      rectangles: [{ id: 'pw-comment-rectangle', annotationId: 'pw-comment-annotation', x: 40, y: 120, width: 120, height: 24 }],
      comments: [
        {
          id: 'pw-comment',
          annotationId: 'pw-comment-annotation',
          content: 'Existing viewer comment',
          createdBy: 'pw-user',
          createdByDetails: { forename: 'Playwright', surname: 'User' },
          lastModifiedBy: 'pw-user',
          lastModifiedByDetails: { forename: 'Playwright', surname: 'User' },
          createdDate: '2026-01-01T00:00:00.000Z',
          lastModifiedDate: '2026-01-01T00:00:00.000Z',
          page: 1,
          pageHeight: 1122,
          pages: { 1: { styles: { height: 1122 } } },
          selected: false,
          editable: undefined,
          tags: [],
        },
      ],
    },
    {
      id: 'pw-unrelated-comment-annotation',
      annotationSetId: 'pw-comments-annotation-set',
      page: 1,
      type: 'highlight',
      color: 'FFFF00',
      tags: [],
      rectangles: [{ id: 'pw-unrelated-comment-rectangle', annotationId: 'pw-unrelated-comment-annotation', x: 220, y: 120, width: 120, height: 24 }],
      comments: [
        {
          id: 'pw-unrelated-comment',
          annotationId: 'pw-unrelated-comment-annotation',
          content: 'Unrelated viewer comment',
          createdBy: 'pw-user',
          createdByDetails: { forename: 'Playwright', surname: 'User' },
          lastModifiedBy: 'pw-user',
          lastModifiedByDetails: { forename: 'Playwright', surname: 'User' },
          createdDate: '2026-01-01T00:00:00.000Z',
          lastModifiedDate: '2026-01-01T00:00:00.000Z',
          page: 1,
          pageHeight: 1122,
          pages: { 1: { styles: { height: 1122 } } },
          selected: false,
          editable: undefined,
          tags: [],
        },
      ],
    },
  ],
};

export const commentCreationAnnotationSet: AnnotationSetFixture = {
  id: 'pw-comment-creation-annotation-set',
  documentId: mediaAssets.pdf.url,
  annotations: [{
    id: 'pw-empty-comment-annotation',
    annotationSetId: 'pw-comment-creation-annotation-set',
    page: 1,
    type: 'highlight',
    color: 'FFFF00',
    tags: [],
    rectangles: [{ id: 'pw-empty-comment-rectangle', annotationId: 'pw-empty-comment-annotation', x: 360, y: 260, width: 120, height: 24 }],
    comments: [],
  }],
};

export const emptyAnnotationsAnnotationSet: AnnotationSetFixture = {
  id: 'pw-empty-annotations-annotation-set',
  documentId: mediaAssets.pdf.url,
  annotations: [],
};

export const imageAnnotationsAnnotationSet: AnnotationSetFixture = {
  id: 'pw-image-annotations-annotation-set',
  documentId: mediaAssets.image.url,
  annotations: [{
    id: 'pw-image-annotation',
    annotationSetId: 'pw-image-annotations-annotation-set',
    page: 1,
    type: 'highlight',
    color: 'FFFF00',
    tags: [],
    rectangles: [{ id: 'pw-image-rectangle', annotationId: 'pw-image-annotation', x: 2, y: 2, width: 10, height: 10 }],
    comments: [{
      id: 'pw-image-comment',
      annotationId: 'pw-image-annotation',
      content: 'Existing image annotation comment',
      createdBy: 'pw-user',
      createdByDetails: { forename: 'Playwright', surname: 'User' },
      lastModifiedBy: 'pw-user',
      lastModifiedByDetails: { forename: 'Playwright', surname: 'User' },
      createdDate: '2026-01-01T00:00:00.000Z',
      lastModifiedDate: '2026-01-01T00:00:00.000Z',
      page: 1,
      pageHeight: 18,
      pages: { 1: { styles: { height: 18 } } },
      selected: false,
      editable: undefined,
      tags: [],
    }],
  }],
};

export const twoPageCommentsAnnotationSet: AnnotationSetFixture = {
  id: 'pw-two-page-comments-annotation-set',
  documentId: mediaAssets.pdf.url,
  annotations: [
    {
      id: 'pw-page-one-comment-annotation',
      annotationSetId: 'pw-two-page-comments-annotation-set',
      page: 1,
      type: 'highlight',
      color: 'FFFF00',
      tags: [],
      rectangles: [{ id: 'pw-page-one-comment-rectangle', annotationId: 'pw-page-one-comment-annotation', x: 40, y: 120, width: 120, height: 24 }],
      comments: [{
        id: 'pw-page-one-comment',
        annotationId: 'pw-page-one-comment-annotation',
        content: 'Page one navigation comment',
        createdBy: 'pw-user',
        createdByDetails: { forename: 'Playwright', surname: 'User' },
        lastModifiedBy: 'pw-user',
        lastModifiedByDetails: { forename: 'Playwright', surname: 'User' },
        createdDate: '2026-01-01T00:00:00.000Z',
        lastModifiedDate: '2026-01-01T00:00:00.000Z',
        page: 1,
        pageHeight: 1122,
        pages: { 1: { styles: { height: 1122 } } },
        selected: false,
        editable: undefined,
        tags: [],
      }],
    },
    {
      id: 'pw-page-two-comment-annotation',
      annotationSetId: 'pw-two-page-comments-annotation-set',
      page: 2,
      type: 'highlight',
      color: 'FFFF00',
      tags: [],
      rectangles: [{ id: 'pw-page-two-comment-rectangle', annotationId: 'pw-page-two-comment-annotation', x: 40, y: 120, width: 120, height: 24 }],
      comments: [{
        id: 'pw-page-two-comment',
        annotationId: 'pw-page-two-comment-annotation',
        content: 'Page two navigation comment',
        createdBy: 'pw-user',
        createdByDetails: { forename: 'Playwright', surname: 'User' },
        lastModifiedBy: 'pw-user',
        lastModifiedByDetails: { forename: 'Playwright', surname: 'User' },
        createdDate: '2026-01-01T00:00:00.000Z',
        lastModifiedDate: '2026-01-01T00:00:00.000Z',
        page: 2,
        pageHeight: 1122,
        pages: { 2: { styles: { height: 1122 } } },
        selected: false,
        editable: undefined,
        tags: [],
      }],
    },
  ],
};

const cloneAnnotationSet = (annotationSet: AnnotationSetFixture): AnnotationSetFixture =>
  JSON.parse(JSON.stringify(annotationSet)) as AnnotationSetFixture;

export const cloneCommentsAnnotationSet = () => cloneAnnotationSet(commentsAnnotationSet);
export const cloneImageAnnotationsAnnotationSet = () => cloneAnnotationSet(imageAnnotationsAnnotationSet);
export const cloneCommentCreationAnnotationSet = () => cloneAnnotationSet(commentCreationAnnotationSet);
export const cloneEmptyAnnotationsAnnotationSet = () => cloneAnnotationSet(emptyAnnotationsAnnotationSet);
export const cloneTwoPageCommentsAnnotationSet = () => cloneAnnotationSet(twoPageCommentsAnnotationSet);

export const cloneReplacementCommentsAnnotationSet = (): AnnotationSetFixture => {
  const replacementSource = cloneCommentsAnnotationSet().annotations[0];
  const replacementComment = (replacementSource.comments as AnnotationFixture[])[0];
  return {
    id: 'pw-replacement-comments-annotation-set',
    documentId: mediaAssets.replacementPdf.url,
    annotations: [{
      ...replacementSource,
      id: 'pw-replacement-comment-annotation',
      annotationSetId: 'pw-replacement-comments-annotation-set',
      rectangles: [{ id: 'pw-replacement-comment-rectangle', annotationId: 'pw-replacement-comment-annotation', x: 40, y: 120, width: 120, height: 24 }],
      comments: [{
        ...replacementComment,
        id: 'pw-replacement-comment',
        annotationId: 'pw-replacement-comment-annotation',
        content: 'Replacement document comment',
      }],
    }],
  };
};

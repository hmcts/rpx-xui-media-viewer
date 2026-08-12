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

const cloneAnnotationSet = (annotationSet: AnnotationSetFixture): AnnotationSetFixture =>
  JSON.parse(JSON.stringify(annotationSet)) as AnnotationSetFixture;

export const cloneCommentsAnnotationSet = () => cloneAnnotationSet(commentsAnnotationSet);
export const cloneCommentCreationAnnotationSet = () => cloneAnnotationSet(commentCreationAnnotationSet);

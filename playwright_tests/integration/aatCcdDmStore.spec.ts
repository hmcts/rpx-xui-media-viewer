import { expect, test as base } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createAatCcdCase, uploadAatDocument } from '../fixtures/aatLegacyCase';

const test = base.extend<{ caseId: string }>({
  caseId: async ({ request }, use) => {
    await use(await createAatCcdCase(request));
  },
});

test.describe('AAT CCD and DM Store prerequisites', () => {
  test.setTimeout(45_000);

  test('creates the CCD case used by Media Viewer journeys through the live CCD API', { tag: ['@integration', '@feature-ccd-case-creation'] }, async ({ caseId }) => {
    expect(caseId).toMatch(/^\d+$/);
  });

  test('uploads a PDF document through the live DM Store API', { tag: ['@integration', '@feature-aat-document-prerequisites'] }, async ({ request }) => {
    await expect((await uploadAatDocument(request, 'example.pdf')).id).toMatch(/^[0-9a-f-]+$/i);
  });

  test('uploads an image document through the live DM Store API', { tag: ['@integration', '@feature-aat-document-prerequisites'] }, async ({ request }) => {
    await expect((await uploadAatDocument(request, 'quote.jpg')).id).toMatch(/^[0-9a-f-]+$/i);
  });

  test('persists an image annotation lifecycle through the live annotation service after DM Store upload', { tag: ['@integration', '@feature-image-annotations'] }, async ({ request }) => {
    const document = await uploadAatDocument(request, 'quote.jpg');
    const annotationSetId = randomUUID();
    const annotationId = randomUUID();
    const commentId = randomUUID();
    const createResponse = await request.post('/em-anno/annotation-sets', {
      data: { id: annotationSetId, documentId: document.url, annotations: [] },
      timeout: 15_000,
    });
    expect(createResponse.ok()).toBeTruthy();

    const annotation = {
      id: annotationId,
      annotationSetId,
      documentId: document.url,
      page: 1,
      type: 'highlight',
      color: 'FFFF00',
      tags: [],
      rectangles: [{ id: randomUUID(), annotationId, x: 20, y: 20, width: 100, height: 50 }],
      comments: [{ id: commentId, annotationId, content: 'Playwright live image annotation comment', page: 1, pageHeight: 1000, pages: { 1: { styles: { height: 1000 } } } }],
    };
    const createAnnotationResponse = await request.post('/em-anno/annotations', { data: annotation, timeout: 15_000 });
    expect(createAnnotationResponse.ok()).toBeTruthy();
    expect(await createAnnotationResponse.json()).toEqual(expect.objectContaining({ id: annotationId, comments: [expect.objectContaining({ content: annotation.comments[0].content })] }));

    const retrieveResponse = await request.get(`/em-anno/annotation-sets/filter?documentId=${encodeURIComponent(document.url)}`, { timeout: 15_000 });
    expect(retrieveResponse.ok()).toBeTruthy();
    expect(await retrieveResponse.json()).toEqual(expect.objectContaining({ id: annotationSetId, documentId: document.url, annotations: [expect.objectContaining({ id: annotationId })] }));

    const updatedComment = 'Updated Playwright live image annotation comment';
    const updateResponse = await request.post('/em-anno/annotations', {
      data: { ...annotation, comments: [{ ...annotation.comments[0], content: updatedComment }] },
      timeout: 15_000,
    });
    expect(updateResponse.ok()).toBeTruthy();
    expect(await updateResponse.json()).toEqual(expect.objectContaining({ id: annotationId, comments: [expect.objectContaining({ content: updatedComment })] }));

    const deleteResponse = await request.delete(`/em-anno/annotations/${annotationId}`, { timeout: 15_000 });
    expect(deleteResponse.ok()).toBeTruthy();
    const afterDeleteResponse = await request.get(`/em-anno/annotation-sets/filter?documentId=${encodeURIComponent(document.url)}`, { timeout: 15_000 });
    expect(afterDeleteResponse.ok()).toBeTruthy();
    expect(await afterDeleteResponse.json()).toEqual(expect.objectContaining({ id: annotationSetId, annotations: [] }));
  });

  test('uploads a Word document through the live DM Store API', { tag: ['@integration', '@feature-aat-document-prerequisites'] }, async ({ request }) => {
    await expect((await uploadAatDocument(request, 'ThankYou.doc')).id).toMatch(/^[0-9a-f-]+$/i);
  });
});

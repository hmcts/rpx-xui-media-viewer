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

  test('retrieves the live annotation-service contract for an image uploaded through DM Store', { tag: ['@integration', '@feature-image-annotations'] }, async ({ request }) => {
    const document = await uploadAatDocument(request, 'quote.jpg');
    const annotationSetId = randomUUID();
    const createResponse = await request.post('/em-anno/annotation-sets', {
      data: { id: annotationSetId, documentId: document.url, annotations: [] },
      timeout: 15_000,
    });
    expect(createResponse.ok()).toBeTruthy();
    const response = await request.get(`/em-anno/annotation-sets/filter?documentId=${encodeURIComponent(document.url)}`, { timeout: 15_000 });

    expect(response.ok()).toBeTruthy();
    expect(await response.json()).toEqual(expect.objectContaining({ id: annotationSetId, documentId: document.url, annotations: [] }));
  });

  test('uploads a Word document through the live DM Store API', { tag: ['@integration', '@feature-aat-document-prerequisites'] }, async ({ request }) => {
    await expect((await uploadAatDocument(request, 'ThankYou.doc')).id).toMatch(/^[0-9a-f-]+$/i);
  });
});

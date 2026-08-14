import type { Page } from '@playwright/test';
import { mediaAssets } from './mediaAssets';
import { MediaViewerPage } from '../pages/mediaViewerPage';

export type IcpParticipantFixture = {
  id: string;
  username: string;
};

type IcpScreenUpdateFixture = {
  pdfPosition: {
    pageNumber: number;
    scale: number;
    top: number;
    left: number;
    rotation: number;
  };
  document: string;
};

export const installIcpSession = async (page: Page, participant: IcpParticipantFixture): Promise<MediaViewerPage> => {
  await page.addInitScript((client) => {
    type IcpEventName = 'IcpClientJoinedSession' | 'IcpPresenterUpdated' | 'IcpScreenUpdated';
    type EventListener = (event: MessageEvent<string>) => void;

    let socket: { onmessage: EventListener | null } | undefined;
    const deliver = (eventName: IcpEventName, data: unknown) => {
      socket?.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify({ data: { eventName, data } }),
      }));
    };

    class IcpSocket {
      static readonly OPEN = 1;
      readyState = 0;
      onopen: ((event: Event) => void) | null = null;
      onmessage: EventListener | null = null;

      constructor() {
        socket = this;
        queueMicrotask(() => {
          this.readyState = IcpSocket.OPEN;
          this.onopen?.(new Event('open'));
        });
      }

      send(payload: string): void {
        const message = JSON.parse(payload) as { event: string; data: unknown };
        if (message.event === 'IcpClientJoinSession') {
          queueMicrotask(() => deliver('IcpClientJoinedSession', {
            client,
            presenter: { id: '', username: '' },
          }));
        }
        if (message.event === 'IcpNewPresenterStartsPresenting') {
          const presenter = message.data as { presenterId: string; presenterName: string };
          deliver('IcpPresenterUpdated', { id: presenter.presenterId, username: presenter.presenterName });
        }
      }

      close(): void {
        this.readyState = 3;
      }
    }

    (window as unknown as { WebSocket: typeof WebSocket }).WebSocket = IcpSocket as unknown as typeof WebSocket;
    (window as unknown as { __playwrightIcpEvent: typeof deliver }).__playwrightIcpEvent = deliver;
  }, participant);

  await page.route('**/icp/sessions/**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'X-Access-Token': 'playwright-icp-token' },
      json: {
        username: participant.username,
        session: {
          sessionId: 'playwright-icp-session',
          documentId: mediaAssets.pdf.url,
          caseId: 'playwright-icp-case',
          dateOfHearing: '2026-08-14T00:00:00.000Z',
          connectionUrl: 'wss://playwright-icp.invalid/session',
        },
      },
    });
  });

  const mediaViewer = new MediaViewerPage(page);
  await mediaViewer.stubRotationResponses();
  await mediaViewer.goto();
  // The demo toggle renders checked from its BehaviourSubject default without
  // emitting an initial value to the wrapper. Toggle it as a user would so the
  // Media Viewer input is actually enabled for this journey.
  const icpToggle = page.locator('label[for="toggleICP"]');
  await icpToggle.click();
  await icpToggle.click();
  await mediaViewer.loadDocument(mediaAssets.pdf.url, 'playwright-icp-case', mediaAssets.pdf.contentType);
  return mediaViewer;
};

export const publishIcpEvent = async (
  page: Page,
  eventName: 'IcpPresenterUpdated' | 'IcpScreenUpdated',
  payload: IcpParticipantFixture | IcpScreenUpdateFixture,
): Promise<void> => {
  await page.evaluate(({ name, data }) => {
    (window as unknown as { __playwrightIcpEvent: (event: string, payload: unknown) => void })
      .__playwrightIcpEvent(name, data);
  }, { name: eventName, data: payload });
};

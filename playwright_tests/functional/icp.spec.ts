import { expect, test } from '../fixtures/mediaViewerTest';
import { installIcpSession, publishIcpEvent } from '../fixtures/icpSession';

test('synchronises a server screen update to an in-court presentation follower', { tag: ['@e2e-functional', '@feature-icp'] }, async ({ browser }) => {
  const leader = await browser.newPage();
  const follower = await browser.newPage();
  const leaderParticipant = { id: 'playwright-leader', username: 'leader' };

  try {
    const leaderViewer = await installIcpSession(leader, leaderParticipant);
    const followerViewer = await installIcpSession(follower, { id: 'playwright-follower', username: 'follower' });
    await Promise.all([
      leaderViewer.toolbar.clickAction('Present'),
      followerViewer.toolbar.clickAction('Present'),
    ]);
    await expect(leader.locator('#icp-toolbar')).toBeVisible();
    await expect(follower.locator('#icp-toolbar')).toBeVisible();

    await leader.getByRole('button', { name: 'Start presenting' }).click();
    await expect(leader.getByText('You are presenting')).toBeVisible();
    await publishIcpEvent(follower, 'IcpPresenterUpdated', leaderParticipant);
    await expect(follower.getByText('Leader is presenting')).toBeVisible();

    const initialOrientation = await followerViewer.loadState.pdfOrientation(1);
    await publishIcpEvent(follower, 'IcpScreenUpdated', {
      pdfPosition: { pageNumber: 2, scale: 1.1, top: 0, left: 0, rotation: 90 },
      document: 'assets/example.pdf',
    });

    await expect.poll(() => follower.locator('#viewerContainer').evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(followerViewer.zoom.zoomSelect).toHaveValue('1.1');
    await expect.poll(() => followerViewer.loadState.pdfOrientation(1)).not.toBe(initialOrientation);
  } finally {
    await Promise.all([leader.close(), follower.close()]);
  }
});

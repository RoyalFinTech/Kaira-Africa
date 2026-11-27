# Notification badge freshness — 27 November 2026

The authenticated app header now polls the unread notification count every 15 seconds while the browser tab is active and refetches when the tab regains focus. The badge also exposes the unread count through its accessible link name.

The previous bell effect triggered a shake three seconds after mount whenever unread notifications existed, even if no new notification had arrived. It has been removed to avoid presenting a simulated effect as a real-time arrival.

This change improves in-app badge freshness only. It does not provide web-push, SMS/email, a scrolling top banner, an urgent dashboard popup or admin broadcast messaging. Those remain separate roadmap items and are not verified by this change.

Branch: fix/live-notification-badge-refresh-20261127. Automated CI PASS on code head d262941645e5fb8c8064ccfebe06436ef0211114: Work Management Build Checks run 45953594142 and Backend CI run 45953594162 both passed, including Docker image build without push. Browser/device acceptance remains pending.

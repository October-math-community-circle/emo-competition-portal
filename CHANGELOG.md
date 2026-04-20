# EMO Competition Portal — Changelog

This document describes all meaningful changes made to the codebase since the initial commit (`897ec2f`). Changes are grouped by feature area, not by commit, for readability.

---

## 1. Timed Entry & Deliberate-Exit Locking

**What changed:** Students can now only join a competition within a configurable grace window. Deliberately leaving the exam permanently locks a student out of re-entry. Involuntary disconnections (network drops, crashes) are not penalised automatically — the proctor can pardon them.

**How it works:**

- The admin sets a **Join Deadline** live from the proctoring dashboard (in minutes from now). This is stored as `competitions/{id}.joinDeadline` in Firestore.
- When a student clicks "Exit Exam" and confirms, the client calls a new server action (`recordDeliberateExit`) which:
  - Marks their registration as `lockedOut: true` on Firestore.
  - Adds the student to the `blockedStudents` Firestore collection so the proctor sees them immediately.
- On every join attempt (`joinCompetition` server action), the server checks:
  1. Is the student already locked out and without a re-entry grant? → reject.
  2. Is the current time past the join deadline and no re-entry was granted? → reject and write to `blockedStudents`.
  3. If a re-entry grant exists and the deadline has passed, consume the grant atomically then allow entry.
- If `joinDeadline` is not set by the admin, the competition's `endDate` is used as the fallback deadline.
- **The server is the sole authority** — the client cannot bypass this by removing the exit confirmation or manipulating local state.

**New files:**
- `app/server-actions/recordDeliberateExit.ts` — called on explicit student exit; always locks.

**Modified files:**
- `app/server-actions/joinCompetition.ts` — deadline and lock-flag enforcement added.
- `app/student/[id]/clientPage.tsx` — exit button calls `recordDeliberateExit` before navigating away.

---

## 2. Admin: Grant Re-entry for Locked-Out Students

**What changed:** Proctors can give a locked-out student exactly one more chance to re-enter the exam.

**How it works:**

- A new "Grant Re-entry" button (↩ icon) appears per student tile in the proctor dashboard.
- Clicking it calls the `grantReEntry` server action which:
  - Sets `reEntryGranted: true` and `lockedOut: false` on the student's registration.
  - Deletes the student's document from `blockedStudents`, re-enabling their join button in real time.
- On the next join attempt, the server consumes the grant (sets `reEntryGranted: false`) and issues a LiveKit token. If the student exits deliberately again after the deadline, they are locked once more.

**Modified files:**
- `app/server-actions/proctorActions.ts` — `grantReEntry` action added.
- `app/admin/[competitionId]/adminGrid.tsx` — handler and modal integration.
- `app/admin/[competitionId]/ParticipantTile.tsx` — Re-entry button added.

---

## 3. Admin: Set Join Deadline from Proctoring Dashboard

**What changed:** Proctors can close the entry window for a competition directly from the dashboard without touching Firestore manually.

**How it works:**

- A "Set Join Deadline" button opens a modal where the admin enters a number of minutes from now.
- On submit, `setJoinDeadline` server action writes a Firestore `Timestamp` to `competitions/{id}.joinDeadline`.
- Any student who tries to join after this point is blocked and appears in the blocked list.

**Modified files:**
- `app/server-actions/proctorActions.ts` — `setJoinDeadline` action added.
- `app/admin/[competitionId]/adminGrid.tsx` — deadline modal UI added.

---

## 4. Blocked Students List Always Visible

**What changed:** The "Blocked Students" button and modal are now visible at all times on the proctor dashboard, including when the room is empty. Previously the list was conditionally rendered only when participants were present.

**How it works:**

- On mount, the dashboard subscribes to a Firestore `onSnapshot` query on the `blockedStudents` collection filtered by `competitionId`. This loads the blocked list immediately, even before any student joins a LiveKit session.
- The blocked list updates in real time as students are blocked/unblocked without any manual refresh.
- The "Unblock" action in the modal now calls `grantReEntry` instead of `unblockStudent`, ensuring the re-entry flow is triggered correctly for deadline-based locks.

**Modified files:**
- `app/admin/[competitionId]/adminGrid.tsx` — Firestore `onSnapshot` subscription on mount; blocked button always rendered.

---

## 5. Student Blocked Overlay with Auto-Redirect

**What changed:** When a student is blocked mid-exam, they see a blocking overlay with a 5-second countdown, after which they are automatically redirected to the student home page.

**How it works:**

- The student page subscribes to `useIsBlocked` (a real-time Firestore hook) throughout the session.
- When `isBlocked` becomes `true`, a countdown from 5 starts. After 5 seconds, `handleExitExam(involuntary: true)` is called — this skips the confirmation dialog and does **not** call `recordDeliberateExit`, so the block is not re-recorded as a deliberate exit.
- The blocked overlay also has an "Exit Now" button that triggers the same involuntary exit path immediately.

**Modified files:**
- `app/student/[id]/clientPage.tsx` — block countdown state, auto-redirect effect, involuntary exit path.

---

## 6. Real-time Messaging: Announcements & Private Messages

**What changed:** Proctors can now send broadcast announcements to all students or private messages to individual students. Students receive these in a floating messages panel with an audio notification.

**How it works:**

- Messages are stored in Firestore under a `messages` collection scoped by competitionId and optionally by studentUid for private messages.
- The new `MessagesPanel` component on the student page listens to this collection in real time.
- On each new message, the panel plays `public/newMessage.mp3` as an audio cue.
- The proctor dashboard has controls to send announcements (to all) and private messages (per student tile).

**New files:**
- `app/student/[id]/MessagesPanel.tsx` — floating message display component.
- `public/newMessage.mp3` — audio notification sound.

**Modified files:**
- `app/server-actions/proctorActions.ts` — `sendAnnouncement` and `sendPrivateMessage` actions.
- `app/admin/[competitionId]/adminGrid.tsx` — announcement UI.
- `app/admin/[competitionId]/ParticipantTile.tsx` — private message button.
- `app/student/[id]/clientPage.tsx` — `MessagesPanel` integrated.

---

## 7. Block Status Detection via Firestore (`useIsBlocked` hook)

**What changed:** Block status is now sourced from Firestore (`blockedStudents` collection) rather than Realtime Database session flags, giving it persistence across page reloads and connection drops.

**How it works:**

- The `useIsBlocked(competitionId, uid)` hook runs a Firestore `onSnapshot` query on `blockedStudents` filtered by both `competitionId` and `studentUid`.
- This hook is used in both `CompetitionCard` (disables the join button) and `clientPage` (triggers the blocked overlay).
- Blocking, unblocking, and re-entry grants all write to/delete from this collection, keeping all consumers in sync automatically.

**New files:**
- `app/hooks/useIsBlocked.ts`

---

## 8. Error Propagation from Server Actions

**What changed:** Server action error messages (e.g., "The entry window has closed") now reach the student's UI instead of being replaced by a generic fallback message.

**How it works:**

- `serverActionWrapper.ts` was updated to prefer the actual thrown error message over the static `errorMsg` argument.
- `JoinButton.tsx` was updated so that a server-returned error is not overwritten by the catch block's generic fallback.

**Modified files:**
- `lib/server/serverActionWrapper.ts`
- `app/student/JoinButton.tsx`

---

## 9. Production Firebase (Emulator Removed)

**What changed:** All Firebase emulator connections have been removed. The app now connects exclusively to the production Firebase project (`omcc-5f0b2`).

**What was removed:**
- `connectAuthEmulator`, `connectFirestoreEmulator`, `connectDatabaseEmulator` calls from the client Firebase initialisation.
- `USE_EMULATOR` environment variable branches from `signin.ts`, `getUser.ts`, and `proxy.ts`.
- The raw ID token storage path used in emulator dev mode.

**Modified files:**
- `app/firebase/index.ts`
- `app/server-actions/signin.ts`
- `lib/server/getUser.ts`
- `proxy.ts`

---

## 10. Session Cookie Configuration

**What changed:** The session cookie is now set with `sameSite: "none"` (previously `"strict"`). This is required for cross-site contexts (e.g., the app served from a dev tunnel or a different subdomain than the auth domain).

**Modified files:**
- `app/server-actions/signin.ts`

---

## 11. Bug Fixes

| Bug | Fix |
|-----|-----|
| Join button only worked when competition status was literally `"open"` | Fixed status check to allow `"in_progress"` |
| `useEffect` in student page missing `competitionId` in dependency array | Added `competitionId` to deps, preventing stale closures |
| Heartbeat field name typo in session management | Corrected to proper field name |
| Date formatting hydration mismatch between server and client | `toLocaleDateString` now always uses `"en-US"` locale |
| Submissions query not scoped to the current competition | Added `competitionId` filter to submissions query in `page.tsx` |
| `joinDeadline` Timestamp not serialisable across server/client boundary | Converted to ISO string before passing as prop |
| Invalid hook call due to hooks defined after conditional returns | Moved all `useState`/`useEffect` calls to the top of the component |

---

## Data Model Additions

### `competitions/{competitionId}`
| Field | Type | Description |
|-------|------|-------------|
| `joinDeadline` | `Timestamp \| null` | Cut-off time for joining. Falls back to `endDate` if null. Set by admin via dashboard. |

### `registrations/{registrationId}`
| Field | Type | Description |
|-------|------|-------------|
| `lockedOut` | `boolean` | `true` when student has been permanently locked out (deliberate exit after deadline, or manual block). |
| `reEntryGranted` | `boolean` | `true` when admin has granted one additional re-entry. Consumed atomically on the next join. |

### `blockedStudents/{competitionId}_{studentUid}` (new collection)
| Field | Type | Description |
|-------|------|-------------|
| `competitionId` | `string` | The competition this block belongs to. |
| `studentUid` | `string` | The blocked student's UID. |
| `blockedAt` | `Timestamp` | Server timestamp of when the block was recorded. |
| `blockedBy` | `string` | `"system"` (deadline/exit) or admin UID. |

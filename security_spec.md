# Planora AI — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Global Default-Deny**: All paths not explicitly matched are denied (`allow read, write: if false;`).
2. **Verified Identity**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Split Collection Isolation**: User email is stored exclusively in `/users/{userId}/private/{docId}` and is readable/writable strictly by `request.auth.uid == userId`.
4. **Master Gate Relational Sync**: Every subcollection document (`budgetItems`, `tasks`, `vendors`, `ideas`, `messages`) under `/events/{eventId}` must belong to an existing `/events/{eventId}` document whose `ownerId == request.auth.uid`, and `incoming().eventId == eventId` and `incoming().ownerId == request.auth.uid`.
5. **Terminal State Locking**: Once an `/events/{eventId}` document reaches `status == 'completed'`, no further updates are permitted.
6. **Strict Temporal Integrity**: Every `createdAt` must equal `request.time` on `create` and remain immutable on `update`; every `updatedAt` must equal `request.time` on `create` and `update`.
7. **Secure List Queries**: Every `allow list` rule evaluates `resource.data.ownerId == request.auth.uid` (no blanket `isSignedIn()` list queries and zero `get()`/`exists()` inside `list`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Create `/events/evt_1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Create `/events/evt_1` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on Event**: Create `/events/evt_1` where `ownerId != request.auth.uid` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Create `/events/evt_1` with extra undeclared field `isAdminBypass: true` -> `PERMISSION_DENIED`.
5. **ID Poisoning**: Create `/events/invalid$id!` or ID > 128 chars -> `PERMISSION_DENIED`.
6. **Value Poisoning / Oversized String**: Update `/events/evt_1` with `title` of 5000 chars (> 160 max) -> `PERMISSION_DENIED`.
7. **Terminal State Bypass**: Update `/events/evt_1` when `existing().status == 'completed'` -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: Update `/events/evt_1` mutating `ownerId` or `createdAt` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Create `/events/evt_1` where `createdAt != request.time` -> `PERMISSION_DENIED`.
10. **Orphaned Subcollection Write**: Create `/events/nonexistent/tasks/t1` where parent event does not exist -> `PERMISSION_DENIED`.
11. **Cross-Tenant Subcollection Write**: User B creates `/events/userA_event/budgetItems/b1` -> `PERMISSION_DENIED`.
12. **PII Leakage Read**: User B attempts `get` on `/users/userA/private/info` -> `PERMISSION_DENIED`.

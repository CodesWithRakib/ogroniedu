import { OPEN_REPLACEMENT_STATUSES } from '../constants/replacement-policy.constants';
import type { TutorReplacementCaseEntity } from '../entities/tutor-replacement-case.entity';
import type { TutorReplacementCaseEventEntity } from '../entities/tutor-replacement-case-event.entity';
import type {
  ReplacementCaseEventView,
  ReplacementCaseView,
} from '../interfaces/replacement-case-view.interface';

/**
 * Explicit whitelist serializer. Raw entities are never returned: internal
 * notes/outcome notes are only included when `includeInternal` is true.
 */
export function presentReplacementCase(
  entity: TutorReplacementCaseEntity,
  options: { includeInternal: boolean; now?: Date },
): ReplacementCaseView {
  const now = options.now ?? new Date();
  const isOpen = OPEN_REPLACEMENT_STATUSES.includes(entity.status);
  const isOverdue = !!(
    isOpen &&
    entity.deadlineAt &&
    new Date(entity.deadlineAt).getTime() < now.getTime()
  );

  const view: ReplacementCaseView = {
    id: entity.id,
    bookingId: entity.bookingId,
    requestedBy: entity.requestedBy,
    reasonCode: entity.reasonCode,
    explanation: entity.explanation,
    status: entity.status,
    replacementTutorUserId: entity.replacementTutorUserId ?? null,
    assignedTo: entity.assignedTo ?? null,
    userVisibleNote: entity.userVisibleNote ?? null,
    refundEligibility: entity.refundEligibility ?? 'not_determined',
    refundDecidedAt: entity.refundDecidedAt ? new Date(entity.refundDecidedAt).toISOString() : null,
    deadlineAt: entity.deadlineAt ? new Date(entity.deadlineAt).toISOString() : null,
    extendedAt: entity.extendedAt ? new Date(entity.extendedAt).toISOString() : null,
    extensionReason: entity.extensionReason ?? null,
    isOverdue,
    resolvedAt: entity.resolvedAt ? new Date(entity.resolvedAt).toISOString() : null,
    createdAt: new Date(entity.createdAt).toISOString(),
    updatedAt: new Date(entity.updatedAt).toISOString(),
    version: entity.version ?? 1,
  };

  if (entity.booking) {
    view.booking = {
      id: entity.booking.id,
      status: entity.booking.status,
      subjectId: entity.booking.subjectId,
      educationLevelId: entity.booking.educationLevelId,
      tutorUserId: entity.booking.tutorUserId,
      studentUserId: entity.booking.studentUserId,
      requesterUserId: entity.booking.requesterUserId,
      mode: entity.booking.mode,
      createdAt: new Date(entity.booking.createdAt).toISOString(),
    };
  }

  if (entity.replacementTutor) {
    view.replacementTutor = {
      id: entity.replacementTutor.id,
      displayName: entity.replacementTutor.displayName,
    };
  }

  if (options.includeInternal) {
    view.outcomeNotes = entity.outcomeNotes ?? null;
  }

  return view;
}

export function presentReplacementEvent(
  event: TutorReplacementCaseEventEntity,
  options: { includeInternal: boolean },
): ReplacementCaseEventView {
  const view: ReplacementCaseEventView = {
    id: event.id,
    eventType: event.eventType,
    actorRole: event.actorRole,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    userVisibleNote: event.userVisibleNote,
    createdAt: new Date(event.createdAt).toISOString(),
  };
  if (options.includeInternal) {
    view.internalNote = event.internalNote;
  }
  return view;
}

import {
  ActionStatus,
  EntityType,
  NotificationType,
  Prisma,
  type Notification,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type NotificationDbClient = Prisma.TransactionClient | typeof prisma;

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: EntityType;
  relatedEntityId: string;
};

type EventNotificationInput = {
  recipientUserIds: string[];
  title: string;
  message: string;
  relatedEntityId: string;
};

const OPEN_ACTION_STATUSES: ActionStatus[] = ["OPEN", "IN_PROGRESS", "BLOCKED"];

async function insertUniqueNotification(
  db: NotificationDbClient,
  input: CreateNotificationInput,
): Promise<Notification | null> {
  const existing = await db.notification.findFirst({
    where: {
      recipientProfileId: input.userId,
      type: input.type,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      message: input.message,
    },
    select: { id: true },
  });

  if (existing) {
    return null;
  }

  return db.notification.create({
    data: {
      recipientProfileId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
    },
  });
}

export async function createNotification(
  db: NotificationDbClient,
  input: CreateNotificationInput,
): Promise<Notification | null> {
  return insertUniqueNotification(db, input);
}

async function createEventNotifications(
  db: NotificationDbClient,
  type: NotificationType,
  entityType: EntityType,
  input: EventNotificationInput,
) {
  const uniqueRecipients = [...new Set(input.recipientUserIds.filter(Boolean))];

  if (uniqueRecipients.length === 0) {
    return;
  }

  await Promise.all(
    uniqueRecipients.map((userId) =>
      insertUniqueNotification(db, {
        userId,
        type,
        title: input.title,
        message: input.message,
        relatedEntityType: entityType,
        relatedEntityId: input.relatedEntityId,
      }),
    ),
  );
}

export async function createComplianceRecordCreatedNotifications(
  db: NotificationDbClient,
  input: EventNotificationInput,
) {
  await createEventNotifications(db, "COMPLIANCE_RECORD_CREATED", "COMPLIANCE_RECORD", input);
}

export async function createComplianceRecordUpdatedNotifications(
  db: NotificationDbClient,
  input: EventNotificationInput,
) {
  await createEventNotifications(db, "COMPLIANCE_RECORD_UPDATED", "COMPLIANCE_RECORD", input);
}

export async function createCommentAddedNotifications(
  db: NotificationDbClient,
  input: EventNotificationInput,
) {
  await createEventNotifications(db, "COMMENT_ADDED", "COMMENT", input);
}

export async function createActionAssignedNotifications(
  db: NotificationDbClient,
  input: EventNotificationInput,
) {
  await createEventNotifications(db, "ACTION_ASSIGNED", "ACTION", input);
}

export async function createActionOverdueNotifications(
  db: NotificationDbClient,
  input: EventNotificationInput,
) {
  await createEventNotifications(db, "ACTION_OVERDUE", "ACTION", input);
}

export async function createReviewDateDueSoonNotifications(
  db: NotificationDbClient,
  input: EventNotificationInput,
) {
  await createEventNotifications(db, "REVIEW_DATE_DUE_SOON", "COMPLIANCE_RECORD", input);
}

export async function syncUserNotifications(userId: string) {
  const now = new Date();
  const reviewDueBy = new Date(now);
  reviewDueBy.setDate(reviewDueBy.getDate() + 7);

  const [assignedActions, overdueActions, dueSoonRecords] = await Promise.all([
    prisma.action.findMany({
      where: {
        assignedToProfileId: userId,
        status: { in: OPEN_ACTION_STATUSES },
      },
      select: { id: true, title: true },
    }),
    prisma.action.findMany({
      where: {
        assignedToProfileId: userId,
        status: { in: OPEN_ACTION_STATUSES },
        dueDate: { lt: now },
      },
      select: { id: true, title: true, dueDate: true },
    }),
    prisma.complianceRecord.findMany({
      where: {
        createdByProfileId: userId,
        dueDate: {
          gte: now,
          lte: reviewDueBy,
        },
      },
      select: { id: true, title: true, dueDate: true },
    }),
  ]);

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      assignedActions.map((action) =>
        createActionAssignedNotifications(tx, {
          recipientUserIds: [userId],
          relatedEntityId: action.id,
          title: "Action assigned",
          message: `You were assigned action: ${action.title}.`,
        }),
      ),
    );

    await Promise.all(
      overdueActions.map((action) =>
        createActionOverdueNotifications(tx, {
          recipientUserIds: [userId],
          relatedEntityId: action.id,
          title: "Action overdue",
          message: `Action \"${action.title}\" is overdue.`,
        }),
      ),
    );

    await Promise.all(
      dueSoonRecords.map((record) =>
        createReviewDateDueSoonNotifications(tx, {
          recipientUserIds: [userId],
          relatedEntityId: record.id,
          title: "Review date due soon",
          message: `Compliance review for \"${record.title}\" is due soon.`,
        }),
      ),
    );
  });
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      recipientProfileId: userId,
    },
    data: {
      isRead: true,
    },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: {
      recipientProfileId: userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}

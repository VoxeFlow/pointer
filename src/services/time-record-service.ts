import { RecordSource, type User, type WorkSchedule, type WorkScheduleDay } from "@prisma/client";
import { headers } from "next/headers";

import { recordTypeLabels } from "@/lib/constants";
import { reverseGeocode } from "@/lib/geocoding";
import { getNextRecordType } from "@/lib/time";
import { getDayWorkContext } from "@/lib/schedule";
import { uploadPhoto } from "@/lib/storage";
import { timeRecordRepository } from "@/repositories/time-record-repository";
import { auditLogRepository } from "@/repositories/audit-log-repository";
import { TimeRecordError } from "@/services/time-record-errors";
import type { UploadedPhoto } from "@/types/storage";

type CreateTimeRecordInput = {
  user: User & {
    organization: {
      id: string;
      maxRecordsPerDay: number;
      requirePhoto: boolean;
      requireGeolocation: boolean;
      allowExtraordinaryRecords: boolean;
    };
    schedule?: (WorkSchedule & {
      weekdays?: WorkScheduleDay[];
    }) | null;
  };
  photo: File | null;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  clientTimestamp?: string;
  geoCapturedAt?: string;
  source: RecordSource;
};

export const timeRecordService = {
  async create(input: CreateTimeRecordInput) {
    const { user, photo } = input;
    await auditLogRepository.create({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "time_record_attempt",
      targetType: "time_record_attempt",
      metadataJson: {
        source: input.source,
      },
    });

    const todaysRecords = await timeRecordRepository.listTodayByUser(
      user.id,
      user.organizationId,
    );

    const nextRecordType = getNextRecordType(todaysRecords, user.organization.maxRecordsPerDay);

    if (!nextRecordType) {
      await auditLogRepository.create({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "time_record_blocked_limit",
        targetType: "time_record",
        metadataJson: { recordsToday: todaysRecords.length },
      });

      throw new TimeRecordError("MAX_RECORDS_REACHED", "Voce ja concluiu todas as marcacoes previstas para hoje.");
    }

    if (user.organization.requirePhoto && !photo) {
      throw new TimeRecordError("PHOTO_REQUIRED", "A foto e obrigatoria para registrar o ponto.");
    }

    const hasGeolocation = typeof input.latitude === "number" && typeof input.longitude === "number";

    if (user.organization.requireGeolocation && !hasGeolocation) {
      await auditLogRepository.create({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "time_record_location_missing",
        targetType: "time_record_attempt",
      });

      throw new TimeRecordError("GEOLOCATION_REQUIRED", "Ative a localizacao para concluir o registro.");
    }

    const serverTimestamp = new Date();
    const dayContext = getDayWorkContext(user.schedule?.weekdays ?? [], serverTimestamp);

    if (!dayContext.isWorkingDay && !user.organization.allowExtraordinaryRecords) {
      await auditLogRepository.create({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: "time_record_blocked_day_off",
        targetType: "time_record_attempt",
        metadataJson: {
          date: serverTimestamp.toISOString(),
        },
      });

      throw new TimeRecordError(
        "DAY_OFF_BLOCKED",
        "Hoje está configurado como folga na jornada. Se precisar registrar mesmo assim, habilite registros extraordinários.",
      );
    }

    let photoUpload: UploadedPhoto | undefined;

    if (photo) {
      const fileStamp = serverTimestamp.toISOString().replaceAll(":", "-");
      const fileName = `${user.id}_${fileStamp}_${nextRecordType}.jpg`;
      try {
        photoUpload = await uploadPhoto(photo, fileName);
      } catch (error) {
        await auditLogRepository.create({
          organizationId: user.organizationId,
          actorUserId: user.id,
          action: "time_record_photo_upload_failed",
          targetType: "time_record_attempt",
          metadataJson: {
            message: error instanceof Error ? error.message : "upload_failed",
          },
        });
        throw new TimeRecordError("PHOTO_UPLOAD_FAILED", "Nao foi possivel salvar a foto da marcacao.");
      }
    }

    let isInconsistent = !hasGeolocation;
    let inconsistencyReason = !hasGeolocation ? "Marcacao sem geolocalizacao validada." : null;
    const geocodedLocation = hasGeolocation
      ? await reverseGeocode(input.latitude, input.longitude).catch(() => null)
      : null;

    if (!dayContext.isWorkingDay && user.organization.allowExtraordinaryRecords) {
      isInconsistent = true;
      inconsistencyReason = "Marcacao realizada em dia configurado como folga.";
    }

    const requestHeaders = await headers();
    const record = await timeRecordRepository.create({
      organizationId: user.organizationId,
      userId: user.id,
      recordType: nextRecordType,
      serverTimestamp,
      clientTimestamp: input.clientTimestamp ? new Date(input.clientTimestamp) : null,
      photoUrl: photoUpload?.url ?? "",
      latitude: input.latitude,
      longitude: input.longitude,
      locationAddress: geocodedLocation?.addressText,
      geocodingProvider: geocodedLocation?.provider,
      accuracy: input.accuracy,
      geoCapturedAt: input.geoCapturedAt ? new Date(input.geoCapturedAt) : null,
      source: input.source ?? RecordSource.BROWSER,
      deviceInfo: requestHeaders.get("user-agent"),
      photoMetadataJson: photoUpload?.metadata,
      isInconsistent,
      inconsistencyReason,
    });

    await auditLogRepository.create({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "time_record_created",
      targetType: "time_record",
      targetId: record.id,
      metadataJson: {
        type: nextRecordType,
        source: input.source,
      },
    });

    return {
      record,
      label: recordTypeLabels[nextRecordType],
    };
  },
};

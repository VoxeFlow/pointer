import { RecordSource, type User, type WorkSchedule, type WorkScheduleDay } from "@prisma/client";
import { headers } from "next/headers";

import { recordTypeLabels } from "@/lib/constants";
import { calculateDistanceMeters, reverseGeocode } from "@/lib/geocoding";
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
      enforceWorksiteRadius: boolean;
      worksiteAddress: string | null;
      worksiteLatitude: unknown;
      worksiteLongitude: unknown;
      worksiteRadiusMeters: number;
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

    const worksiteLatitude = user.organization.worksiteLatitude == null ? null : Number(user.organization.worksiteLatitude);
    const worksiteLongitude = user.organization.worksiteLongitude == null ? null : Number(user.organization.worksiteLongitude);

    if (user.organization.enforceWorksiteRadius) {
      if (worksiteLatitude == null || worksiteLongitude == null) {
        throw new TimeRecordError(
          "WORKSITE_NOT_CONFIGURED",
          "O local permitido para registro ainda nao foi configurado pela empresa.",
        );
      }

      if (!hasGeolocation) {
        throw new TimeRecordError("GEOLOCATION_REQUIRED", "Ative a localizacao para concluir o registro.");
      }

      const distanceMeters = calculateDistanceMeters(
        input.latitude!,
        input.longitude!,
        worksiteLatitude,
        worksiteLongitude,
      );

      if (distanceMeters > user.organization.worksiteRadiusMeters) {
        await auditLogRepository.create({
          organizationId: user.organizationId,
          actorUserId: user.id,
          action: "time_record_blocked_outside_worksite_radius",
          targetType: "time_record_attempt",
          metadataJson: {
            distanceMeters,
            allowedRadiusMeters: user.organization.worksiteRadiusMeters,
            worksiteAddress: user.organization.worksiteAddress,
          },
        });

        throw new TimeRecordError(
          "OUTSIDE_ALLOWED_AREA",
          `Voce esta fora da area permitida para registrar o ponto. Distancia aproximada: ${distanceMeters} m. Raio permitido: ${user.organization.worksiteRadiusMeters} m.`,
        );
      }
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
        const message = error instanceof Error ? error.message : "Nao foi possivel salvar a foto da marcacao.";
        throw new TimeRecordError("PHOTO_UPLOAD_FAILED", message);
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
        worksiteRadiusValidated: user.organization.enforceWorksiteRadius,
      },
    });

    return {
      record,
      label: recordTypeLabels[nextRecordType],
    };
  },

  async createManualRecord(input: {
    organizationId: string;
    userId: string;
    actorUserId: string;
    recordType: "ENTRY" | "BREAK_OUT" | "BREAK_IN" | "EXIT";
    timestamp: Date;
    reason: string;
  }) {
    const { organizationId, userId, actorUserId, recordType, timestamp, reason } = input;

    const record = await timeRecordRepository.create({
      organizationId,
      userId,
      recordType,
      serverTimestamp: timestamp,
      clientTimestamp: timestamp,
      photoUrl: "",
      source: "MANUAL",
      isInconsistent: false,
      adjustmentNote: reason,
      deviceInfo: `Ajuste manual por administrador (ID: ${actorUserId})`,
    });

    await auditLogRepository.create({
      organizationId,
      actorUserId,
      action: "time_record_manual_adjustment",
      targetType: "time_record",
      targetId: record.id,
      metadataJson: {
        userId,
        recordType,
        timestamp: timestamp.toISOString(),
        reason,
      },
    });

    return record;
  },

  async updateRecordTimestamp(input: {
    organizationId: string;
    recordId: string;
    actorUserId: string;
    newTimestamp: Date;
    reason: string;
  }) {
    const { organizationId, recordId, actorUserId, newTimestamp, reason } = input;

    const existing = await timeRecordRepository.findById(recordId);

    if (!existing || existing.organizationId !== organizationId) {
      throw new Error("Registro não encontrado para este funcionário.");
    }

    if (existing.isDisregarded) {
      throw new Error("Este registro já foi desconsiderado em um ajuste anterior.");
    }

    const updatedNote = existing.adjustmentNote
      ? `${existing.adjustmentNote}\n[${new Date().toISOString()}] ${reason}`
      : reason;

    const replacement = await timeRecordRepository.create({
      organizationId,
      userId: existing.userId,
      recordType: existing.recordType,
      serverTimestamp: newTimestamp,
      clientTimestamp: newTimestamp,
      photoUrl: existing.photoUrl,
      latitude: existing.latitude,
      longitude: existing.longitude,
      locationAddress: existing.locationAddress,
      geocodingProvider: existing.geocodingProvider,
      accuracy: existing.accuracy,
      geoCapturedAt: existing.geoCapturedAt,
      source: RecordSource.MANUAL,
      deviceInfo: existing.deviceInfo
        ? `${existing.deviceInfo} | Ajuste auditado criado por admin ${actorUserId}`
        : `Ajuste auditado criado por admin ${actorUserId}`,
      photoMetadataJson: existing.photoMetadataJson ?? undefined,
      isInconsistent: existing.isInconsistent,
      inconsistencyReason: existing.inconsistencyReason,
      adjustmentNote: `Ajuste auditado do registro ${existing.id}: ${reason}`,
      supersedesRecordId: existing.id,
    });

    await timeRecordRepository.update(recordId, {
      isDisregarded: true,
      disregardedReason: reason,
      disregardedAt: new Date(),
      adjustmentNote: updatedNote,
      deviceInfo: existing.deviceInfo
        ? `${existing.deviceInfo} | Registro original desconsiderado por admin ${actorUserId}`
        : `Registro original desconsiderado por admin ${actorUserId}`,
    });

    await auditLogRepository.create({
      organizationId,
      actorUserId,
      action: "time_record_manual_replacement",
      targetType: "time_record",
      targetId: replacement.id,
      metadataJson: {
        originalRecordId: existing.id,
        replacementRecordId: replacement.id,
        previousTimestamp: existing.serverTimestamp.toISOString(),
        newTimestamp: newTimestamp.toISOString(),
        recordType: existing.recordType,
        previousSource: existing.source,
        reason,
      },
    });

    return replacement;
  },
};

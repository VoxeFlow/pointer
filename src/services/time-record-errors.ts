export type TimeRecordErrorCode =
  | "SESSION_EXPIRED"
  | "UNAUTHORIZED"
  | "MAX_RECORDS_REACHED"
  | "PHOTO_REQUIRED"
  | "GEOLOCATION_REQUIRED"
  | "DAY_OFF_BLOCKED"
  | "PHOTO_UPLOAD_FAILED"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

export class TimeRecordError extends Error {
  code: TimeRecordErrorCode;

  constructor(code: TimeRecordErrorCode, message: string) {
    super(message);
    this.name = "TimeRecordError";
    this.code = code;
  }
}

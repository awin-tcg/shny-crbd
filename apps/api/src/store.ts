import { createHash, randomUUID } from "node:crypto";
import type {
  CreateLot,
  LifecycleRequest,
  Lot,
  PortfolioSnapshot,
  UpdateLot,
} from "@cardboard/contracts";

interface StoredLot extends Lot {
  deletedAt?: string;
}

export interface AuditEvent {
  actorId: string;
  action:
    | "lot.create"
    | "lot.update"
    | "lot.delete"
    | "snapshot.create"
    | "account.export_request"
    | "account.deletion_request"
    | "account.deletion_cancel";
  resourceId: string;
  result: "success" | "denied";
  requestId: string;
  occurredAt: string;
}

interface IdempotencyRecord {
  requestHash: string;
  lot: Lot;
}

export class InMemoryStore {
  private readonly lots = new Map<string, StoredLot>();
  private readonly idempotency = new Map<string, IdempotencyRecord>();
  private readonly snapshots = new Map<string, PortfolioSnapshot>();
  private readonly lifecycleRequests = new Map<string, LifecycleRequest>();
  readonly auditEvents: AuditEvent[] = [];

  getLifecycleRequest(
    userId: string,
    kind: LifecycleRequest["kind"],
  ): LifecycleRequest | null {
    const request = this.lifecycleRequests.get(`${userId}:${kind}`);
    return request ? structuredClone(request) : null;
  }

  /** Records a request once; repeated requests return the original without a new audit event. */
  requestLifecycle(
    userId: string,
    kind: LifecycleRequest["kind"],
    requestId: string,
  ): { request: LifecycleRequest; created: boolean } {
    const key = `${userId}:${kind}`;
    const existing = this.lifecycleRequests.get(key);
    if (existing) return { request: structuredClone(existing), created: false };
    const request: LifecycleRequest = {
      kind,
      status: "requested",
      requestedAt: new Date().toISOString(),
    };
    this.lifecycleRequests.set(key, request);
    this.auditEvents.push({
      actorId: userId,
      action:
        kind === "export"
          ? "account.export_request"
          : "account.deletion_request",
      resourceId: userId,
      result: "success",
      requestId,
      occurredAt: request.requestedAt,
    });
    return { request: structuredClone(request), created: true };
  }

  cancelDeletionRequest(userId: string, requestId: string): boolean {
    const key = `${userId}:deletion`;
    if (!this.lifecycleRequests.has(key)) return false;
    this.lifecycleRequests.delete(key);
    this.auditEvents.push({
      actorId: userId,
      action: "account.deletion_cancel",
      resourceId: userId,
      result: "success",
      requestId,
      occurredAt: new Date().toISOString(),
    });
    return true;
  }

  listLots(userId: string): Lot[] {
    return [...this.lots.values()]
      .filter((lot) => lot.userId === userId && !lot.deletedAt)
      .map(copyLot);
  }

  getLot(userId: string, id: string): Lot | null {
    const lot = this.lots.get(id);
    return lot && lot.userId === userId && !lot.deletedAt ? copyLot(lot) : null;
  }

  createLot(
    userId: string,
    input: CreateLot,
    idempotencyKey: string,
    requestId: string,
  ): { lot: Lot; replayed: boolean } {
    const scope = `${userId}:${idempotencyKey}`;
    const requestHash = hashRequest(input);
    const existing = this.idempotency.get(scope);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new IdempotencyConflictError();
      }
      return { lot: copyLot(existing.lot), replayed: true };
    }

    const now = new Date().toISOString();
    const lot: StoredLot = {
      ...input,
      id: randomUUID(),
      userId,
      createdAt: now,
      updatedAt: now,
    };
    this.lots.set(lot.id, lot);
    this.idempotency.set(scope, { requestHash, lot: copyLot(lot) });
    this.auditEvents.push({
      actorId: userId,
      action: "lot.create",
      resourceId: lot.id,
      result: "success",
      requestId,
      occurredAt: now,
    });
    return { lot: copyLot(lot), replayed: false };
  }

  updateLot(
    userId: string,
    id: string,
    input: UpdateLot,
    requestId: string,
  ): Lot | null {
    const lot = this.lots.get(id);
    if (!lot || lot.userId !== userId || lot.deletedAt) {
      this.recordDenied(userId, "lot.update", id, requestId);
      return null;
    }
    const updated: StoredLot = {
      ...lot,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    this.lots.set(id, updated);
    this.auditEvents.push({
      actorId: userId,
      action: "lot.update",
      resourceId: id,
      result: "success",
      requestId,
      occurredAt: updated.updatedAt,
    });
    return copyLot(updated);
  }

  deleteLot(userId: string, id: string, requestId: string): boolean {
    const lot = this.lots.get(id);
    if (!lot || lot.userId !== userId || lot.deletedAt) {
      this.recordDenied(userId, "lot.delete", id, requestId);
      return false;
    }
    const occurredAt = new Date().toISOString();
    this.lots.set(id, { ...lot, deletedAt: occurredAt, updatedAt: occurredAt });
    this.auditEvents.push({
      actorId: userId,
      action: "lot.delete",
      resourceId: id,
      result: "success",
      requestId,
      occurredAt,
    });
    return true;
  }

  listSnapshots(userId: string): PortfolioSnapshot[] {
    return [...this.snapshots.entries()]
      .filter(([key]) => key.startsWith(`${userId}:`))
      .map(([, snapshot]) => structuredClone(snapshot))
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  saveSnapshot(
    userId: string,
    snapshot: PortfolioSnapshot,
    requestId: string,
  ): void {
    this.snapshots.set(`${userId}:${snapshot.date}`, structuredClone(snapshot));
    this.auditEvents.push({
      actorId: userId,
      action: "snapshot.create",
      resourceId: snapshot.date,
      result: "success",
      requestId,
      occurredAt: new Date().toISOString(),
    });
  }

  seedLot(lot: Lot): void {
    this.lots.set(lot.id, structuredClone(lot));
  }

  private recordDenied(
    userId: string,
    action: AuditEvent["action"],
    resourceId: string,
    requestId: string,
  ): void {
    this.auditEvents.push({
      actorId: userId,
      action,
      resourceId,
      result: "denied",
      requestId,
      occurredAt: new Date().toISOString(),
    });
  }
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency key was already used with a different request");
  }
}

function hashRequest(input: CreateLot): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function copyLot(lot: Lot): Lot {
  return structuredClone(lot);
}

import { z } from "zod";
export const itemStatuses = ["available", "reserved", "given"] as const;
export const requestStatuses = [
  "pending",
  "selected",
  "declined",
  "cancelled",
] as const;
export const statusLabels = {
  available: "受付中",
  reserved: "相談中",
  given: "譲渡済み",
};
export const requestLabels = {
  pending: "応募中",
  selected: "あなたに決定",
  declined: "受付終了",
  cancelled: "取り消し済み",
};
const text = (max: number) => z.string().trim().max(max);
export const boardSchema = z.object({
  title: text(100).min(1, "ボード名を入力してください"),
  description: text(2000).default(""),
  expiresAt: z.string().datetime().nullable().optional(),
});
export const boardPatchSchema = boardSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });
export const itemSchema = z.object({
  name: text(100).min(1, "品物名を入力してください"),
  description: text(3000).default(""),
  quantity: z.number().int().min(1).max(999).default(1),
  pickupNote: text(1000).default(""),
});
export const itemPatchSchema = itemSchema
  .partial()
  .extend({ status: z.enum(itemStatuses).optional() });
export const requestSchema = z.object({
  requesterName: text(80).min(1, "お名前を入力してください"),
  contact: text(200).min(1, "連絡先を入力してください"),
  message: text(1000).default(""),
});
export type ItemStatus = (typeof itemStatuses)[number];
export type RequestStatus = (typeof requestStatuses)[number];
export type Image = { id: string; displayOrder: number };
export type Wish = {
  id: string;
  requesterName: string;
  contact: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
};
export type Item = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  status: ItemStatus;
  pickupNote: string;
  images: Image[];
  requests?: Wish[];
  requestCount?: number;
};
export type Board = {
  id: string;
  title: string;
  description: string;
  expiresAt: string | null;
  isActive: boolean;
  items: Item[];
};
export type Application = {
  id: string;
  requesterName: string;
  contact: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
  item: Pick<Item, "id" | "name" | "status" | "pickupNote">;
  boardTitle: string;
  sharingAvailable: boolean;
};


import { Instance, SnapshotIn, SnapshotOut } from "mobx-state-tree";
import { Note as NoteModel } from "@/stores/models/Note";
import { Nest as NestModel } from "@/stores/models/Nest";

export type Note = Instance<typeof NoteModel>;
export type Nest = Instance<typeof NestModel>;

// Snapshot types for working with plain objects
export type NoteSnapshot = SnapshotOut<typeof NoteModel>;
export type NestSnapshot = SnapshotOut<typeof NestModel>;
export type NoteInput = SnapshotIn<typeof NoteModel>;
export type NestInput = SnapshotIn<typeof NestModel>;

// Extended note type for UI components that need children
export interface NoteWithChildren extends Note {
  children?: NoteWithChildren[];
}

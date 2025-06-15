
import { Instance } from "mobx-state-tree";
import { Note as NoteModel } from "@/stores/models/Note";
import { Nest as NestModel } from "@/stores/models/Nest";

export type Note = Instance<typeof NoteModel>;
export type Nest = Instance<typeof NestModel>;

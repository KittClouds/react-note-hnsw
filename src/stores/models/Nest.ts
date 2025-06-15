
import { types } from "mobx-state-tree";

export const Nest = types
  .model("Nest", {
    id: types.identifier,
    name: types.string,
    description: types.optional(types.string, ""),
    createdAt: types.Date,
    updatedAt: types.Date,
  })
  .actions((self) => ({
    setName(name: string) {
      self.name = name;
      self.updatedAt = new Date();
    },
    setDescription(description: string) {
      self.description = description;
      self.updatedAt = new Date();
    },
  }));

export type INestModel = typeof Nest.Type;

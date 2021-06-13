import { EntitySchema } from "typeorm";

export interface UserSessions {
  id: number;
  userId: string;
  accessToken: string;
}

export const UserSessionsEntity = new EntitySchema<UserSessions>({
  name: "usersessions",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    userId: {
      type: String,
    },
    accessToken: {
      type: String,
    },
  },
});

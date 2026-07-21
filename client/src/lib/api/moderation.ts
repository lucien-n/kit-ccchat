import { client } from "./http";

export enum ModAction {
  Kick = "Kick",
  Ban = "Ban",
  Unban = "Unban",
  Mute = "Mute",
  Unmute = "Unmute",
}

export const moderation = {
  /** Moderation view of members (admin only): includes banned/muted + roleIds. */
  members: async () => (await client.api.moderation.members.$get()).json(),

  act: async (userId: string, action: ModAction, minutes?: number) => {
    const param = { id: userId };
    const route = client.api.moderation[":id"];
    switch (action) {
      case ModAction.Kick:
        return (await route.kick.$post({ param })).json();
      case ModAction.Ban:
        return (await route.ban.$post({ param })).json();
      case ModAction.Unban:
        return (await route.unban.$post({ param })).json();
      case ModAction.Unmute:
        return (await route.unmute.$post({ param })).json();
      case ModAction.Mute:
        return (await route.mute.$post({ param, json: { minutes } })).json();
    }
  },
};

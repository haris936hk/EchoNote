import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

import api from '../services/api';

const client = createClient({
  authEndpoint: async (room) => {
    try {
      const response = await api.post('/liveblocks/auth', { room });
      return response.data;
    } catch (error) {
      console.error('Liveblocks auth failed:', error);
      throw error;
    }
  },
});

export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useOthers,
  useOthersMapped,
  useOthersConnectionIds,
  useOther,
  useBroadcastEvent,
  useEventListener,
  useSelf,
  useStorage,
  useBatch,
  useHistory,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo,
  useMutation,
  useStatus,
  useLostConnectionListener,
  useThreads,
  useUser,
  useCreateThread,
  useEditThreadMetadata,
  useCreateComment,
  useEditComment,
  useDeleteComment,
  useAddReaction,
  useRemoveReaction,
} = createRoomContext(client);
